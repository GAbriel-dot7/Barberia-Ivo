/**
 * ============================================================
 *  SGCM — Módulo: Menu Mobile (Hamburguer / Drawer)
 *  Arquivo: js/mobile.js
 *
 *  Responsabilidades:
 *    • Abrir / fechar a sidebar em dispositivos móveis
 *    • Animar o ícone hamburguer ↔ X
 *    • Exibir / ocultar o overlay escuro de fundo
 *    • Fechar com clique no overlay, tecla ESC, ou swipe ←
 *    • Travar o scroll do body enquanto a sidebar está aberta
 *    • Fechar automaticamente ao selecionar uma rota no menu
 *    • Reposicionar corretamente ao girar o dispositivo
 *
 *  Dependências: nenhuma (vanilla JS puro)
 *  Inclua após ui.js em todas as páginas.
 * ============================================================
 */

const MobileMenu = (() => {

  // ── Referências do DOM ────────────────────────────────────
  let sidebar  = null;
  let overlay  = null;
  let toggle   = null;
  let isOpen   = false;

  // ── Controle de touch (swipe) ─────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;

  // ─────────────────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────────────────
  function init() {
    sidebar = document.getElementById('sidebar');
    overlay = document.getElementById('sidebarOverlay');
    toggle  = document.getElementById('menuToggle');

    if (!sidebar || !overlay || !toggle) {
      console.warn('[MobileMenu] Elementos não encontrados. Verifique: sidebar, sidebarOverlay, menuToggle.');
      return;
    }

    _bindToggleButton();
    _bindOverlayClick();
    _bindKeyboard();
    _bindNavItems();
    _bindSwipe();
    _bindOrientationChange();
  }

  // ─────────────────────────────────────────────────────────
  //  OPEN
  // ─────────────────────────────────────────────────────────
  function open() {
    if (isOpen) return;
    isOpen = true;

    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    toggle.classList.add('is-open');

    toggle.setAttribute('aria-expanded', 'true');
    sidebar.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');

    // Trava scroll do fundo enquanto drawer está aberto
    document.body.style.overflow = 'hidden';
  }

  // ─────────────────────────────────────────────────────────
  //  CLOSE
  // ─────────────────────────────────────────────────────────
  function close() {
    if (!isOpen) return;
    isOpen = false;

    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    toggle.classList.remove('is-open');

    toggle.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    document.body.style.overflow = '';
  }

  // ─────────────────────────────────────────────────────────
  //  BINDINGS
  // ─────────────────────────────────────────────────────────

  function _bindToggleButton() {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen ? close() : open();
    });
  }

  function _bindOverlayClick() {
    overlay.addEventListener('click', close);
  }

  function _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
        toggle.focus(); // Devolve foco (acessibilidade)
      }
    });
  }

  function _bindNavItems() {
    sidebar.querySelectorAll('a.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) close();
      });
    });
  }

  function _bindSwipe() {
    sidebar.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    sidebar.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      // Swipe para a esquerda: > 50px horizontal, mais horizontal que vertical
      if (dx < -50 && dy < Math.abs(dx) * 0.8) close();
    }, { passive: true });
  }

  function _bindOrientationChange() {
    window.addEventListener('resize', _debounce(() => {
      if (window.innerWidth > 768 && isOpen) {
        isOpen = false;
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    }, 150));
  }

  // ─────────────────────────────────────────────────────────
  //  UTILITÁRIO
  // ─────────────────────────────────────────────────────────
  function _debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // API pública
  return { init, open, close };

})();

document.addEventListener('DOMContentLoaded', () => MobileMenu.init());
