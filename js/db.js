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

  SUPABASE_BOOTSTRAP: {
    url: 'https://ggomwspyrhnvlnjlwnzj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnb213c3B5cmhudmxuamx3bnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDMxMzEsImV4cCI6MjA5NDUxOTEzMX0.Qvw0X0ympxBKG6sI3C0zPfIvEYBXY8J2RfQ-iBqtqkA',
    bucket: 'ivo',
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

  getSupabaseConfig() {
    const current = this.get(this.KEYS.CONFIG) || {};
    const stored = current.supabase || {};
    if (stored.url && stored.anonKey) {
      return { ...stored };
    }
    return { ...this.SUPABASE_BOOTSTRAP, ...stored };
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
      supabase: this.getSupabaseConfig(),
      modulos: {
        duracao: true,
        historico: true,
        agendamentos: true,
      }
    };
    this._cache.CONFIG = cfg;
    return cfg;
  },

  saveConfig(config, options = {}) {
    const current = this.get(this.KEYS.CONFIG) || {};
    const merged = { ...current, ...config };
    if (config.supabase == null) {
      merged.supabase = current.supabase || this.getSupabaseConfig();
    }
    // garante timestamp de atualização
    merged.updatedAt = new Date().toISOString();
    this.set(this.KEYS.CONFIG, merged);
    if (!options.skipRemote) {
      // Propaga para RemoteDB via SyncQueue (preferível) ou RemoteDB direto como fallback
      try {
        if (typeof SyncQueue !== 'undefined') {
          SyncQueue.enqueueSave('configuracoes', merged);
        } else if (typeof RemoteDB !== 'undefined' && RemoteDB.initFromConfig()) {
          RemoteDB.saveConfig(merged).catch(() => {});
        }
      } catch (e) {}
    }
    return merged;
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

  mergeData(payload = {}) {
    if (payload.config) {
      const localConfig = this.get(this.KEYS.CONFIG) || {};
      const remoteConfig = payload.config || {};
      const mergedConfig = { ...localConfig, ...remoteConfig };
      if (remoteConfig.supabase == null) {
        mergedConfig.supabase = localConfig.supabase || this.getSupabaseConfig();
      }
      this.set(this.KEYS.CONFIG, mergedConfig);
    }

    const mergeCollection = (key, remoteItems) => {
      if (!Array.isArray(remoteItems)) return;
      const localItems = Array.isArray(this.get(key)) ? this.get(key) : [];
      const merged = this._mergeCollection(localItems, remoteItems);
      this.set(key, merged);
    };

    mergeCollection(this.KEYS.CLIENTES, payload.clientes);
    mergeCollection(this.KEYS.SERVICOS, payload.servicos);
    mergeCollection(this.KEYS.AGENDAMENTOS, payload.agendamentos);
    mergeCollection(this.KEYS.HISTORICO, payload.historico);
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
        supabase: this.getSupabaseConfig(),
        modulos: { duracao: true, historico: true, agendamentos: true }
      });
    }

    return true;
  },

  // ──────────────────────────────────────────
  // INTERNAL UTILS
  // ──────────────────────────────────────────
  _genId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  _isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  },

  migrateLegacyIds() {
    const clientes = this.getClientes();
    const servicos = this.getServicos();
    const agendamentos = this.getAgendamentos();
    const historico = this.getHistorico();
    const usuarios = (typeof Auth !== 'undefined' && typeof Auth.getUsuarios === 'function') ? Auth.getUsuarios() : [];

    const allItems = [...clientes, ...servicos, ...agendamentos, ...historico, ...usuarios];
    if (!allItems.some(item => item && item.id && !this._isUuid(item.id))) {
      return false;
    }

    const mappings = {
      clientes: new Map(),
      servicos: new Map(),
      agendamentos: new Map(),
      historico: new Map(),
      usuarios: new Map(),
    };

    const remap = (table, oldId) => {
      if (!oldId) return '';
      if (this._isUuid(oldId)) return oldId;
      const map = mappings[table];
      if (!map.has(oldId)) {
        map.set(oldId, this._genId());
      }
      return map.get(oldId);
    };

    const migratedClientes = clientes.map(item => ({ ...item, id: remap('clientes', item.id) }));
    const migratedServicos = servicos.map(item => ({ ...item, id: remap('servicos', item.id) }));
    const migratedUsuarios = usuarios.map(item => ({ ...item, id: remap('usuarios', item.id) }));
    const migratedAgendamentos = agendamentos.map(item => ({
      ...item,
      id: remap('agendamentos', item.id),
      clienteId: remap('clientes', item.clienteId),
      servicoId: remap('servicos', item.servicoId),
      funcionarioId: item.funcionarioId ? remap('usuarios', item.funcionarioId) : '',
    }));
    const migratedHistorico = historico.map(item => ({
      ...item,
      id: remap('historico', item.id),
      clienteId: item.clienteId ? remap('clientes', item.clienteId) : '',
      servicoId: item.servicoId ? remap('servicos', item.servicoId) : '',
      funcionarioId: item.funcionarioId ? remap('usuarios', item.funcionarioId) : '',
      agendamentoId: item.agendamentoId ? remap('agendamentos', item.agendamentoId) : '',
    }));

    this.set(this.KEYS.CLIENTES, migratedClientes);
    this.set(this.KEYS.SERVICOS, migratedServicos);
    this.set(this.KEYS.AGENDAMENTOS, migratedAgendamentos);
    this.set(this.KEYS.HISTORICO, migratedHistorico);
    this._cache.CLIENTES = migratedClientes;
    this._cache.SERVICOS = migratedServicos;
    this._cache.AGENDAMENTOS = migratedAgendamentos;
    this._cache.HISTORICO = migratedHistorico;

    if (typeof Auth !== 'undefined' && typeof Auth.importUsuarios === 'function') {
      Auth.importUsuarios(migratedUsuarios);
    }

    return true;
  },

  _itemTimestamp(item) {
    const raw = item?.updatedAt || item?.updated_at || item?.registradoEm || item?.registrado_em || item?.createdAt || item?.created_at || '';
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : 0;
  },

  _pickNewest(localItem, remoteItem) {
    if (!localItem) return remoteItem;
    if (!remoteItem) return localItem;
    const localTime = this._itemTimestamp(localItem);
    const remoteTime = this._itemTimestamp(remoteItem);
    if (remoteTime > localTime) return remoteItem;
    return localItem;
  },

  _mergeCollection(localItems = [], remoteItems = []) {
    const byId = new Map();
    localItems.forEach(item => {
      if (item && item.id != null) byId.set(item.id, item);
    });
    remoteItems.forEach(item => {
      if (!item || item.id == null) return;
      const current = byId.get(item.id);
      byId.set(item.id, this._pickNewest(current, item));
    });
    return Array.from(byId.values()).sort((a, b) => this._itemTimestamp(b) - this._itemTimestamp(a));
  },
};

// Inicializa dados demo se necessário
DB.seedDemoData();
