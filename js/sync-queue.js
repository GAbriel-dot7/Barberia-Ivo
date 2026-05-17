/* SyncQueue — fila local para operações que falham ao propagar ao RemoteDB
   Armazena em localStorage e faz retries exponenciais quando offline/erro.
*/

const SyncQueue = {
  KEY: 'sgcm_sync_queue',
  _queue: [],
  _processing: false,

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this._queue = raw ? JSON.parse(raw) : [];
    } catch (e) { this._queue = []; }
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this._queue)); } catch (e) {}
  },

  enqueueSave(table, payload) {
    this.load();
    const op = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      type: 'save',
      table,
      payload,
      attempts: 0,
      nextAttempt: Date.now()
    };
    this._queue.push(op);
    this.save();
    this.processQueue();
    return op.id;
  },

  enqueueDelete(table, id) {
    this.load();
    const op = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      type: 'delete',
      table,
      payload: { id },
      attempts: 0,
      nextAttempt: Date.now()
    };
    this._queue.push(op);
    this.save();
    this.processQueue();
    return op.id;
  },

  async processQueue() {
    if (this._processing) return;
    this._processing = true;
    try {
      this.load();
      for (let i = 0; i < this._queue.length; ) {
        const op = this._queue[i];
        if (!op || (op.nextAttempt || 0) > Date.now()) { i++; continue; }

        let ok = false;
        try {
          if (typeof RemoteDB === 'undefined' || !RemoteDB.initFromConfig()) throw new Error('RemoteDB not ready');
          // map table -> RemoteDB method
          switch (op.type) {
            case 'save':
              ok = await this._remoteSave(op.table, op.payload);
              break;
            case 'delete':
              ok = await this._remoteDelete(op.table, op.payload.id);
              break;
            default:
              ok = true; break;
          }
        } catch (e) {
          ok = false;
        }

        if (ok) {
          // remove from queue
          this._queue.splice(i, 1);
          this.save();
          // continue without incrementing i
        } else {
          // schedule retry
          op.attempts = (op.attempts || 0) + 1;
          const delay = Math.min(60000 * Math.pow(2, Math.min(op.attempts, 6)), 24 * 60 * 60 * 1000);
          op.nextAttempt = Date.now() + delay;
          this._queue[i] = op;
          this.save();
          i++;
        }
      }
    } finally {
      this._processing = false;
    }
  },

  async _remoteSave(table, payload) {
    try {
      switch (table) {
        case 'clientes': await RemoteDB.saveCliente(payload); return true;
        case 'servicos': await RemoteDB.saveServico(payload); return true;
        case 'agendamentos': await RemoteDB.saveAgendamento(payload); return true;
        case 'historico': await RemoteDB.addHistorico(payload); return true;
        case 'configuracoes': await RemoteDB.saveConfig(payload); return true;
        case 'usuarios': await RemoteDB.saveUsuario(payload); return true;
        default: return false;
      }
    } catch (e) { return false; }
  },

  async _remoteDelete(table, id) {
    try {
      switch (table) {
        case 'clientes': await RemoteDB.deleteCliente(id); return true;
        case 'servicos': await RemoteDB.deleteServico(id); return true;
        case 'agendamentos': await RemoteDB.deleteAgendamento(id); return true;
        case 'usuarios': await RemoteDB.deleteUsuario(id); return true;
        default: return false;
      }
    } catch (e) { return false; }
  },

  init() {
    this.load();
    // try processing on init
    setTimeout(() => this.processQueue(), 1000);
    // process when coming online
    window.addEventListener('online', () => this.processQueue());
  }
};

document.addEventListener('DOMContentLoaded', () => { try { SyncQueue.init(); } catch (e) {} });
