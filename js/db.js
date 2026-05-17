/**
 * SGCM — Sistema de Gerenciamento Comercial
 * Módulo: Armazenamento e Gerenciamento de Dados (LocalStorage)
 */

const DB = {
  // In-memory cache to avoid reparsing localStorage on every access
  _cache: {
    CONFIG: null,
    CLIENTES: null,
    SERVICOS: null,
    AGENDAMENTOS: null,
    HISTORICO: null,
  },
  // ──────────────────────────────────────────
  // CONFIGURAÇÕES
  // ──────────────────────────────────────────
  KEYS: {
    CONFIG:        'sgcm_config',
    CLIENTES:      'sgcm_clientes',
    SERVICOS:      'sgcm_servicos',
    AGENDAMENTOS:  'sgcm_agendamentos',
    HISTORICO:     'sgcm_historico',
  },

  // ──────────────────────────────────────────
  // HELPERS GENÉRICOS
  // ──────────────────────────────────────────
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // update cache for known keys
      switch (key) {
        case this.KEYS.CONFIG: this._cache.CONFIG = value; break;
        case this.KEYS.CLIENTES: this._cache.CLIENTES = value; break;
        case this.KEYS.SERVICOS: this._cache.SERVICOS = value; break;
        case this.KEYS.AGENDAMENTOS: this._cache.AGENDAMENTOS = value; break;
        case this.KEYS.HISTORICO: this._cache.HISTORICO = value; break;
        default: break;
      }
      return true;
    } catch { return false; }
  },

  // ──────────────────────────────────────────
  // CONFIGURAÇÕES DO NEGÓCIO
  // ──────────────────────────────────────────
  getConfig() {
    if (this._cache.CONFIG) return this._cache.CONFIG;
    const cfg = this.get(this.KEYS.CONFIG) || {
      nome: 'Meu Negócio',
      slogan: 'Bem-vindo ao sistema',
      cor: '#2563EB',
      owner: 'Admin',
      emoji: '🏪',
      modulos: {
        duracao: true,
        historico: true,
        agendamentos: true,
      }
    };
    this._cache.CONFIG = cfg;
    return cfg;
  },

  saveConfig(config) {
    // garante timestamp de atualização
    config.updatedAt = new Date().toISOString();
    this.set(this.KEYS.CONFIG, config);
    // Propaga para RemoteDB via SyncQueue (preferível) ou RemoteDB direto como fallback
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueSave('configuracoes', config);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.saveConfig(config).catch(() => {});
      }
    } catch (e) {}
  },

  // ──────────────────────────────────────────
  // CLIENTES
  // ──────────────────────────────────────────
  getClientes() {
    if (this._cache.CLIENTES) return this._cache.CLIENTES;
    const c = this.get(this.KEYS.CLIENTES) || [];
    this._cache.CLIENTES = c;
    return c;
  },

  saveCliente(cliente) {
    const clientes = this.getClientes();
    if (cliente.id) {
      // Editar existente
      const idx = clientes.findIndex(c => c.id === cliente.id);
      if (idx !== -1) clientes[idx] = { ...clientes[idx], ...cliente };
    } else {
      // Novo
      cliente.id = this._genId();
      cliente.createdAt = new Date().toISOString();
      clientes.unshift(cliente);
    }
    // marca atualização
    cliente.updatedAt = new Date().toISOString();
    this.set(this.KEYS.CLIENTES, clientes);
    this._cache.CLIENTES = clientes;
    // Propaga para RemoteDB via SyncQueue (preferível) ou RemoteDB direto como fallback
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueSave('clientes', cliente);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.saveCliente(cliente).catch(() => {});
      }
    } catch (e) {}
    return cliente;
  },

  deleteCliente(id) {
    const clientes = this.getClientes().filter(c => c.id !== id);
    this.set(this.KEYS.CLIENTES, clientes);
    this._cache.CLIENTES = clientes;
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueDelete('clientes', id);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.deleteCliente(id).catch(() => {});
      }
    } catch (e) {}
  },

  getClienteById(id) {
    return this.getClientes().find(c => c.id === id) || null;
  },

  // ──────────────────────────────────────────
  // SERVIÇOS
  // ──────────────────────────────────────────
  getServicos() {
    if (this._cache.SERVICOS) return this._cache.SERVICOS;
    const s = this.get(this.KEYS.SERVICOS) || [];
    this._cache.SERVICOS = s;
    return s;
  },

  saveServico(servico) {
    const servicos = this.getServicos();
    if (servico.id) {
      const idx = servicos.findIndex(s => s.id === servico.id);
      if (idx !== -1) servicos[idx] = { ...servicos[idx], ...servico };
    } else {
      servico.id = this._genId();
      servico.createdAt = new Date().toISOString();
      servicos.unshift(servico);
    }
    servico.updatedAt = new Date().toISOString();
    this.set(this.KEYS.SERVICOS, servicos);
    this._cache.SERVICOS = servicos;
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueSave('servicos', servico);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.saveServico(servico).catch(() => {});
      }
    } catch (e) {}
    return servico;
  },

  deleteServico(id) {
    const servicos = this.getServicos().filter(s => s.id !== id);
    this.set(this.KEYS.SERVICOS, servicos);
    this._cache.SERVICOS = servicos;
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueDelete('servicos', id);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.deleteServico(id).catch(() => {});
      }
    } catch (e) {}
  },

  getServicoPorId(id) {
    return this.getServicos().find(s => s.id === id) || null;
  },

  // ──────────────────────────────────────────
  // AGENDAMENTOS
  // ──────────────────────────────────────────
  getAgendamentos() {
    if (this._cache.AGENDAMENTOS) return this._cache.AGENDAMENTOS;
    const a = this.get(this.KEYS.AGENDAMENTOS) || [];
    this._cache.AGENDAMENTOS = a;
    return a;
  },

  saveAgendamento(ag) {
    const ags = this.getAgendamentos();
    if (ag.id) {
      const idx = ags.findIndex(a => a.id === ag.id);
      if (idx !== -1) ags[idx] = { ...ags[idx], ...ag };
    } else {
      ag.id = this._genId();
      ag.createdAt = new Date().toISOString();
      ag.status = ag.status || 'agendado';
      ags.unshift(ag);
    }
    ag.updatedAt = new Date().toISOString();
    this.set(this.KEYS.AGENDAMENTOS, ags);
    this._cache.AGENDAMENTOS = ags;
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueSave('agendamentos', ag);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.saveAgendamento(ag).catch(() => {});
      }
    } catch (e) {}
    return ag;
  },

  deleteAgendamento(id) {
    const ags = this.getAgendamentos().filter(a => a.id !== id);
    this.set(this.KEYS.AGENDAMENTOS, ags);
    this._cache.AGENDAMENTOS = ags;
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueDelete('agendamentos', id);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.deleteAgendamento(id).catch(() => {});
      }
    } catch (e) {}
  },

  getAgendamentosHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.getAgendamentos().filter(a => a.data === hoje);
  },

  concluirAgendamento(id) {
    const ags = this.getAgendamentos();
    const ag = ags.find(a => a.id === id);
    if (!ag) return;
    ag.status = 'concluido';
    this.set(this.KEYS.AGENDAMENTOS, ags);
    this._cache.AGENDAMENTOS = ags;
    // Adiciona ao histórico preservando o vínculo com o funcionário, quando existir
    this.addHistorico({
      clienteId: ag.clienteId,
      servicoId: ag.servicoId,
      funcionarioId: ag.funcionarioId || '',
      valor: ag.valor || 0,
      data: ag.data,
      hora: ag.hora,
      observacao: ag.observacao,
    });
  },

  // ──────────────────────────────────────────
  // HISTÓRICO
  // ──────────────────────────────────────────
  getHistorico() {
    if (this._cache.HISTORICO) return this._cache.HISTORICO;
    const h = this.get(this.KEYS.HISTORICO) || [];
    this._cache.HISTORICO = h;
    return h;
  },

  addHistorico(entry) {
    const hist = this.getHistorico();
    entry.id = this._genId();
    entry.registradoEm = new Date().toISOString();
    hist.unshift(entry);
    this.set(this.KEYS.HISTORICO, hist);
    this._cache.HISTORICO = hist;
    try {
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.enqueueSave('historico', entry);
      } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
        RemoteDB.addHistorico(entry).catch(() => {});
      }
    } catch (e) {}
    return entry;
  },

  // ──────────────────────────────────────────
  // DASHBOARD STATS
  // ──────────────────────────────────────────
  getDashboardStats() {
    const clientes = this.getClientes();
    const agendamentosHoje = this.getAgendamentosHoje();
    const historico = this.getHistorico();
    const servicos = this.getServicos();

    // Receita total do mês
    const mesAtual = new Date().toISOString().slice(0, 7);
    const receitaMes = historico
      .filter(h => h.registradoEm && h.registradoEm.startsWith(mesAtual))
      .reduce((acc, h) => acc + (parseFloat(h.valor) || 0), 0);

    // Serviços mais vendidos
    const servicoCount = {};
    historico.forEach(h => {
      if (!h.servicoId) return;
      servicoCount[h.servicoId] = (servicoCount[h.servicoId] || 0) + 1;
    });
    const topServicos = Object.entries(servicoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        servico: servicos.find(s => s.id === id),
        count,
      }))
      .filter(x => x.servico);

    // Atendimentos do dia (concluídos)
    const concluidosHoje = agendamentosHoje.filter(a => a.status === 'concluido').length;

    return {
      totalClientes: clientes.length,
      agendamentosHoje: agendamentosHoje.length,
      concluidosHoje,
      receitaMes,
      topServicos,
      agendamentosHojeList: agendamentosHoje
        .sort((a, b) => a.hora > b.hora ? 1 : -1),
    };
  },

  exportData() {
    return {
      config: this.getConfig(),
      clientes: this.getClientes(),
      servicos: this.getServicos(),
      agendamentos: this.getAgendamentos(),
      historico: this.getHistorico(),
    };
  },

  importData(payload = {}) {
    if (payload.config) this.saveConfig(payload.config);
    if (Array.isArray(payload.clientes)) {
      this.set(this.KEYS.CLIENTES, payload.clientes);
      this._cache.CLIENTES = payload.clientes;
    }
    if (Array.isArray(payload.servicos)) {
      this.set(this.KEYS.SERVICOS, payload.servicos);
      this._cache.SERVICOS = payload.servicos;
    }
    if (Array.isArray(payload.agendamentos)) {
      this.set(this.KEYS.AGENDAMENTOS, payload.agendamentos);
      this._cache.AGENDAMENTOS = payload.agendamentos;
    }
    if (Array.isArray(payload.historico)) {
      this.set(this.KEYS.HISTORICO, payload.historico);
      this._cache.HISTORICO = payload.historico;
    }
    return true;
  },

  // ──────────────────────────────────────────
  // SEED (Preparar para Barbearia Ivo & Lucas)
  // ──────────────────────────────────────────
  seedDemoData() {
    // Apenas inicializa se não houver dados previos (evita apagar dados do usuário)
    const hasClientes = Array.isArray(this.get(this.KEYS.CLIENTES)) && this.get(this.KEYS.CLIENTES).length > 0;
    const hasServicos = Array.isArray(this.get(this.KEYS.SERVICOS)) && this.get(this.KEYS.SERVICOS).length > 0;
    const hasAg = Array.isArray(this.get(this.KEYS.AGENDAMENTOS)) && this.get(this.KEYS.AGENDAMENTOS).length > 0;
    const hasHist = Array.isArray(this.get(this.KEYS.HISTORICO)) && this.get(this.KEYS.HISTORICO).length > 0;
    if (hasClientes || hasServicos || hasAg || hasHist) return false;

    // Se não houver dados, cria uma configuração inicial mínima para o negócio
    const existingCfg = this.get(this.KEYS.CONFIG) || {};
    if (!existingCfg.nome) {
      this.saveConfig({
        nome: 'Barbearia Ivo & Lucas',
        slogan: 'Tradição e estilo',
        cor: '#b91c1c',
        owner: 'Ivo & Lucas',
        emoji: '💈',
        modulos: { duracao: true, historico: true, agendamentos: true }
      });
    }

    return true;
  },

  // ──────────────────────────────────────────
  // INTERNAL UTILS
  // ──────────────────────────────────────────
  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },
};

// Inicializa dados demo se necessário
DB.seedDemoData();
