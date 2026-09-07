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
  backendUrl: window.location.protocol === 'http:' || window.location.protocol === 'https:'
    ? ''
    : 'http://localhost:3001',
  admin: {}
};

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