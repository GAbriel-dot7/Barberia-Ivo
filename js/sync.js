// Sync utilities for Supabase Storage
// Usa a API REST do Supabase Storage para enviar/baixar um backup JSON

function loadSupabaseInputsFromConfig() {
  const cfg = DB.getConfig() || {};
  const sup = cfg.supabase || {};
  document.getElementById('supabaseUrl').value = sup.url || '';
  document.getElementById('supabaseAnonKey').value = sup.anonKey || '';
  document.getElementById('supabaseBucket').value = sup.bucket || '';
}

function _normalizeUrl(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  return 'https://' + trimmed.replace(/\/$/, '');
}

function saveSupabaseConfig() {
  let url = document.getElementById('supabaseUrl').value.trim();
  const anonKey = document.getElementById('supabaseAnonKey').value.trim();
  const bucket = document.getElementById('supabaseBucket').value.trim();
  if (!url || !anonKey || !bucket) {
    Notify.error('Configuração incompleta', 'Preencha URL, ANON KEY e bucket.');
    return;
  }
  url = _normalizeUrl(url);
  const cfg = DB.getConfig();
  cfg.supabase = { url, anonKey, bucket };
  DB.saveConfig(cfg);
  Notify.success('Config salva', 'Configuração do Supabase gravada localmente.');
  document.getElementById('supabaseStatus').textContent = 'Configuração salva.';
}

function getBackupPayload() {
  return {
    usuarios: Auth.exportUsuarios ? Auth.exportUsuarios() : (Auth.getUsuarios ? Auth.getUsuarios() : []),
    ...(DB.exportData ? DB.exportData() : {
      config: DB.getConfig(),
      clientes: DB.getClientes(),
      servicos: DB.getServicos(),
      agendamentos: DB.getAgendamentos(),
      historico: DB.getHistorico(),
    }),
    exportedAt: new Date().toISOString()
  };
}

async function pushBackupToSupabase() {
  const url = _normalizeUrl(document.getElementById('supabaseUrl').value.trim());
  const anonKey = document.getElementById('supabaseAnonKey').value.trim();
  const bucket = document.getElementById('supabaseBucket').value.trim();
  if (!url || !anonKey || !bucket) {
    Notify.error('Configuração incompleta', 'Preencha URL, ANON KEY e bucket.');
    return;
  }
  const payload = getBackupPayload();
  const path = 'sgcm-backup-latest.json';
  const endpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + anonKey
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      Notify.success('Backup enviado', 'Backup salvo no Supabase Storage como ' + path);
      document.getElementById('supabaseStatus').textContent = 'Backup enviado com sucesso.';
    } else {
      const txt = await res.text();
      Notify.error('Erro ao enviar', `Status ${res.status}: ${txt}`);
      document.getElementById('supabaseStatus').textContent = 'Erro: ' + res.status;
    }
  } catch (err) {
    Notify.error('Erro de conexão', err.message || String(err));
    document.getElementById('supabaseStatus').textContent = 'Erro de conexão';
  }
}

async function pullBackupFromSupabase() {
  const url = _normalizeUrl(document.getElementById('supabaseUrl').value.trim());
  const anonKey = document.getElementById('supabaseAnonKey').value.trim();
  const bucket = document.getElementById('supabaseBucket').value.trim();
  if (!url || !anonKey || !bucket) {
    Notify.error('Configuração incompleta', 'Preencha URL, ANON KEY e bucket.');
    return;
  }
  const path = 'sgcm-backup-latest.json';
  const endpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + anonKey }
    });
    if (res.ok) {
      const data = await res.json();
      // Persistir no LocalStorage
      if (Auth.importUsuarios) Auth.importUsuarios(data.usuarios || []);
      if (DB.importData) DB.importData(data);
      Notify.success('Backup restaurado', 'Dados importados do Supabase para o LocalStorage.');
      document.getElementById('supabaseStatus').textContent = 'Backup recuperado e importado.';
      setTimeout(() => window.location.reload(), 800);
    } else {
      const txt = await res.text();
      Notify.error('Erro ao baixar', `Status ${res.status}: ${txt}`);
      document.getElementById('supabaseStatus').textContent = 'Erro: ' + res.status;
    }
  } catch (err) {
    Notify.error('Erro de conexão', err.message || String(err));
    document.getElementById('supabaseStatus').textContent = 'Erro de conexão';
  }
}

async function testSupabaseConnection() {
  const url = _normalizeUrl(document.getElementById('supabaseUrl').value.trim());
  const anonKey = document.getElementById('supabaseAnonKey').value.trim();
  const bucket = document.getElementById('supabaseBucket').value.trim();
  if (!url || !anonKey || !bucket) {
    Notify.error('Configuração incompleta', 'Preencha URL, ANON KEY e bucket.');
    return;
  }
  // Use list endpoint to verify bucket access
  const endpoint = `${url}/storage/v1/object/list/${bucket}`;
  try {
    const res = await fetch(endpoint, { method: 'GET', headers: { 'Authorization': 'Bearer ' + anonKey } });
    if (res.ok || res.status === 200 || res.status === 204) {
      Notify.success('Conexão OK', 'Suas credenciais parecem funcionar (verifique permissões do bucket).');
      document.getElementById('supabaseStatus').textContent = 'Conexão OK.';
    } else {
      const txt = await res.text();
      Notify.error('Falha na conexão', `Status ${res.status}: ${txt}`);
      document.getElementById('supabaseStatus').textContent = 'Falha: ' + res.status;
    }
  } catch (err) {
    Notify.error('Erro de conexão', err.message || String(err));
    document.getElementById('supabaseStatus').textContent = 'Erro de conexão';
  }
}

// Inicializa campos quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  loadSupabaseInputsFromConfig();
});
