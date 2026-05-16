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
    this.set(this.KEYS.CONFIG, config);
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
    this.set(this.KEYS.CLIENTES, clientes);
    this._cache.CLIENTES = clientes;
    return cliente;
  },

  deleteCliente(id) {
    const clientes = this.getClientes().filter(c => c.id !== id);
    this.set(this.KEYS.CLIENTES, clientes);
    this._cache.CLIENTES = clientes;
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
    this.set(this.KEYS.SERVICOS, servicos);
    this._cache.SERVICOS = servicos;
    return servico;
  },

  deleteServico(id) {
    const servicos = this.getServicos().filter(s => s.id !== id);
    this.set(this.KEYS.SERVICOS, servicos);
    this._cache.SERVICOS = servicos;
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
    this.set(this.KEYS.AGENDAMENTOS, ags);
    this._cache.AGENDAMENTOS = ags;
    return ag;
  },

  deleteAgendamento(id) {
    const ags = this.getAgendamentos().filter(a => a.id !== id);
    this.set(this.KEYS.AGENDAMENTOS, ags);
    this._cache.AGENDAMENTOS = ags;
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
  // SEED (Dados de Demonstração)
  // ──────────────────────────────────────────
  seedDemoData() {
    if (this.getClientes().length > 0) return; // Já tem dados

    // Clientes demo
    const clientes = [
      { nome: 'Ana Paula Silva', telefone: '(11) 98765-4321', email: 'ana@email.com', obs: 'Cliente VIP' },
      { nome: 'Carlos Mendes', telefone: '(11) 91234-5678', email: 'carlos@email.com', obs: '' },
      { nome: 'Mariana Costa', telefone: '(11) 99876-5432', email: 'mari@email.com', obs: 'Prefere tarde' },
      { nome: 'Roberto Lima', telefone: '(11) 97654-3210', email: 'roberto@email.com', obs: '' },
      { nome: 'Fernanda Souza', telefone: '(11) 96543-2109', email: 'fe@email.com', obs: 'Alérgica a amônia' },
    ];
    const clientesIds = [];
    clientes.forEach(c => {
      const saved = this.saveCliente(c);
      clientesIds.push(saved.id);
    });

    // Serviços demo
    const servicos = [
      { nome: 'Corte de Cabelo', preco: '35.00', duracao: '30', descricao: 'Corte masculino completo' },
      { nome: 'Barba', preco: '25.00', duracao: '20', descricao: 'Aparagem e hidratação' },
      { nome: 'Corte + Barba', preco: '55.00', duracao: '50', descricao: 'Combo completo' },
      { nome: 'Hidratação', preco: '45.00', duracao: '40', descricao: 'Tratamento capilar' },
      { nome: 'Coloração', preco: '80.00', duracao: '90', descricao: 'Coloração completa' },
    ];
    const servicosIds = [];
    servicos.forEach(s => {
      const saved = this.saveServico(s);
      servicosIds.push(saved.id);
    });

    // Agendamentos para hoje
    const hoje = new Date().toISOString().slice(0, 10);
    const agendamentosDemos = [
      { clienteId: clientesIds[0], servicoId: servicosIds[0], data: hoje, hora: '09:00', valor: '35.00', status: 'agendado', observacao: '' },
      { clienteId: clientesIds[1], servicoId: servicosIds[2], data: hoje, hora: '10:00', valor: '55.00', status: 'concluido', observacao: '' },
      { clienteId: clientesIds[2], servicoId: servicosIds[3], data: hoje, hora: '11:30', valor: '45.00', status: 'agendado', observacao: 'Trazer amostras' },
      { clienteId: clientesIds[3], servicoId: servicosIds[1], data: hoje, hora: '14:00', valor: '25.00', status: 'agendado', observacao: '' },
      { clienteId: clientesIds[4], servicoId: servicosIds[4], data: hoje, hora: '16:00', valor: '80.00', status: 'agendado', observacao: '' },
    ];
    agendamentosDemos.forEach(a => this.saveAgendamento(a));

    // Histórico (mês atual)
    const histEntries = [
      { clienteId: clientesIds[0], servicoId: servicosIds[0], valor: 35, data: hoje, hora: '09:00' },
      { clienteId: clientesIds[1], servicoId: servicosIds[2], valor: 55, data: hoje, hora: '10:00' },
      { clienteId: clientesIds[2], servicoId: servicosIds[0], valor: 35, data: hoje, hora: '11:00' },
      { clienteId: clientesIds[3], servicoId: servicosIds[3], valor: 45, data: hoje, hora: '14:00' },
      { clienteId: clientesIds[4], servicoId: servicosIds[4], valor: 80, data: hoje, hora: '16:00' },
    ];
    histEntries.forEach(h => this.addHistorico(h));

    // Config padrão
    this.saveConfig({
      nome: 'Studio Barber',
      slogan: 'Estilo é tudo',
      cor: '#2563EB',
      owner: 'João',
      emoji: '✂️',
      modulos: { duracao: true, historico: true, agendamentos: true }
    });
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
