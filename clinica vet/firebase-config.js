// ================================================================
// INSTRUÇÕES DE CONFIGURAÇÃO
// ================================================================
// 1. FIREBASE:
//    - Acesse https://console.firebase.google.com
//    - Crie um projeto → "Ativar Firestore" → modo produção
//    - Vá em Configurações do projeto → Adicionar app Web
//    - Copie as credenciais abaixo
//
// 2. EMAILJS:
//    - Acesse https://emailjs.com e crie conta gratuita
//    - Conecte seu Gmail em "Email Services"
//    - Crie dois templates: um para o cliente, um para a clínica
//    - Copie os IDs abaixo
//
// 3. WHATSAPP:
//    - Apenas troque o número pelo número real da clínica
// ================================================================

const CONFIG = {
  // 🔥 FIREBASE — troque pelos seus dados reais
  firebase: {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
  },

  // 📧 EMAILJS — troque pelos seus dados reais
  emailjs: {
    publicKey: "SUA_PUBLIC_KEY_EMAILJS",
    serviceId: "service_vetcare",           // ID do serviço criado no EmailJS
    templateCliente: "template_cliente",    // Template enviado ao cliente
    templateClinica: "template_clinica"     // Template enviado à clínica
  },

  // 📱 WHATSAPP — número da clínica com DDI
  whatsapp: {
    numero: "5511987654321"  // Formato: 55 + DDD + número (sem espaços ou traços)
  },

  // 🔐 ADMIN — senha simples para o painel (em produção use Firebase Auth)
  admin: {
    senha: "vetcare2024"
  }
};

// ================================================================
// MÓDULO FIREBASE
// ================================================================
const FirebaseDB = {
  db: null,

  async init() {
    try {
      // Importa Firebase via CDN (chamado no HTML)
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, serverTimestamp }
        = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

      const app = initializeApp(CONFIG.firebase);
      this.db = getFirestore(app);
      this._firestore = { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, serverTimestamp };
      console.log('✅ Firebase conectado com sucesso');
      return true;
    } catch (err) {
      console.warn('⚠️ Firebase não configurado — usando modo demonstração local', err.message);
      return false;
    }
  },

  async salvarAgendamento(dados) {
    if (!this.db) return this._salvarLocal(dados);
    try {
      const { collection, addDoc, serverTimestamp } = this._firestore;
      const docRef = await addDoc(collection(this.db, 'agendamentos'), {
        ...dados,
        status: 'pendente',
        criadoEm: serverTimestamp()
      });
      return { id: docRef.id, sucesso: true };
    } catch (err) {
      console.error('Erro ao salvar no Firebase:', err);
      return this._salvarLocal(dados);
    }
  },

  async buscarAgendamentos(filtros = {}) {
    if (!this.db) return this._buscarLocal();
    try {
      const { collection, getDocs, query, orderBy, where } = this._firestore;
      let q = query(collection(this.db, 'agendamentos'), orderBy('criadoEm', 'desc'));
      if (filtros.status) {
        q = query(collection(this.db, 'agendamentos'), where('status', '==', filtros.status), orderBy('criadoEm', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      return this._buscarLocal();
    }
  },

  async atualizarStatus(id, status) {
    if (!this.db) return this._atualizarLocal(id, status);
    try {
      const { doc, updateDoc } = this._firestore;
      await updateDoc(doc(this.db, 'agendamentos', id), { status });
      return true;
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      return false;
    }
  },

  // ---- Fallback local (demonstração sem Firebase) ----
  _salvarLocal(dados) {
    const lista = JSON.parse(sessionStorage.getItem('agendamentos') || '[]');
    const id = 'local_' + Date.now();
    lista.unshift({ id, ...dados, status: 'pendente', criadoEm: new Date().toISOString() });
    sessionStorage.setItem('agendamentos', JSON.stringify(lista));
    return { id, sucesso: true };
  },
  _buscarLocal() {
    return JSON.parse(sessionStorage.getItem('agendamentos') || '[]');
  },
  _atualizarLocal(id, status) {
    const lista = JSON.parse(sessionStorage.getItem('agendamentos') || '[]');
    const idx = lista.findIndex(a => a.id === id);
    if (idx >= 0) { lista[idx].status = status; sessionStorage.setItem('agendamentos', JSON.stringify(lista)); }
    return true;
  }
};

// ================================================================
// MÓDULO EMAILJS
// ================================================================
const EmailService = {
  pronto: false,

  async init() {
    try {
      await new Promise((resolve, reject) => {
        if (window.emailjs) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      emailjs.init(CONFIG.emailjs.publicKey);
      this.pronto = true;
      console.log('✅ EmailJS inicializado');
    } catch (err) {
      console.warn('⚠️ EmailJS não configurado — e-mails serão simulados', err.message);
    }
  },

  async enviarParaCliente(dados) {
    if (!this.pronto || CONFIG.emailjs.publicKey === 'SUA_PUBLIC_KEY_EMAILJS') {
      console.log('📧 [SIMULAÇÃO] E-mail para cliente:', dados);
      return true;
    }
    try {
      await emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateCliente, {
        to_name: dados.nome,
        to_email: dados.email,
        pet_name: dados.pet || 'seu pet',
        service: dados.servico,
        date: dados.dataFormatada,
        time: dados.horario,
        clinic_phone: '(11) 9 8765-4321',
        clinic_address: 'Rua das Flores, 123 – Vila Madalena'
      });
      return true;
    } catch (err) {
      console.error('Erro ao enviar e-mail para cliente:', err);
      return false;
    }
  },

  async enviarParaClinica(dados) {
    if (!this.pronto || CONFIG.emailjs.publicKey === 'SUA_PUBLIC_KEY_EMAILJS') {
      console.log('📧 [SIMULAÇÃO] E-mail para clínica:', dados);
      return true;
    }
    try {
      await emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateClinica, {
        client_name: dados.nome,
        client_phone: dados.telefone,
        client_email: dados.email || 'não informado',
        pet_name: dados.pet || 'não informado',
        service: dados.servico,
        date: dados.dataFormatada,
        time: dados.horario
      });
      return true;
    } catch (err) {
      console.error('Erro ao enviar e-mail para clínica:', err);
      return false;
    }
  }
};

// ================================================================
// MÓDULO WHATSAPP
// ================================================================
const WhatsAppService = {
  gerarLink(dados) {
    const msg = encodeURIComponent(
      `✅ *Novo Agendamento – VetCare*\n\n` +
      `👤 *Cliente:* ${dados.nome}\n` +
      `📱 *WhatsApp:* ${dados.telefone}\n` +
      `🐾 *Pet:* ${dados.pet || 'não informado'}\n` +
      `💉 *Serviço:* ${dados.servico || 'Consulta Clínica'}\n` +
      `📅 *Data:* ${dados.dataFormatada}\n` +
      `⏰ *Horário:* ${dados.horario}\n\n` +
      `_Agendamento realizado pelo site._`
    );
    return `https://wa.me/${CONFIG.whatsapp.numero}?text=${msg}`;
  },

  gerarLinkConfirmacaoCliente(dados) {
    const msg = encodeURIComponent(
      `Olá, ${dados.nome}! 🐾\n\n` +
      `Seu agendamento na *VetCare* foi recebido:\n\n` +
      `📅 *${dados.dataFormatada}* às *${dados.horario}*\n` +
      `💉 *Serviço:* ${dados.servico || 'Consulta Clínica'}\n\n` +
      `Em breve entraremos em contato para confirmar. Qualquer dúvida, é só falar! 😊`
    );
    return `https://wa.me/${CONFIG.whatsapp.numero}?text=${msg}`;
  }
};

// Exporta tudo globalmente
window.VetCareConfig = CONFIG;
window.VetCareDB = FirebaseDB;
window.VetCareEmail = EmailService;
window.VetCareWhatsApp = WhatsAppService;
