// ================================================================
// VetCare — Servidor WhatsApp SEM Docker
// Usa whatsapp-web.js (roda direto no Node.js)
// ================================================================
const express    = require('express');
const cors       = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode     = require('qrcode');
const app        = express();

app.use(cors());
app.use(express.json());

const CONFIG = {
  porta:      3001,
  clinicaNum: '5511985970246' // troque pelo número real da clínica
};

// ── Estado da conexão ────────────────────────────────────────────
let qrCodeBase64  = null;
let conectado     = false;
let statusMsg     = 'Aguardando inicialização...';

// ── Cliente WhatsApp ─────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'vetcare' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('📱 QR Code gerado — acesse http://localhost:3001/setup para escanear');
  qrCodeBase64 = await qrcode.toDataURL(qr);
  conectado    = false;
  statusMsg    = 'QR Code pronto para escanear';
});

client.on('ready', () => {
  conectado    = true;
  qrCodeBase64 = null;
  statusMsg    = 'WhatsApp conectado!';
  console.log('✅ WhatsApp conectado com sucesso!');
});

client.on('authenticated', () => {
  statusMsg = 'Autenticado — carregando...';
  console.log('🔐 Autenticado!');
});

client.on('auth_failure', () => {
  conectado = false;
  statusMsg = 'Falha na autenticação — gere o QR Code novamente';
  console.log('❌ Falha na autenticação');
});

client.on('disconnected', () => {
  conectado = false;
  statusMsg = 'Desconectado';
  console.log('⚠️ WhatsApp desconectado');
  // Reconecta automaticamente após 5s
  setTimeout(() => client.initialize(), 5000);
});

// ── Helper: formatar número ──────────────────────────────────────
function formatarNumero(telefone) {
  let num = telefone.replace(/\D/g, '');
  if (!num.startsWith('55')) num = '55' + num;
  return num + '@c.us';
}

// ── Helper: enviar mensagem ──────────────────────────────────────
async function enviarMensagem(telefone, texto) {
  if (!conectado) throw new Error('WhatsApp não conectado');
  const numero = formatarNumero(telefone);
  await client.sendMessage(numero, texto);
  return true;
}

// ── ROTA: receber agendamento ────────────────────────────────────
app.post('/agendamento', async (req, res) => {
  const { nome, telefone, pet, servico, dataFormatada, horario, email } = req.body;

  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }

  console.log(`\n📅 Agendamento: ${nome} — ${servico} — ${dataFormatada} ${horario}`);

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

  const [resCliente, resClinica] = await Promise.all([
    enviarMensagem(telefone, msgCliente).then(() => ({ sucesso: true })).catch(e => ({ sucesso: false, erro: e.message })),
    enviarMensagem(CONFIG.clinicaNum, msgClinica).then(() => ({ sucesso: true })).catch(e => ({ sucesso: false, erro: e.message }))
  ]);

  console.log(`  → Cliente: ${resCliente.sucesso ? '✅' : '❌ ' + resCliente.erro}`);
  console.log(`  → Clínica: ${resClinica.sucesso ? '✅' : '❌ ' + resClinica.erro}`);

  res.json({ sucesso: true, cliente: resCliente, clinica: resClinica });
});

// ── ROTA: status ─────────────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json({ conectado, status: statusMsg, temQR: !!qrCodeBase64 });
});

// ── ROTA: QR code ─────────────────────────────────────────────────
app.get('/qrcode', (req, res) => {
  if (conectado) return res.json({ conectado: true, mensagem: 'Já conectado!' });
  if (qrCodeBase64) return res.json({ qrcode: qrCodeBase64 });
  res.json({ erro: 'QR Code ainda não gerado. Aguarde alguns segundos e tente novamente.' });
});

// ── ROTA: página de setup ────────────────────────────────────────
app.get('/setup', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>VetCare — Setup WhatsApp</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Poppins,sans-serif;background:#f0f4f8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{background:#fff;border-radius:20px;padding:40px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.1);text-align:center}
    .logo{font-size:1.6rem;font-weight:700;color:#1a1a2e;margin-bottom:4px}.logo span{color:#2ecc71}
    .subtitle{color:#666;font-size:.9rem;margin-bottom:28px}
    .status-box{border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;text-align:left}
    .status-box.ok{background:#e8f8f0;border:1.5px solid #2ecc71}
    .status-box.err{background:#fef2f2;border:1.5px solid #e74c3c}
    .status-box.wait{background:#fef9e7;border:1.5px solid #f39c12}
    .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .dot-ok{background:#2ecc71}.dot-err{background:#e74c3c}.dot-wait{background:#f39c12;animation:blink 1s infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
    .status-text strong{display:block;font-size:.9rem;color:#1a1a2e}.status-text span{font-size:.8rem;color:#666}
    #qr-wrap{margin:16px 0}
    #qr-wrap img{border-radius:12px;border:2px solid #eee;max-width:240px;width:100%}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:50px;font-family:Poppins,sans-serif;font-weight:600;font-size:.88rem;cursor:pointer;border:none;transition:.2s;margin:4px}
    .btn-primary{background:#2ecc71;color:#fff}.btn-primary:hover{background:#27ae60}
    .btn-outline{background:transparent;color:#1a1a2e;border:2px solid #ddd}.btn-outline:hover{border-color:#2ecc71;color:#27ae60}
    .steps{text-align:left;background:#f8fffe;border-radius:12px;padding:18px 20px;margin-top:20px}
    .steps h4{font-size:.8rem;font-weight:700;color:#1a1a2e;margin-bottom:10px;letter-spacing:.5px;text-transform:uppercase}
    .step{display:flex;gap:10px;margin-bottom:8px;font-size:.83rem;color:#444;align-items:flex-start}
    .sn{background:#2ecc71;color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;flex-shrink:0;margin-top:1px}
    #log{background:#1a1a2e;color:#2ecc71;border-radius:8px;padding:12px;font-family:monospace;font-size:.75rem;text-align:left;max-height:120px;overflow-y:auto;margin-top:14px;display:none}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">Vet<span>Care</span></div>
  <p class="subtitle">Configuração do WhatsApp Automático</p>
  <div id="status-box" class="status-box wait">
    <div class="dot dot-wait" id="dot"></div>
    <div class="status-text"><strong id="st-title">Verificando...</strong><span id="st-sub">Aguarde</span></div>
  </div>
  <div id="qr-wrap"></div>
  <div>
    <button class="btn btn-primary" onclick="carregarQR()">📱 Gerar QR Code</button>
    <button class="btn btn-outline" onclick="checarStatus()">🔄 Verificar</button>
    <button class="btn btn-outline" onclick="toggleLog()">🖥️ Log</button>
  </div>
  <div id="log"></div>
  <div class="steps">
    <h4>Como conectar</h4>
    <div class="step"><div class="sn">1</div><span>Clique em <strong>Gerar QR Code</strong> e aguarde aparecer</span></div>
    <div class="step"><div class="sn">2</div><span>Abra o WhatsApp no celular → <strong>Dispositivos vinculados → Vincular dispositivo</strong></span></div>
    <div class="step"><div class="sn">3</div><span>Escaneie o QR Code com a câmera do celular</span></div>
    <div class="step"><div class="sn">4</div><span>Aguarde o status mudar para <strong style="color:#2ecc71">Conectado ✅</strong></span></div>
  </div>
</div>
<script>
const API = window.location.origin;
function log(m){const el=document.getElementById('log');el.style.display='block';el.innerHTML+=new Date().toLocaleTimeString('pt-BR')+' — '+m+'\\n';el.scrollTop=el.scrollHeight;}
function toggleLog(){const el=document.getElementById('log');el.style.display=el.style.display==='none'?'block':'none';}
function setStatus(tipo,titulo,sub){
  const box=document.getElementById('status-box');
  box.className='status-box '+tipo;
  document.getElementById('dot').className='dot dot-'+tipo;
  document.getElementById('st-title').textContent=titulo;
  document.getElementById('st-sub').textContent=sub;
}
async function checarStatus(){
  try{
    const d=await fetch(API+'/status').then(r=>r.json());
    if(d.conectado){
      setStatus('ok','✅ WhatsApp Conectado!','Mensagens automáticas ativas');
      document.getElementById('qr-wrap').innerHTML='<p style="color:#2ecc71;font-weight:600;margin:12px 0;font-size:.9rem">✅ Conectado com sucesso!</p>';
      log('✅ Conectado!');
    } else if(d.temQR){
      setStatus('wait','📱 Escaneie o QR Code','WhatsApp → Dispositivos vinculados');
      log('QR Code disponível');
    } else {
      setStatus('wait','⏳ Inicializando...','Aguarde o QR Code ser gerado');
      log('Status: '+d.status);
    }
  }catch(e){setStatus('err','❌ Servidor offline','Verifique se o node server.js está rodando');log('Erro: '+e.message);}
}
async function carregarQR(){
  setStatus('wait','⏳ Gerando QR Code...','Aguarde até 30 segundos');
  document.getElementById('qr-wrap').innerHTML='<p style="color:#999;font-size:.85rem;margin:12px 0">Aguardando QR Code...</p>';
  log('Solicitando QR Code...');
  
  // Tenta por até 30s
  for(let i=0;i<10;i++){
    await new Promise(r=>setTimeout(r,3000));
    try{
      const d=await fetch(API+'/qrcode').then(r=>r.json());
      if(d.conectado){setStatus('ok','✅ Já conectado!','');return;}
      if(d.qrcode){
        document.getElementById('qr-wrap').innerHTML='<p style="font-size:.82rem;color:#666;margin-bottom:8px">Escaneie com o WhatsApp:</p><img src="'+d.qrcode+'" alt="QR Code"/>';
        setStatus('wait','📱 Escaneie o QR Code','WhatsApp → Dispositivos vinculados → Vincular');
        log('QR Code exibido!');
        // Verifica conexão
        const iv=setInterval(async()=>{
          const s=await fetch(API+'/status').then(r=>r.json()).catch(()=>({}));
          if(s.conectado){clearInterval(iv);setStatus('ok','✅ Conectado!','Mensagens automáticas ativas');document.getElementById('qr-wrap').innerHTML='<p style="color:#2ecc71;font-weight:600;margin:12px 0">✅ WhatsApp conectado!</p>';log('✅ Conectado!');}
        },3000);
        return;
      }
      log('Tentativa '+(i+1)+': '+JSON.stringify(d));
    }catch(e){log('Erro: '+e.message);}
  }
  setStatus('err','❌ Timeout','QR Code não gerado. Reinicie o servidor.');
}
checarStatus();
setInterval(checarStatus, 15000);
</script>
</body>
</html>`);
});

// ── Iniciar ──────────────────────────────────────────────────────
console.log('\n🚀 Iniciando servidor VetCare...');
console.log('   Aguarde o WhatsApp Web carregar (pode levar 30-60s na primeira vez)\n');
console.log(`   Setup: http://localhost:${CONFIG.porta}/setup\n`);

client.initialize();

app.listen(CONFIG.porta, () => {
  console.log(`   Servidor rodando na porta ${CONFIG.porta}`);
});