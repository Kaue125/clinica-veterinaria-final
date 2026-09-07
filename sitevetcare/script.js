// ================================================================
// INICIALIZAÇÃO DOS SERVIÇOS
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initUI();

  try { if (typeof VetCareDB !== 'undefined') await VetCareDB.init(); }
  catch(e) { console.warn('Firebase ignorado:', e.message); }

  try { if (typeof VetCareEmail !== 'undefined') await VetCareEmail.init(); }
  catch(e) { console.warn('EmailJS ignorado:', e.message); }
});

function initUI() {
  initNavbar();
  initMobileMenu();
  initCounters();
  initServicesFilter();
  initGallery();
  initTestimonials();
  initFAQ();
  initCalendar();
  initContactForm();
  initScrollReveal();
  initPhoneMask();
}

// ================================================================
// NAVBAR
// ================================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    backToTop?.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ================================================================
// MOBILE MENU
// ================================================================
function initMobileMenu() {
  const navToggle = document.getElementById('nav-toggle');
  const navLinks  = document.getElementById('nav-links');
  const navbar    = document.getElementById('navbar');

  navToggle?.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', (e) => {
    if (navbar && !navbar.contains(e.target) && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ================================================================
// COUNTERS
// ================================================================
function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.target;
      const step = target / (2000 / 16);
      let current = 0;
      const update = () => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current).toLocaleString('pt-BR');
        if (current < target) requestAnimationFrame(update);
      };
      update();
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach(c => observer.observe(c));
}

// ================================================================
// SERVICES FILTER
// ================================================================
function initServicesFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.service-card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
      });
    });
  });
}

// ================================================================
// GALLERY LIGHTBOX
// ================================================================
function initGallery() {
  const lightbox     = document.getElementById('lightbox');
  const lightboxImg  = document.getElementById('lightbox-img');
  const lightboxClose= document.getElementById('lightbox-close');

  document.querySelectorAll('.gallery-item').forEach(item => {
    const open = () => {
      const img = item.querySelector('img');
      if (lightboxImg && img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
      }
      if (lightbox) lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      lightboxClose?.focus();
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();open();} });
  });

  const close = () => { 
    if (lightbox) lightbox.hidden=true; 
    if (lightboxImg) lightboxImg.src=''; 
    document.body.style.overflow=''; 
  };
  lightboxClose?.addEventListener('click', close);
  lightbox?.addEventListener('click', e => { if (e.target===lightbox) close(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape'&&!lightbox?.hidden) close(); });
}

// ================================================================
// TESTIMONIALS
// ================================================================
function initTestimonials() {
  let current = 0;
  const slides = document.querySelectorAll('.testimonial-card');
  const dots   = document.querySelectorAll('.dot');
  if (!slides.length) return;

  const go = (idx) => {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    dots[current].setAttribute('aria-selected','false');
    current = idx;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    dots[current].setAttribute('aria-selected','true');
  };
  dots.forEach(dot => dot.addEventListener('click', () => go(+dot.dataset.index)));
  let timer = setInterval(() => go((current+1)%slides.length), 5000);
  const slider = document.querySelector('.testimonials-slider');
  slider?.addEventListener('mouseenter', () => clearInterval(timer));
  slider?.addEventListener('mouseleave', () => { timer = setInterval(()=>go((current+1)%slides.length),5000); });
}

// ================================================================
// FAQ
// ================================================================
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question').setAttribute('aria-expanded','false');
        i.querySelector('.faq-answer').hidden = true;
      });
      if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded','true'); answer.hidden=false; }
    });
  });
}

// ================================================================
// CALENDÁRIO & AGENDAMENTO
// ================================================================
function initCalendar() {
  const HORARIOS  = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00'];
  const OCUPADOS  = { 3:['09:00','14:00'], 5:['10:00','17:00'], 10:['08:00','11:00','15:00'], 15:['14:00','15:00','16:00'] };

  let calDate = new Date(); calDate.setDate(1);
  let selectedDate = null;
  let selectedTime = null;

  const $ = id => document.getElementById(id);
  const els = {
    monthYear:   $('calendar-month-year'),
    days:        $('calendar-days'),
    prevBtn:     $('prev-month'),
    nextBtn:     $('next-month'),
    timesSection:$('time-slots-section'),
    timesBox:    $('time-slots'),
    dateLabel:   $('selected-date-label'),
    formFields:  $('scheduling-form-fields'),
    successBox:  $('scheduling-success'),
    placeholder: $('scheduling-placeholder'),
    summary:     $('scheduling-summary'),
    confirmBtn:  $('confirm-scheduling'),
    loading:     $('scheduling-loading'),
  };

  function render() {
    if (!els.monthYear || !els.days) return;
    const year = calDate.getFullYear(), month = calDate.getMonth();
    const today = new Date(); today.setHours(0,0,0,0);
    els.monthYear.textContent = new Date(year,month,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    els.days.innerHTML = '';

    const firstDay    = new Date(year,month,1).getDay();
    const daysInMonth = new Date(year,month+1,0).getDate();

    for (let i=0;i<firstDay;i++) {
      const d=document.createElement('div'); d.className='cal-day empty'; els.days.appendChild(d);
    }
    for (let d=1;d<=daysInMonth;d++) {
      const date    = new Date(year,month,d);
      const isPast  = date<today;
      const isSun   = date.getDay()===0;
      const btn     = document.createElement('button');
      btn.className = 'cal-day'; btn.textContent=d; btn.type='button';
      if (date.toDateString()===today.toDateString()) btn.classList.add('today');
      if (isPast||isSun) { btn.classList.add('disabled'); btn.disabled=true; }
      else {
        btn.classList.add('has-slots');
        if (selectedDate?.toDateString()===date.toDateString()) btn.classList.add('selected');
        btn.setAttribute('aria-label',`Selecionar dia ${d}`);
        btn.addEventListener('click',()=>{selectedDate=date;selectedTime=null;render();showTimes(d);});
      }
      els.days.appendChild(btn);
    }
  }

  function showTimes(day) {
    els.placeholder.hidden=true; els.timesSection.hidden=false;
    els.formFields.hidden=true; els.successBox.hidden=true;
    els.dateLabel.textContent=selectedDate.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    const ocupados = OCUPADOS[day]||[];
    els.timesBox.innerHTML='';
    HORARIOS.forEach(h => {
      const busy = ocupados.includes(h);
      const btn  = document.createElement('button');
      btn.type='button'; btn.className='time-slot'+(busy?' booked':''); btn.textContent=h; btn.disabled=busy;
      btn.setAttribute('aria-label', busy?`${h} indisponível`:`Selecionar ${h}`);
      if (!busy) btn.addEventListener('click',()=>{
        selectedTime=h;
        document.querySelectorAll('.time-slot').forEach(s=>s.classList.remove('selected'));
        btn.classList.add('selected');
        els.formFields.hidden=false;
        els.formFields.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      els.timesBox.appendChild(btn);
    });
  }

  els.prevBtn?.addEventListener('click',()=>{calDate.setMonth(calDate.getMonth()-1);render();});
  els.nextBtn?.addEventListener('click',()=>{calDate.setMonth(calDate.getMonth()+1);render();});

  els.confirmBtn?.addEventListener('click', async () => {
    const nome     = $('sched-name')?.value.trim();
    const telefone = $('sched-phone')?.value.trim();
    const email    = $('sched-email')?.value.trim();
    const pet      = $('sched-pet')?.value.trim();
    const servico  = $('sched-service')?.value || 'Consulta Clínica';

    if (!nome||!telefone) { showToast('Preencha nome e WhatsApp.','erro'); return; }
    if (!selectedDate||!selectedTime) { showToast('Selecione data e horário.','erro'); return; }

    const dataFormatada = selectedDate.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const dados = { nome, telefone, email, pet, servico, dataFormatada, horario: selectedTime };

    if (els.loading) els.loading.style.display='flex';
    els.confirmBtn.disabled=true;
    els.confirmBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Confirmando...';

    try {
      let resultado = { agendamento: true, sucesso: false };
      const backendUrl = typeof VetCareConfig !== 'undefined' ? VetCareConfig.backendUrl : '';
      if (backendUrl) {
        const resposta = await fetch(`${backendUrl}/agendamento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });
        resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok || resultado.agendamento !== true) {
          throw new Error(resultado.erro || `Servidor respondeu com HTTP ${resposta.status}`);
        }
      } else if (typeof VetCareDB !== 'undefined' && VetCareDB.db) {
        await VetCareDB.salvarAgendamento(dados);
      } else {
        throw new Error('Configure o Supabase antes de publicar o site.');
      }

      if (typeof VetCareEmail !== 'undefined') {
        Promise.allSettled([
          email ? VetCareEmail.enviarParaCliente(dados) : Promise.resolve(),
          VetCareEmail.enviarParaClinica(dados)
        ]).catch(() => {});
      }

      if (els.summary) {
        els.summary.textContent =
          `${nome}${pet ? ` (pet: ${pet})` : ''} — ${servico} em ${dataFormatada} às ${selectedTime}.`;
      }
      els.timesSection.hidden = true;
      els.formFields.hidden   = true;
      els.successBox.hidden   = false;

      showToast(
        resultado.sucesso
          ? 'Agendamento confirmado e mensagens enviadas! 🎉'
          : 'Agendamento confirmado, mas houve falha no envio de uma mensagem.',
        resultado.sucesso ? 'sucesso' : 'erro'
      );

    } catch(err) {
      console.error('Erro no agendamento:', err);
      showToast('Erro ao salvar. Tente novamente.', 'erro');
    } finally {
      if (els.loading) els.loading.style.display = 'none';
      els.confirmBtn.disabled = false;
      els.confirmBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirmar Agendamento';
    }
  });

  render();
}

// ================================================================
// FORMULÁRIO DE CONTATO
// ================================================================
function initContactForm() {
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn     = e.target.querySelector('button[type="submit"]');
    const success = document.getElementById('form-success');
    const mensagem = {
      id: 'msg_' + Date.now(),
      nome: form.querySelector('#name').value.trim(),
      email: form.querySelector('#email').value.trim(),
      telefone: form.querySelector('#phone').value.trim(),
      servico: form.querySelector('#service').value,
      texto: form.querySelector('#message').value.trim(),
      lida: false,
      criadaEm: new Date().toISOString()
    };

    if (!mensagem.nome || !mensagem.email || !mensagem.texto) {
      showToast('Preencha nome, e-mail e mensagem.', 'erro');
      return;
    }

    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    try {
      const backendUrl = typeof VetCareConfig !== 'undefined' ? VetCareConfig.backendUrl : '';
      if (backendUrl) {
        const resposta = await fetch(`${backendUrl}/api/mensagens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mensagem)
        });
        const resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok) throw new Error(resultado.erro || `Servidor respondeu com HTTP ${resposta.status}`);
      } else if (typeof VetCareDB !== 'undefined' && VetCareDB.db) {
        await VetCareDB.salvarMensagem(mensagem);
      } else {
        throw new Error('Configure o Supabase antes de publicar o site.');
      }
      e.target.reset();
      if (success) success.hidden=false;
      setTimeout(()=>{ if (success) success.hidden=true; },6000);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showToast('Não foi possível enviar. Verifique a conexão com o servidor.', 'erro');
    } finally {
      btn.disabled=false;
      btn.innerHTML='<i class="fas fa-paper-plane"></i> Enviar Mensagem';
    }
  });
}

// ================================================================
// SCROLL REVEAL
// ================================================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry,i)=>{
      if (entry.isIntersecting) {
        setTimeout(()=>entry.target.classList.add('visible'), i*80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal,.service-card,.team-card,.stat-item,.pricing-card,.gallery-item,.faq-item').forEach(el=>{
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    observer.observe(el);
  });
}

// ================================================================
// PHONE MASK
// ================================================================
function initPhoneMask() {
  document.querySelectorAll('input[type="tel"]').forEach(input=>{
    input.addEventListener('input',()=>{
      let v = input.value.replace(/\D/g,'').slice(0,11);
      if (v.length<=10) v=v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');
      else v=v.replace(/(\d{2})(\d{1})(\d{4})(\d{0,4})/,'($1) $2 $3-$4');
      input.value=v.trim().replace(/-$/,'');
    });
  });
}

// ================================================================
// TOAST NOTIFICATION
// ================================================================
function showToast(msg, tipo='sucesso') {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `<i class="fas fa-${tipo==='sucesso'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('show'));
  setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.remove(),400); },4000);
}