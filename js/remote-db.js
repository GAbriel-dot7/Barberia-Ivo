/* RemoteDB
   Wrapper simples para usar Supabase REST quando configurado ou cair para o LocalStorage (DB).
   Implementação inicial: operações básicas CRUD para as tabelas usadas pelo sistema.
*/

const RemoteDB = {
  configured: false,
  url: '',
  anonKey: '',

  _toSupabase(table, item = {}) {
    if (!item) return item;
    switch (table) {
      case 'clientes':
        return {
          id: item.id,
          nome: item.nome,
          telefone: item.telefone || '',
          email: item.email || '',
          obs: item.obs || '',
          deleted_at: item.deletedAt || item.deleted_at || null,
        };
      case 'servicos':
        return {
          id: item.id,
          nome: item.nome,
          preco: item.preco ?? 0,
          duracao: item.duracao ?? 0,
          descricao: item.descricao || '',
          ativo: item.ativo ?? true,
          deleted_at: item.deletedAt || item.deleted_at || null,
        };
      case 'agendamentos':
        return {
          id: item.id,
          cliente_id: item.clienteId || item.cliente_id,
          servico_id: item.servicoId || item.servico_id,
          funcionario_id: item.funcionarioId || item.funcionario_id || null,
          data: item.data,
          hora: item.hora,
          valor: item.valor ?? 0,
          status: item.status || 'agendado',
          observacao: item.observacao || '',
          deleted_at: item.deletedAt || item.deleted_at || null,
        };
      case 'historico':
        return {
          id: item.id,
          cliente_id: item.clienteId || item.cliente_id || null,
          servico_id: item.servicoId || item.servico_id || null,
          funcionario_id: item.funcionarioId || item.funcionario_id || null,
          agendamento_id: item.agendamentoId || item.agendamento_id || null,
          valor: item.valor ?? 0,
          data: item.data,
          hora: item.hora,
          observacao: item.observacao || '',
          registrado_em: item.registradoEm || item.registrado_em || item.created_at || null,
        };
      case 'usuarios':
        return {
          id: item.id,
          auth_user_id: item.authUserId || item.auth_user_id || null,
          nome: item.nome,
          email: item.email,
          role: item.role || 'atendente',
          comissao: item.comissao ?? 0,
          ativo: item.ativo ?? true,
        };
      case 'configuracoes':
        return {
          id: item.id,
          nome: item.nome,
          slogan: item.slogan,
          cor: item.cor,
          owner: item.owner,
          emoji: item.emoji,
          modulos: item.modulos || { duracao: true, historico: true, agendamentos: true },
        };
      default:
        return item;
    }
  },

  _fromSupabase(table, row = {}) {
    if (!row) return row;
    switch (table) {
      case 'clientes':
        return {
          id: row.id,
          nome: row.nome,
          telefone: row.telefone || '',
          email: row.email || '',
          obs: row.obs || '',
          deletedAt: row.deleted_at || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      case 'servicos':
        return {
          id: row.id,
          nome: row.nome,
          preco: row.preco,
          duracao: row.duracao,
          descricao: row.descricao || '',
          ativo: row.ativo ?? true,
          deletedAt: row.deleted_at || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      case 'agendamentos':
        return {
          id: row.id,
          clienteId: row.cliente_id,
          servicoId: row.servico_id,
          funcionarioId: row.funcionario_id || '',
          data: row.data,
          hora: row.hora,
          valor: row.valor,
          status: row.status,
          observacao: row.observacao || '',
          deletedAt: row.deleted_at || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      case 'historico':
        return {
          id: row.id,
          clienteId: row.cliente_id || '',
          servicoId: row.servico_id || '',
          funcionarioId: row.funcionario_id || '',
          agendamentoId: row.agendamento_id || '',
          valor: row.valor,
          data: row.data,
          hora: row.hora,
          observacao: row.observacao || '',
          registradoEm: row.registrado_em || row.created_at,
        };
      case 'usuarios':
        return {
          id: row.id,
          authUserId: row.auth_user_id || null,
          nome: row.nome,
          email: row.email,
          role: row.role,
          comissao: row.comissao,
          ativo: row.ativo,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      case 'configuracoes':
        return {
          id: row.id,
          nome: row.nome,
          slogan: row.slogan,
          cor: row.cor,
          owner: row.owner,
          emoji: row.emoji,
          modulos: row.modulos || {},
        };
      default:
        return row;
    }
  },

  initFromConfig() {
    try {
      const cfg = DB.getConfig() || {};
      const sup = cfg.supabase || {};
      if (sup.url && sup.anonKey) {
        this.url = sup.url.replace(/\/$/, '');
        this.anonKey = sup.anonKey;
        this.configured = true;
      } else {
        this.configured = false;
      }
    } catch (e) {
      this.configured = false;
    }
    return this.configured;
  },

  _headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.anonKey,
      'Authorization': 'Bearer ' + this.anonKey,
      'Prefer': 'return=representation'
    };
  },

  async _api(table, method = 'GET', body = null, filter = '') {
    if (!this.configured) throw new Error('RemoteDB not configured');
    const url = `${this.url}/rest/v1/${table}${filter ? `?${filter}` : '?select=*'}`;
    const opts = { method, headers: this._headers() };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    // Some endpoints (DELETE) return empty body
    try { return await res.json(); } catch { return null; }
  },

  async _getSingle(table) {
    const rows = await this._api(table, 'GET', null, 'select=*');
    return (Array.isArray(rows) && rows.length) ? this._fromSupabase(table, rows[0]) : null;
  },

  // CONFIG
  async getConfig() {
    if (!this.initFromConfig()) return DB.getConfig();
    try {
      const row = await this._getSingle('configuracoes');
      return row ? this._fromSupabase('configuracoes', row) : DB.getConfig();
    } catch (e) { return DB.getConfig(); }
  },

  async saveConfig(cfg) {
    if (!this.initFromConfig()) return DB.saveConfig(cfg);
    try {
      const payload = this._toSupabase('configuracoes', cfg);
      const existing = await this._api('configuracoes', 'GET', null, 'select=id');
      if (Array.isArray(existing) && existing.length) {
        const targetId = cfg.id || existing[0].id;
        await this._api('configuracoes', 'PATCH', payload, `id=eq.${encodeURIComponent(targetId)}`);
      } else {
        await this._api('configuracoes', 'POST', payload, '');
      }
      return true;
    } catch (e) {
      return DB.saveConfig(cfg);
    }
  },

  // GENERIC LIST / SAVE / DELETE pattern
  async _list(table) {
    if (!this.initFromConfig()) return DB['get' + table.charAt(0).toUpperCase() + table.slice(1)] ? DB['get' + table.charAt(0).toUpperCase() + table.slice(1)]() : [];
    try {
      const rows = await this._api(table, 'GET', null, 'select=*');
      return Array.isArray(rows) ? rows.map(row => this._fromSupabase(table, row)) : [];
    } catch (e) { return DB['get' + table.charAt(0).toUpperCase() + table.slice(1)] ? DB['get' + table.charAt(0).toUpperCase() + table.slice(1)]() : []; }
  },

  async _save(table, item) {
    if (!this.initFromConfig()) return DB['save' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)] ? DB['save' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)](item) : item;
    try {
      const payload = this._toSupabase(table, item);
      if (item.id) {
        const res = await this._api(table, 'PATCH', payload, `id=eq.${encodeURIComponent(item.id)}`);
        return Array.isArray(res) && res[0] ? this._fromSupabase(table, res[0]) : item;
      } else {
        const res = await this._api(table, 'POST', payload, '');
        return Array.isArray(res) && res[0] ? this._fromSupabase(table, res[0]) : item;
      }
    } catch (e) { return DB['save' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)] ? DB['save' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)](item) : item; }
  },

  async _delete(table, id) {
    if (!this.initFromConfig()) return DB['delete' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)] ? DB['delete' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)](id) : null;
    try {
      await this._api(table, 'DELETE', null, `id=eq.${encodeURIComponent(id)}`);
      return true;
    } catch (e) { return false; }
  },

  // CLIENTES
  async getClientes() { return await this._list('clientes'); },
  async saveCliente(c) { return await this._save('clientes', c); },
  async deleteCliente(id) { return await this._delete('clientes', id); },

  // SERVICOS
  async getServicos() { return await this._list('servicos'); },
  async saveServico(s) { return await this._save('servicos', s); },
  async deleteServico(id) { return await this._delete('servicos', id); },

  // AGENDAMENTOS
  async getAgendamentos() { return await this._list('agendamentos'); },
  async saveAgendamento(a) { return await this._save('agendamentos', a); },
  async deleteAgendamento(id) { return await this._delete('agendamentos', id); },

  // HISTORICO
  async getHistorico() { return await this._list('historico'); },
  async addHistorico(h) { return await this._save('historico', h); },

  // USUARIOS - basic import/export helper (local fallback exists)
  async getUsuarios() {
    if (!this.initFromConfig()) return Auth.getUsuarios();
    try {
      const rows = await this._api('usuarios', 'GET', null, 'select=*');
      return Array.isArray(rows) ? rows.map(row => this._fromSupabase('usuarios', row)) : [];
    } catch (e) { return Auth.getUsuarios(); }
  },

  async saveUsuario(u) {
    if (!this.initFromConfig()) return Auth.saveUsuario ? Auth.saveUsuario(u) : u;
    try {
      const payload = this._toSupabase('usuarios', u);
      if (u.id) {
        const res = await this._api('usuarios', 'PATCH', payload, `id=eq.${encodeURIComponent(u.id)}`);
        return Array.isArray(res) && res[0] ? this._fromSupabase('usuarios', res[0]) : u;
      } else {
        const res = await this._api('usuarios', 'POST', payload, '');
        return Array.isArray(res) && res[0] ? this._fromSupabase('usuarios', res[0]) : u;
      }
    } catch (e) { return Auth.saveUsuario ? Auth.saveUsuario(u) : u; }
  },

  async deleteUsuario(id) {
    if (!this.initFromConfig()) return Auth.deleteUsuario ? Auth.deleteUsuario(id) : null;
    try {
      await this._api('usuarios', 'DELETE', null, `id=eq.${encodeURIComponent(id)}`);
      return true;
    } catch (e) { return false; }
  },

  // Pull remote data and import locally (used by sync pull)
  async pullAndImportAll() {
    if (!this.initFromConfig()) return false;
    try {
      if (typeof SyncQueue !== 'undefined') {
        await SyncQueue.processQueue();
      }
      const clientes = await this.getClientes();
      const servicos = await this.getServicos();
      const agendamentos = await this.getAgendamentos();
      const historico = await this.getHistorico();
      const usuarios = await this.getUsuarios();
      // Merge remoto com o local, preservando o que foi atualizado mais recentemente em cada dispositivo
      if (DB.mergeData) {
        DB.mergeData({ config: await this.getConfig(), clientes, servicos, agendamentos, historico });
      } else {
        DB.importData({ config: await this.getConfig(), clientes, servicos, agendamentos, historico });
      }
      if (Auth.importUsuarios) Auth.importUsuarios(usuarios || []);
      return true;
    } catch (e) { return false; }
  }
};

// Initialize on load to detect configuration
document.addEventListener('DOMContentLoaded', () => RemoteDB.initFromConfig());
