/* Realtime — Supabase subscriptions to keep local DB in sync
   Fase 1: inicializar cliente e configurar subscrições básicas para aplicar mudanças
*/

const Realtime = {
  client: null,
  channels: {},
  enabled: false,

  init() {
    try {
      const cfg = DB.getConfig() || {};
      const sup = cfg.supabase || {};
      if (!sup.url || !sup.anonKey) return false;
      if (typeof supabase === 'undefined') {
        console.warn('Supabase UMD não carregado; Realtime não inicializado');
        return false;
      }

      this.client = supabase.createClient(sup.url.replace(/\/$/, ''), sup.anonKey);
      this.enabled = true;
      this.subscribeAll();
      return true;
    } catch (e) {
      console.error('Realtime init error', e);
      return false;
    }
  },

  subscribeAll() {
    if (!this.enabled || !this.client) return;
    const tables = ['clientes', 'servicos', 'agendamentos', 'historico', 'configuracoes', 'usuarios'];
    tables.forEach(table => this.subscribeTable(table));
  },

  subscribeTable(table) {
    if (!this.enabled || !this.client) return;
    if (this.channels[table]) return; // já inscrito

    try {
      const channel = this.client.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          try {
            const ev = payload.eventType || payload.event || (payload.type && payload.type.toUpperCase()) || 'UNKNOWN';
            const row = payload.new || payload.record || payload.data || null;
            const old = payload.old || payload.previous || null;

            if (!row && ev === 'DELETE') {
              // some payloads include only old/previous
              const id = old && (old.id || old.ID);
              if (id) this._applyDelete(table, id);
              return;
            }

            if (row) {
              // convert DB row -> app object
              const obj = RemoteDB._fromSupabase(table, row);
              if (ev === 'DELETE' || obj.deletedAt) {
                this._applyDelete(table, obj.id);
              } else {
                this._applyUpsert(table, obj);
              }
            }
          } catch (err) { console.error('Realtime payload handling error', err); }
        })
        .subscribe();

      this.channels[table] = channel;
    } catch (e) {
      console.error('subscribeTable error', table, e);
    }
  },

  _applyUpsert(table, obj) {
    try {
      // Evita aplicar mudanças originadas localmente (eco)
      if (this._isLocalEcho(table, obj)) return;

      switch (table) {
        case 'clientes': DB.saveCliente(obj); break;
        case 'servicos': DB.saveServico(obj); break;
        case 'agendamentos': DB.saveAgendamento(obj); break;
        case 'historico': DB.addHistorico(obj); break;
        case 'configuracoes': DB.saveConfig(obj); break;
        case 'usuarios': if (Auth.saveUsuario) Auth.saveUsuario(obj); break;
        default: break;
      }
      // trigger UI refresh if available
      if (typeof renderDashboard === 'function') renderDashboard();
    } catch (e) { console.error('applyUpsert error', e); }
  },

  _applyDelete(table, id) {
    try {
      // Evita apagar localmente se já não existir
      const exists = this._localExists(table, id);
      if (!exists) return;

      switch (table) {
        case 'clientes': DB.deleteCliente(id); break;
        case 'servicos': DB.deleteServico(id); break;
        case 'agendamentos': DB.deleteAgendamento(id); break;
        case 'historico': /* histórico normalmente não deleta */ break;
        case 'configuracoes': /* ignorar */ break;
        case 'usuarios': if (Auth.deleteUsuario) Auth.deleteUsuario(id); break;
        default: break;
      }
      if (typeof renderDashboard === 'function') renderDashboard();
    } catch (e) { console.error('applyDelete error', e); }
  }
  ,

  _isLocalEcho(table, obj) {
    try {
      if (!obj || !obj.id) return false;
      switch (table) {
        case 'clientes': {
          const local = DB.getClienteById(obj.id);
          return local && local.updatedAt && obj.updatedAt && local.updatedAt === obj.updatedAt;
        }
        case 'servicos': {
          const local = DB.getServicoPorId(obj.id);
          return local && local.updatedAt && obj.updatedAt && local.updatedAt === obj.updatedAt;
        }
        case 'agendamentos': {
          const local = DB.getAgendamentos().find(a => a.id === obj.id);
          return local && local.updatedAt && obj.updatedAt && local.updatedAt === obj.updatedAt;
        }
        case 'historico': {
          const local = DB.getHistorico().find(h => h.id === obj.id);
          // histórico usa registradoEm
          return local && local.registradoEm && obj.registradoEm && local.registradoEm === obj.registradoEm;
        }
        case 'configuracoes': {
          const local = DB.getConfig();
          return local && local.updatedAt && obj.updatedAt && local.updatedAt === obj.updatedAt;
        }
        case 'usuarios': {
          if (!Auth.getUsuarios) return false;
          const list = Auth.getUsuarios();
          const local = Array.isArray(list) ? list.find(u => u.id === obj.id) : null;
          return local && local.updatedAt && obj.updatedAt && local.updatedAt === obj.updatedAt;
        }
        default: return false;
      }
    } catch (e) { return false; }
  },

  _localExists(table, id) {
    try {
      if (!id) return false;
      switch (table) {
        case 'clientes': return !!DB.getClienteById(id);
        case 'servicos': return !!DB.getServicoPorId(id);
        case 'agendamentos': return !!DB.getAgendamentos().find(a => a.id === id);
        case 'historico': return !!DB.getHistorico().find(h => h.id === id);
        case 'usuarios': if (!Auth.getUsuarios) return false; return !!Auth.getUsuarios().find(u => u.id === id);
        default: return false;
      }
    } catch (e) { return false; }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    // inicializa Realtime se houver configuração
    setTimeout(() => Realtime.init(), 300);
  } catch (e) {}
});
