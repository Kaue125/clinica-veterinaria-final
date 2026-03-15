// ================================================================
// CONFIGURAÇÃO — edite aqui quando tiver Firebase/EmailJS prontos
// ================================================================
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqWCOhLvby79sIlc2lHMyTsxOvxaip40Y",
  authDomain: "vetcare-clinica-39dd1.firebaseapp.com",
  projectId: "vetcare-clinica-39dd1",
  storageBucket: "vetcare-clinica-39dd1.firebasestorage.app",
  messagingSenderId: "416451115222",
  appId: "1:416451115222:web:e49b20b711036dba7b7177"
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
    numero: "5511985970246"               // 📱 número real da clínica (55+DDD+número)
  },
  admin: {
    senha: "vetcare2024"
  }
};

// ================================================================
// STORAGE KEY — todos os dados ficam nesta chave do localStorage
// ================================================================
const STORAGE_KEY = 'vetcare_agendamentos';

// ================================================================
// MÓDULO FIREBASE / LOCAL DB
// ================================================================
const FirebaseDB = {
  db: null,
  _firestore: null,

  async init() {
    if (!CONFIG.firebase.apiKey || CONFIG.firebase.apiKey === 'SUA_API_KEY_AQUI') {
      console.info('ℹ️ Modo local ativo — dados salvos no localStorage (compartilhado entre abas)');
      return false;
    }
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const fsModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const app = initializeApp(CONFIG.firebase);
      this.db = fsModule.getFirestore(app);
      this._firestore = fsModule;
      console.log('✅ Firebase conectado');
      return true;
    } catch (err) {
      console.warn('⚠️ Firebase falhou — usando localStorage:', err.message);
      return false;
    }
  },

  async salvarAgendamento(dados) {
    if (this.db) {
      try {
        const { collection, addDoc, serverTimestamp } = this._firestore;
        const ref = await addDoc(collection(this.db, 'agendamentos'), {
          ...dados, status: 'pendente', criadoEm: serverTimestamp()
        });
        return { id: ref.id, sucesso: true };
      } catch (err) {
        console.error('Firebase write error:', err);
      }
    }
    // ── localStorage fallback ──
    const lista = this._lerLocal();
    const id = 'ag_' + Date.now();
    const novo = { id, ...dados, status: 'pendente', criadoEm: new Date().toISOString() };
    lista.unshift(novo);
    this._gravarLocal(lista);
    // Dispara evento para o painel admin na mesma sessão
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    return { id, sucesso: true };
  },

  async buscarAgendamentos() {
    if (this.db) {
      try {
        const { collection, getDocs, query, orderBy } = this._firestore;
        const snap = await getDocs(query(collection(this.db, 'agendamentos'), orderBy('criadoEm', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error('Firebase read error:', err);
      }
    }
    return this._lerLocal();
  },

  async atualizarStatus(id, status) {
    if (this.db) {
      try {
        const { doc, updateDoc } = this._firestore;
        await updateDoc(doc(this.db, 'agendamentos', id), { status });
        return true;
      } catch (err) {
        console.error('Firebase update error:', err);
      }
    }
    const lista = this._lerLocal();
    const idx = lista.findIndex(a => a.id === id);
    if (idx >= 0) { lista[idx].status = status; this._gravarLocal(lista); }
    return true;
  },

  _lerLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  },
  _gravarLocal(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }
};

// ================================================================
// MÓDULO EMAILJS
// ================================================================
const EmailService = {
  pronto: false,

  async init() {
    if (!CONFIG.emailjs.publicKey || CONFIG.emailjs.publicKey === 'SUA_PUBLIC_KEY_EMAILJS') {
      console.info('ℹ️ EmailJS não configurado — e-mails em modo simulação');
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        if (window.emailjs) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
      emailjs.init(CONFIG.emailjs.publicKey);
      this.pronto = true;
      console.log('✅ EmailJS pronto');
    } catch (err) {
      console.warn('⚠️ EmailJS falhou:', err.message);
    }
  },

  async enviarParaCliente(dados) {
    if (!this.pronto) { console.log('📧 [simulação] e-mail cliente:', dados.email); return true; }
    return emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateCliente, {
      to_name: dados.nome, to_email: dados.email,
      pet_name: dados.pet || 'seu pet', service: dados.servico,
      date: dados.dataFormatada, time: dados.horario,
      clinic_phone: '(11) 9 8765-4321',
      clinic_address: 'Rua das Flores, 123 – Vila Madalena'
    }).then(() => true).catch(e => { console.error(e); return false; });
  },

  async enviarParaClinica(dados) {
    if (!this.pronto) { console.log('📧 [simulação] e-mail clínica:', dados); return true; }
    return emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateClinica, {
      client_name: dados.nome, client_phone: dados.telefone,
      client_email: dados.email || 'não informado',
      pet_name: dados.pet || 'não informado',
      service: dados.servico, date: dados.dataFormatada, time: dados.horario
    }).then(() => true).catch(e => { console.error(e); return false; });
  }
};

// ================================================================
// MÓDULO WHATSAPP
// ================================================================
const WhatsAppService = {
  gerarLinkClinica(dados) {
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
  // Mantém compatibilidade com código anterior
  gerarLink(dados) { return this.gerarLinkClinica(dados); }
};

// Exporta globalmente
window.VetCareConfig  = CONFIG;
window.VetCareDB      = FirebaseDB;
window.VetCareEmail   = EmailService;
window.VetCareWhatsApp = WhatsAppService;