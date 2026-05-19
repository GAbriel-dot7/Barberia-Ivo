/**
 * SGCM — Módulo de Autenticação e Funcionários
 */

const Auth = {
  // Chaves do localStorage
  KEYS: {
    USUARIOS: 'sgcm_usuarios',
    SESSION: 'sgcm_session'
  },

  // Níveis de acesso
  ROLES: {
    ADMIN: 'admin',
    ATENDENTE: 'atendente'
  },

  // Inicialização
  init() {
    this.createDefaultUsers();
    this.checkSession();
    this.setupLoginForm();
    this.applyRoleBasedUI();
  },

  // For deployments without a login page, these methods are no-ops
  setupLoginForm() {
    // intentionally left blank when login page is not used
    return;
  },

  checkSession() {
    // no-op: system intentionally runs without login page
    return;
  },

  // Cria usuários padrão se não existirem
  createDefaultUsers() {
    const usuarios = this.getUsuarios();
    if (usuarios.length === 0) {
      const defaultUsers = [
        {
          id: this._genId(),
          nome: 'Administrador',
          email: 'admin@sistema.com',
          senha: this._hashPassword('admin123'),
          role: this.ROLES.ADMIN,
          comissao: 0,
          ativo: true,
          createdAt: new Date().toISOString()
        },
        {
          id: this._genId(),
          nome: 'Atendente',
          email: 'atendente@sistema.com',
          senha: this._hashPassword('atendente123'),
          role: this.ROLES.ATENDENTE,
          comissao: 5, // 5% de comissão
          ativo: true,
          createdAt: new Date().toISOString()
        }
      ];
      this.set(this.KEYS.USUARIOS, defaultUsers);
    }
  },

  getUsuarios() {
    return this.get(this.KEYS.USUARIOS) || [];
  },

  exportUsuarios() {
    return this.getUsuarios();
  },

  importUsuarios(usuarios = []) {
    if (!Array.isArray(usuarios)) return false;
    this.set(this.KEYS.USUARIOS, usuarios);
    return true;
  },

  saveUsuario(usuario) {
    const usuarios = this.getUsuarios();
    if (usuario.id) {
      const idx = usuarios.findIndex(u => u.id === usuario.id);
      if (idx !== -1) usuarios[idx] = { ...usuarios[idx], ...usuario };
    } else {
      usuario.id = this._genId();
      usuario.createdAt = new Date().toISOString();
      usuario.senha = this._hashPassword(usuario.senha);
      usuarios.push(usuario);
    }
    this.set(this.KEYS.USUARIOS, usuarios);
    return usuario;
  },

  deleteUsuario(id) {
    const usuarios = this.getUsuarios().filter(u => u.id !== id);
    this.set(this.KEYS.USUARIOS, usuarios);
  },

  login(email, senha) {
    const usuarios = this.getUsuarios();
    const senhaHash = this._hashPassword(senha);
    const user = usuarios.find(u => u.email === email && u.senha === senhaHash && u.ativo);
    
    if (user) {
      // Remove senha antes de salvar na sessão
      const { senha: _, ...sessionUser } = user;
      this.set(this.KEYS.SESSION, {
        user: sessionUser,
        loggedAt: new Date().toISOString()
      });
      return { success: true, user: sessionUser };
    }
    return { success: false, error: 'Email ou senha inválidos' };
  },

  logout() {
    localStorage.removeItem(this.KEYS.SESSION);
    // Reload to apply role-based UI changes without redirecting to a login page
    window.location.href = 'index.html';
  },

  getCurrentUser() {
    const session = this.get(this.KEYS.SESSION);
    return session?.user || null;
  },

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === this.ROLES.ADMIN;
  },

  isAtendente() {
    const user = this.getCurrentUser();
    return user?.role === this.ROLES.ATENDENTE;
  },

  requireAuth() {
    // Authentication not enforced in this deployment mode
    return true;
  },

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      Notify.error('Acesso negado', 'Você não tem permissão para acessar esta página.');
      return false;
    }
    return true;
  },

  applyRoleBasedUI() {
    const user = this.getCurrentUser();
    if (!user) return;

    // Esconder/mostrar elementos baseado no papel
    const adminOnly = document.querySelectorAll('.admin-only');
    const atendenteOnly = document.querySelectorAll('.atendente-only');

    if (this.isAdmin()) {
      adminOnly.forEach(el => el.style.display = '');
      atendenteOnly.forEach(el => el.style.display = 'none');
    } else {
      adminOnly.forEach(el => el.style.display = 'none');
      atendenteOnly.forEach(el => el.style.display = '');
    }

    // Atualizar nome do usuário na sidebar
    const userNameSpan = document.getElementById('ownerName');
    if (userNameSpan) userNameSpan.textContent = user.nome;

    const userRoleSpan = document.getElementById('userRole');
    if (userRoleSpan) {
      userRoleSpan.textContent = user.role === this.ROLES.ADMIN ? 'Administrador' : 'Atendente';
    }
  },

  setupLoginForm() {
    // No login form available in this mode
    return;
  },

  checkSession() {
    // No session checks when operating without a login page
    return;
  },

  // Helpers
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  _hashPassword(password) {
    // Hash simples (para demo - em produção use bcrypt no backend)
    return btoa(password + 'sgcm_salt');
  },

  _genId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
};

// Middleware de autenticação para páginas
document.addEventListener('DOMContentLoaded', () => {
  // Não bloqueia a página de login
  if (!window.location.pathname.includes('login.html')) {
    Auth.requireAuth();
  }
  Auth.init();
});
