/**
 * SGCM — Sistema de Gerenciamento Comercial
 * Módulo: UI Utilities, Notificações, Navegação
 */

// ──────────────────────────────────────────
// APLICAR CONFIGURAÇÕES VISUAIS
// ──────────────────────────────────────────
function applyConfig() {
  const config = DB.getConfig();
  document.documentElement.style.setProperty('--primary', config.cor || '#2563EB');
  // Derivar versões lighter/darker da cor primária
  document.documentElement.style.setProperty('--primary-light', hexToRgbaLight(config.cor));

  // Atualizar nome do estabelecimento na sidebar
  const logoText = document.getElementById('sidebarBusinessName');
  if (logoText) logoText.textContent = config.nome || 'Meu Negócio';

  const logoIcon = document.getElementById('sidebarEmoji');
  if (logoIcon) logoIcon.textContent = config.emoji || '🏪';

  const ownerAvatar = document.getElementById('ownerAvatar');
  if (ownerAvatar) {
    ownerAvatar.textContent = (config.owner || 'A')[0].toUpperCase();
  }

  const ownerName = document.getElementById('ownerName');
  if (ownerName) ownerName.textContent = config.owner || 'Admin';

  const topbarBusinessName = document.getElementById('topbarBusinessName');
  if (topbarBusinessName) topbarBusinessName.textContent = config.nome || 'Meu Negócio';

  const pageTitle = document.title;
  document.title = (config.nome || 'SGCM') + ' — ' + pageTitle.split('—')[1]?.trim() || 'Sistema';
}

// CORRIGIDA: hexToRgbaLight com fallback seguro
function hexToRgbaLight(hex) {
  // Fallback para valores inválidos
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return '#DBEAFE';
  }
  
  try {
    // Suporta tanto #RGB quanto #RRGGBB
    let r, g, b;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else {
      return '#DBEAFE';
    }
    
    // Verifica se os valores são válidos
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return '#DBEAFE';
    }
    
    return `rgba(${r},${g},${b},0.12)`;
  } catch (e) {
    console.warn('hexToRgbaLight error:', e);
    return '#DBEAFE';
  }
}

// Escapa texto para evitar XSS (uso em templates onde innerHTML é necessário)
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// Disponibiliza globalmente
window.escapeHTML = escapeHTML;

// ──────────────────────────────────────────
// VALIDAÇÃO DE CONFLITO DE HORÁRIOS (NOVA FUNÇÃO)
// ──────────────────────────────────────────
function hasTimeConflict(data, hora, servicoId, excludeId = null) {
  const servico = DB.getServicoPorId(servicoId);
  if (!servico) return false;
  
  const duracao = parseInt(servico.duracao) || 30;
  
  // Converte hora inicial para minutos
  const [horaInicio, minInicio] = hora.split(':').map(Number);
  const inicioMinutos = horaInicio * 60 + minInicio;
  const fimMinutos = inicioMinutos + duracao;
  
  const agendamentos = DB.getAgendamentos();
  
  return agendamentos.some(ag => {
    // Ignora o próprio agendamento se estiver editando
    if (excludeId && ag.id === excludeId) return false;
    
    // Só verifica mesma data
    if (ag.data !== data) return false;
    
    // Só verifica agendamentos ativos (não cancelados)
    if (ag.status === 'cancelado') return false;
    
    const [hAg, mAg] = ag.hora.split(':').map(Number);
    const agInicio = hAg * 60 + mAg;
    
    // Pega duração do serviço do outro agendamento
    const outroServico = DB.getServicoPorId(ag.servicoId);
    const outroDuracao = parseInt(outroServico?.duracao) || 30;
    const agFim = agInicio + outroDuracao;
    
    // Verifica sobreposição: 
    // [inicio, fim] vs [agInicio, agFim]
    const temConflito = (inicioMinutos < agFim && fimMinutos > agInicio);
    
    return temConflito;
  });
}

// ──────────────────────────────────────────
// SISTEMA DE NOTIFICAÇÕES
// ──────────────────────────────────────────
const Notify = {
  wrapper: null,

  init() {
    this.wrapper = document.getElementById('notificationsWrapper');
    if (!this.wrapper) {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'notifications-wrapper';
      this.wrapper.id = 'notificationsWrapper';
      document.body.appendChild(this.wrapper);
    }
  },

  show(title, msg = '', type = 'info', duration = 4000) {
    if (!this.wrapper) this.init();

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const colors = {
      success: 'var(--green)',
      error: 'var(--red)',
      warning: 'var(--yellow)',
      info: 'var(--primary)',
    };

    const el = document.createElement('div');
    el.className = 'notification';
    el.style.setProperty('--notif-color', colors[type] || colors.info);
    el.innerHTML = `
      <span class="notification-icon">${icons[type] || icons.info}</span>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        ${msg ? `<div class="notification-msg">${msg}</div>` : ''}
      </div>
      <button class="notification-close" onclick="Notify.remove(this.parentElement)">×</button>
    `;

    this.wrapper.appendChild(el);

    if (duration > 0) {
      setTimeout(() => this.remove(el), duration);
    }
  },

  remove(el) {
    if (!el || el.classList.contains('removing')) return;
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  },

  success(title, msg) { this.show(title, msg, 'success'); },
  error(title, msg) { this.show(title, msg, 'error'); },
  warning(title, msg) { this.show(title, msg, 'warning'); },
  info(title, msg) { this.show(title, msg, 'info'); },
};

// ──────────────────────────────────────────
// MODAL
// ──────────────────────────────────────────
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  },
};

// Fechar modal ao clicar no overlay
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ──────────────────────────────────────────
// NAVEGAÇÃO (SPA simples via hash)
// ──────────────────────────────────────────
const Pages = {
  // Mapeia hash para arquivo HTML
  routes: {
    '#dashboard':    'index.html',
    '#clientes':     'pages/clientes.html',
    '#servicos':     'pages/servicos.html',
    '#agendamentos': 'pages/agendamentos.html',
    '#historico':    'pages/historico.html',
    '#config':       'pages/config.html',
  },

  activePage: '',

  init() {
    this.highlightActive();
    window.addEventListener('hashchange', () => this.highlightActive());
  },

  highlightActive() {
    const hash = window.location.hash || '#dashboard';
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === hash);
    });
    this.activePage = hash;
  },
};

// ──────────────────────────────────────────
// FORMATADORES
// ──────────────────────────────────────────
const Format = {
  currency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value) || 0);
  },

  date(isoDate) {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  },

  dateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  phone(value) {
    if (!value) return '—';
    const n = value.replace(/\D/g, '');
    if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
    return value;
  },

  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  },

  duration(min) {
    if (!min) return '—';
    const m = parseInt(min);
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}min` : `${h}h`;
  },
};

// ──────────────────────────────────────────
// AVATAR COLOR (gera cor a partir do nome)
// ──────────────────────────────────────────
function avatarColor(name) {
  const colors = [
    '#2563EB', '#8B5CF6', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
  ];
  let hash = 0;
  for (const c of (name || '')) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

// ──────────────────────────────────────────
// CONFIRM DIALOG (simples)
// ──────────────────────────────────────────
function confirmDelete(msg, onConfirm) {
  const overlay = document.getElementById('confirmOverlay');
  const msgEl = document.getElementById('confirmMsg');
  const btnYes = document.getElementById('confirmYes');

  if (!overlay) {
    // Se não existe o modal de confirmação, usa window.confirm
    if (window.confirm(msg || 'Confirmar exclusão?')) onConfirm();
    return;
  }

  msgEl.textContent = msg || 'Tem certeza que deseja excluir?';
  overlay.classList.add('active');

  btnYes.onclick = () => {
    overlay.classList.remove('active');
    onConfirm();
  };
}

// ──────────────────────────────────────────
// BUSCA UNIVERSAL
// ──────────────────────────────────────────
function setupSearch(inputId, tableBodyId, searchFields) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const rows = document.querySelectorAll(`#${tableBodyId} tr`);
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = query === '' || text.includes(query) ? '' : 'none';
    });
  });
}

// ──────────────────────────────────────────
// ALERTAS DE AGENDAMENTO PRÓXIMO
// ──────────────────────────────────────────
function checkUpcomingAppointments() {
  const ags = DB.getAgendamentosHoje().filter(a => a.status === 'agendado');
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  ags.forEach(ag => {
    if (!ag.hora) return;
    const [h, m] = ag.hora.split(':').map(Number);
    const agTime = h * 60 + m;
    const diff = agTime - currentTime;

    if (diff > 0 && diff <= 30) {
      const cliente = DB.getClienteById(ag.clienteId);
      const servico = DB.getServicoPorId(ag.servicoId);
      Notify.warning(
        `Agendamento em ${diff}min`,
        `${cliente?.nome || 'Cliente'} — ${servico?.nome || 'Serviço'} às ${ag.hora}`
      );
    }
  });
}


// ──────────────────────────────────────────
// MODO ESCURO (DARK MODE)
// ──────────────────────────────────────────
const DarkMode = {
  init() {
    const saved = localStorage.getItem('sgcm_darkmode');
    if (saved === 'true') {
      document.body.classList.add('dark-mode');
      this.updateToggleIcon(true);
    }
    // Adiciona listeners aos botões de dark mode (tanto id 'darkModeToggle' quanto 'darkModeToggleTopbar')
    this.setupToggleButtons();
  },
  setupToggleButtons() {
    // Para botões com id 'darkModeToggleTopbar' (na topbar)
    const topbarBtn = document.getElementById('darkModeToggleTopbar');
    if (topbarBtn) {
      topbarBtn.addEventListener('click', () => this.toggle());
      this.updateToggleIcon(document.body.classList.contains('dark-mode'));
    }
    // Também mantém suporte para 'darkModeToggle' (se existir)
    const legacyBtn = document.getElementById('darkModeToggle');
    if (legacyBtn) {
      legacyBtn.addEventListener('click', () => this.toggle());
    }
  },
  addToggleButton() {
    // Procura o local onde adicionar o botão (topbar-actions)
    const topbarActions = document.querySelector('.topbar-actions');
    if (!topbarActions) return;
    // Verifica se já existe
    if (document.getElementById('darkModeToggle')) return;
    const btn = document.createElement('button');
    btn.id = 'darkModeToggle';
    btn.className = 'dark-mode-toggle';
    btn.setAttribute('data-tooltip', 'Alternar modo escuro');
    btn.setAttribute('aria-label', 'Alternar modo escuro');
    const isDark = document.body.classList.contains('dark-mode');
    btn.innerHTML = isDark ? '☀️' : '🌙';
    btn.addEventListener('click', () => this.toggle());
    // Insere antes do avatar
    const avatar = topbarActions.querySelector('.topbar-avatar');
    if (avatar) {
      topbarActions.insertBefore(btn, avatar);
    } else {
      topbarActions.appendChild(btn);
    }
  },
  updateToggleIcon(isDark) {
    // Atualiza ícone em ambos os possíveis botões
    const topbarBtn = document.getElementById('darkModeToggleTopbar');
    if (topbarBtn) {
      topbarBtn.innerHTML = isDark ? '☀️' : '🌙';
    }
    const legacyBtn = document.getElementById('darkModeToggle');
    if (legacyBtn) {
      legacyBtn.innerHTML = isDark ? '☀️' : '🌙';
    }
  },
  toggle() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('sgcm_darkmode', isDark);
    this.updateToggleIcon(isDark);
    // Dispara evento global para sincronizar outros botões
    document.dispatchEvent(new Event('darkmodechange'));
    Notify.info('Tema alterado', isDark ? 'Modo escuro ativado' : 'Modo claro ativado');
  }
};

// ──────────────────────────────────────────
// BACKUP AUTOMÁTICO (LEMBRETE SEMANAL)
// ──────────────────────────────────────────
const BackupReminder = {
  init() {
    const lastBackup = localStorage.getItem('sgcm_last_backup_reminder');
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (!lastBackup || (now - parseInt(lastBackup)) > oneWeek) {
      setTimeout(() => {
        Notify.warning(
          '💾 Backup recomendado',
          'Já faz uma semana. Exporte seus dados em Configurações > Dados do Sistema.',
          10000
        );
        localStorage.setItem('sgcm_last_backup_reminder', now);
      }, 3000);
    }
  }
};

// ──────────────────────────────────────────
// MÁSCARA DE TELEFONE
// ──────────────────────────────────────────
function setupPhoneMask(inputElement) {
  if (!inputElement) return;
  inputElement.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      // (XX) XXXX-XXXX
      value = value.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (match, ddd, first, second) => {
        let result = '';
        if (ddd) result = `(${ddd}`;
        if (first) result += `) ${first}`;
        if (second) result += `-${second}`;
        return result;
      });
    } else {
      // (XX) XXXXX-XXXX
      value = value.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (match, ddd, first, second) => {
        let result = '';
        if (ddd) result = `(${ddd}`;
        if (first) result += `) ${first}`;
        if (second) result += `-${second}`;
        return result;
      });
    }
    e.target.value = value;
  });
}

// ──────────────────────────────────────────
// INICIALIZAÇÃO GERAL
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Notify.init();
  applyConfig();
  Pages.init();
  DarkMode.init();        // NOVO
  BackupReminder.init();  // NOVO

  // Verificar agendamentos próximos a cada 5 minutos
  checkUpcomingAppointments();
  setInterval(checkUpcomingAppointments, 5 * 60 * 1000);

  // Contador de agendamentos no badge da sidebar
  const badge = document.getElementById('agBadge');
  if (badge) {
    const count = DB.getAgendamentosHoje().filter(a => a.status === 'agendado').length;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }
  
  // Aplicar máscara de telefone em todos os campos de telefone existentes
  document.querySelectorAll('input[type="tel"], input[id$="Telefone"]').forEach(setupPhoneMask);
});