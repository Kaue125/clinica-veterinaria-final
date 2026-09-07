// ================================================================
// VetCare — Servidor usando Evolution API (Docker V2 Corrigido)
// ================================================================
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'sitevetcare')));

// ── Configurações da Evolution API ────────────────────────────────
const CONFIG = {
  porta: Number(process.env.PORT) || 3001,
  evolutionUrl: process.env.EVOLUTION_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || 'vetcare-secret-key',
  instanceName: process.env.EVOLUTION_INSTANCE || 'vetcare',
  clinicaNum: process.env.CLINICA_NUM || '5511985970246',
  adminPassword: process.env.ADMIN_PASSWORD || 'vetcare2024'
};

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'vetcare-data.json');

function lerDados() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { agendamentos: [], mensagens: [] };
    const dados = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      agendamentos: Array.isArray(dados.agendamentos) ? dados.agendamentos : [],
      mensagens: Array.isArray(dados.mensagens) ? dados.mensagens : []
    };
  } catch (error) {
    console.error('❌ Não foi possível ler os dados:', error.message);
    throw new Error('Não foi possível acessar os dados salvos.');
  }
}

function gravarDados(dados) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Não foi possível salvar os dados:', error.message);
    throw new Error('Não foi possível salvar os dados.');
  }
}

// ── Helper: Formatar número de telefone ──────────────────────────
function formatarNumero(telefone) {
  let num = String(telefone).replace(/\D/g, '');
  if (!num.startsWith('55')) num = '55' + num;
  return num;
}

// ── Helper: Enviar mensagem via Evolution API ───────────────────
async function enviarMensagem(telefone, texto) {
  const numeroFormatado = formatarNumero(telefone);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${CONFIG.evolutionUrl}/message/sendText/${CONFIG.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.apiKey
      },
      body: JSON.stringify({
        number: numeroFormatado,
        text: texto
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.response?.message?.[0] || data?.message || `Status HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('A Evolution API não respondeu a tempo (Timeout 12s)');
    }
    throw error;
  }
}

// ── ROTA: Receber e disparar agendamento ─────────────────────────
app.post('/agendamento', async (req, res) => {
  try {
    const { nome, telefone, pet, servico, dataFormatada, horario, email } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
    }

    console.log(`\n📅 Agendamento recebido: ${nome} — ${servico} — ${dataFormatada} ${horario}`);
    const dados = lerDados();
    const agendamento = {
      id: 'ag_' + Date.now(),
      nome, telefone, pet, servico, dataFormatada, horario, email,
      status: 'pendente',
      criadoEm: new Date().toISOString()
    };
    dados.agendamentos.unshift(agendamento);
    gravarDados(dados);

    const msgCliente =
      `Olá, *${nome}*! 🐾\n\n` +
      `Seu agendamento na *VetCare* foi confirmado!\n\n` +
      `📅 *Data:* ${dataFormatada}\n` +
      `⏰ *Horário:* ${horario}\n` +
      `💉 *Serviço:* ${servico}\n` +
      `🐾 *Pet:* ${pet || 'não informado'}\n\n` +
      `📍 *Endereço:* Rua das Flores, 123 – Vila Madalena, SP\n` +
      `📞 *Telefone:* (11) 9 8765-4321\n\n` +
      `Até breve! 😊`;

    const msgClinica =
      `🔔 *Novo Agendamento – VetCare*\n\n` +
      `👤 *Cliente:* ${nome}\n` +
      `📱 *WhatsApp:* ${telefone}\n` +
      `📧 *E-mail:* ${email || 'não informado'}\n` +
      `🐾 *Pet:* ${pet || 'não informado'}\n` +
      `💉 *Serviço:* ${servico}\n` +
      `📅 *Data:* ${dataFormatada}\n` +
      `⏰ *Horário:* ${horario}\n\n` +
      `_Agendamento realizado pelo site._`;

    console.log('⏳ Enviando para o cliente e para a clínica...');
    const [resCliente, resClinica] = await Promise.all([
      enviarMensagem(telefone, msgCliente)
        .then(() => ({ sucesso: true }))
        .catch(e => ({ sucesso: false, erro: e.message })),
      enviarMensagem(CONFIG.clinicaNum, msgClinica)
        .then(() => ({ sucesso: true }))
        .catch(e => ({ sucesso: false, erro: e.message }))
    ]);

    console.log(`  → Cliente: ${resCliente.sucesso ? '✅ Enviado' : '❌ ' + resCliente.erro}`);
    console.log(`  → Clínica: ${resClinica.sucesso ? '✅ Enviado' : '❌ ' + resClinica.erro}`);

    const sucesso = resCliente.sucesso && resClinica.sucesso;
    return res.json({
      agendamento: true,
      id: agendamento.id,
      sucesso,
      cliente: resCliente,
      clinica: resClinica,
      ...(sucesso ? {} : { erro: 'Agendamento registrado, mas não foi possível enviar todas as mensagens pela Evolution API.' })
    });
  } catch (error) {
    console.error('❌ Erro interno no processamento:', error.message);
    return res.status(500).json({ erro: error.message });
  }
});

app.get('/api/agendamentos', (req, res) => {
  res.json(lerDados().agendamentos);
});

app.patch('/api/agendamentos/:id', (req, res) => {
  const { status } = req.body;
  const statusValidos = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status de agendamento inválido.' });
  }
  const dados = lerDados();
  const agendamento = dados.agendamentos.find(item => item.id === req.params.id);
  if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
  agendamento.status = status;
  gravarDados(dados);
  return res.json(agendamento);
});

app.get('/api/mensagens', (req, res) => {
  res.json(lerDados().mensagens);
});

app.post('/api/mensagens', (req, res) => {
  const { nome, email, telefone, servico, texto } = req.body;
  if (!nome || !email || !texto) {
    return res.status(400).json({ erro: 'Nome, e-mail e mensagem são obrigatórios.' });
  }
  const mensagem = {
    id: 'msg_' + Date.now(),
    nome: String(nome).trim(),
    email: String(email).trim(),
    telefone: String(telefone || '').trim(),
    servico: String(servico || '').trim(),
    texto: String(texto).trim(),
    lida: false,
    criadaEm: new Date().toISOString()
  };
  const dados = lerDados();
  dados.mensagens.unshift(mensagem);
  gravarDados(dados);
  return res.status(201).json(mensagem);
});

app.patch('/api/mensagens/:id', (req, res) => {
  const dados = lerDados();
  const mensagem = dados.mensagens.find(item => item.id === req.params.id);
  if (!mensagem) return res.status(404).json({ erro: 'Mensagem não encontrada.' });
  if (typeof req.body.lida !== 'boolean') {
    return res.status(400).json({ erro: 'Informe o estado de leitura da mensagem.' });
  }
  mensagem.lida = req.body.lida;
  gravarDados(dados);
  return res.json(mensagem);
});

app.delete('/api/mensagens/:id', (req, res) => {
  const dados = lerDados();
  const quantidadeAnterior = dados.mensagens.length;
  dados.mensagens = dados.mensagens.filter(item => item.id !== req.params.id);
  if (dados.mensagens.length === quantidadeAnterior) {
    return res.status(404).json({ erro: 'Mensagem não encontrada.' });
  }
  gravarDados(dados);
  return res.status(204).end();
});

// ── ROTA: Checar conexão da Evolution API ───────────────────────
app.get('/status', async (req, res) => {
  try {
    const response = await fetch(`${CONFIG.evolutionUrl}/instance/connectionState/${CONFIG.instanceName}`, {
      method: 'GET',
      headers: { 'apikey': CONFIG.apiKey }
    });

    const data = await response.json();
    const conectado = data?.instance?.state === 'open';

    res.json({
      conectado,
      status: conectado ? 'WhatsApp Conectado!' : 'Desconectado',
      state: data?.instance?.state || 'desconhecido'
    });
  } catch (error) {
    res.status(500).json({ conectado: false, erro: 'Evolution API inacessível' });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
  if (senha !== CONFIG.adminPassword) {
    return res.status(401).json({ autenticado: false, erro: 'Senha incorreta.' });
  }
  return res.json({ autenticado: true });
});

// ── Iniciar Servidor Node ─────────────────────────────────────────
app.listen(CONFIG.porta, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor VetCare rodando na porta ${CONFIG.porta}`);
  console.log(`🌐 Site e painel disponíveis na porta ${CONFIG.porta}`);
  console.log(`📡 Evolution API configurada em ${CONFIG.evolutionUrl}\n`);
});