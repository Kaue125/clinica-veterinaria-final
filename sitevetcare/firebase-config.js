const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

const CONFIG = {
  firebase: firebaseConfig,
  emailjs: {
    publicKey:        "YnllvdTz9HkAOj9ys",
    serviceId:        "service_vetcare",
    templateCliente:  "template_cliente",
    templateClinica:  "template_clinica"
  },
  whatsapp: {
    numero: "5511985970246"
  },
  evolutionApi: {
    baseUrl: "https://sua-evolution-api.com", // Substitua pela URL da Evolution API
    apiKey: "SEU_API_KEY_AQUI",                // Sua API Key da Evolution
    instanceName: "SUA_INSTANCIA"              // Nome da instância
  },
  backendUrl: 'https://valued-biblical-demonstration-moscow.trycloudflare.com',
  admin: { senha: 'vetcare2024' },
  supabase: {
    url: 'https://vhcmksrfdsgsruxonnej.supabase.co',
    anonKey: 'sb_publishable_QHgQg1DKujffaNW3QdCSiA_14U4H0rR'
  }
};

const SUPABASE_CONFIGURED = !CONFIG.supabase.url.includes('SEU-PROJETO')
  && !CONFIG.supabase.anonKey.includes('SUA_CHAVE');

const VetCareDB = {
  db: SUPABASE_CONFIGURED,
  async request(table, options = {}) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase ainda não configurado.');
    const response = await fetch(`${CONFIG.supabase.url}/rest/v1/${table}`, {
      ...options,
      headers: {
        apikey: CONFIG.supabase.anonKey,
        Authorization: `Bearer ${CONFIG.supabase.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`Supabase respondeu com HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  },
  async init() {},
  async salvarAgendamento(dados) {
    return this.request('agendamentos', {
      method: 'POST',
      body: JSON.stringify({
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email,
        pet: dados.pet,
        servico: dados.servico,
        data_formatada: dados.dataFormatada,
        horario: dados.horario,
        status: 'pendente',
        criado_em: new Date().toISOString()
      })
    });
  },
  async buscarAgendamentos() {
    return this.request('agendamentos?select=*&order=criado_em.desc');
  },
  async atualizarStatus(id, status) {
    return this.request(`agendamentos?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },
  async salvarMensagem(mensagem) {
    return this.request('mensagens', {
      method: 'POST',
      body: JSON.stringify({
        id: mensagem.id,
        nome: mensagem.nome,
        email: mensagem.email,
        telefone: mensagem.telefone,
        servico: mensagem.servico,
        texto: mensagem.texto,
        lida: false,
        criada_em: mensagem.criadaEm
      })
    });
  },
  async buscarMensagens() {
    return this.request('mensagens?select=*&order=criada_em.desc');
  },
  async marcarMensagem(id) {
    return this.request(`mensagens?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ lida: true })
    });
  },
  async excluirMensagem(id) {
    return this.request(`mensagens?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
};

window.VetCareDB = VetCareDB;

const EvolutionService = {
  async enviarMensagemTexto(numero, texto) {
    if (!CONFIG.evolutionApi.baseUrl || CONFIG.evolutionApi.baseUrl.includes('sua-evolution-api')) {
      console.info('ℹ️ Evolution API não configurada.');
      return false;
    }
    
    let numLimpo = numero.replace(/\D/g, '');
    if (numLimpo.length === 10 || numLimpo.length === 11) {
      numLimpo = `55${numLimpo}`;
    }

    try {
      const response = await fetch(`${CONFIG.evolutionApi.baseUrl}/message/sendText/${CONFIG.evolutionApi.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.evolutionApi.apiKey
        },
        body: JSON.stringify({
          number: numLimpo,
          text: texto
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar mensagem via Evolution API:', error);
      return false;
    }
  }
};

window.VetCareConfig    = CONFIG;
window.VetCareEvolution = EvolutionService;