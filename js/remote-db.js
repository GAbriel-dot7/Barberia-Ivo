/* RemoteDB
   Wrapper simples para usar Supabase REST quando configurado ou cair para o LocalStorage (DB).
   Implementação inicial: operações básicas CRUD para as tabelas usadas pelo sistema.
*/

const RemoteDB = {
  configured: false,
  url: '',
  anonKey: '',

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

  // CONFIG
  async getConfig() {
    if (!this.initFromConfig()) return DB.getConfig();
    try {
      const rows = await this._api('configuracoes', 'GET', null, 'select=*');
      return (rows && rows.length) ? rows[0] : DB.getConfig();
    } catch (e) { return DB.getConfig(); }
  },

  async saveConfig(cfg) {
    if (!this.initFromConfig()) return DB.saveConfig(cfg);
    try {
      // Upsert by inserting and letting unique constraint handle it would require PK; keep simple: try update all rows via RPC not available here.
      // For now, update by id if present, otherwise insert.
      if (cfg.id) {
        await this._api('configuracoes', 'PATCH', cfg, `id=eq.${encodeURIComponent(cfg.id)}`);
      } else {
        await this._api('configuracoes', 'POST', cfg, '');
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
      return await this._api(table, 'GET', null, 'select=*');
    } catch (e) { return DB['get' + table.charAt(0).toUpperCase() + table.slice(1)] ? DB['get' + table.charAt(0).toUpperCase() + table.slice(1)]() : []; }
  },

  async _save(table, item) {
    if (!this.initFromConfig()) return DB['save' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)] ? DB['save' + table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)](item) : item;
    try {
      if (item.id) {
        const res = await this._api(table, 'PATCH', item, `id=eq.${encodeURIComponent(item.id)}`);
        return Array.isArray(res) && res[0] ? res[0] : item;
      } else {
        const res = await this._api(table, 'POST', item, '');
        return Array.isArray(res) && res[0] ? res[0] : item;
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
    try { return await this._api('usuarios', 'GET', null, 'select=*'); } catch (e) { return Auth.getUsuarios(); }
  },

  async saveUsuario(u) {
    if (!this.initFromConfig()) return Auth.saveUsuario ? Auth.saveUsuario(u) : u;
    try {
      if (u.id) {
        const res = await this._api('usuarios', 'PATCH', u, `id=eq.${encodeURIComponent(u.id)}`);
        return Array.isArray(res) && res[0] ? res[0] : u;
      } else {
        const res = await this._api('usuarios', 'POST', u, '');
        return Array.isArray(res) && res[0] ? res[0] : u;
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
      const clientes = await this.getClientes();
      const servicos = await this.getServicos();
      const agendamentos = await this.getAgendamentos();
      const historico = await this.getHistorico();
      const usuarios = await this.getUsuarios();
      // Import into local DB for offline mode
      DB.importData({ config: await this.getConfig(), clientes, servicos, agendamentos, historico });
      if (Auth.importUsuarios) Auth.importUsuarios(usuarios || []);
      return true;
    } catch (e) { return false; }
  }
};

// Initialize on load to detect configuration
document.addEventListener('DOMContentLoaded', () => RemoteDB.initFromConfig());
