const API = '/api';
let token = localStorage.getItem('oficina_token');
let user = JSON.parse(localStorage.getItem('oficina_user') || 'null');
let osPage = 1;

const loginView = document.querySelector('#loginView');
const appView = document.querySelector('#appView');

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Erro na operação.');
  return data;
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  document.querySelector('#userName').textContent = user.nome;
  document.querySelector('#userRole').textContent = user.perfil;
  document.querySelectorAll('.admin-only').forEach(el => el.hidden = user.perfil !== 'ADMINISTRADOR');
  loadDashboard();
}

function showLogin() {
  loginView.hidden = false;
  appView.hidden = true;
}

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventValue?.();
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const error = document.querySelector('#loginError');
  try {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), senha: form.get('senha') }) });
    token = result.token;
    user = result.usuario;
    localStorage.setItem('oficina_token', token);
    localStorage.setItem('oficina_user', JSON.stringify(user));
    showApp();
  } catch (err) { error.textContent = err.message; error.hidden = false; }
});

document.querySelector('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('oficina_token');
  localStorage.removeItem('oficina_user');
  token = null; user = null;
  showLogin();
});

document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  button.classList.add('active');
  document.querySelector(`#${button.dataset.view}`).classList.add('active');
  if (button.dataset.view === 'clientes') loadClientes();
  if (button.dataset.view === 'veiculos') loadVeiculos();
  if (button.dataset.view === 'ordens') loadOrdens();
  if (button.dataset.view === 'auditoria') loadAuditoria();
  if (button.dataset.view === 'dashboard') loadDashboard();
}));

async function loadDashboard() {
  try {
    const [clientes, veiculos, ordens] = await Promise.all([api('/clientes'), api('/veiculos'), api('/ordens?limit=1')]);
    document.querySelector('#totalClientes').textContent = clientes.length;
    document.querySelector('#totalVeiculos').textContent = veiculos.length;
    document.querySelector('#totalOrdens').textContent = ordens.total;
  } catch (_) { logoutIfUnauthorized(); }
}

function logoutIfUnauthorized() {
  localStorage.removeItem('oficina_token');
  localStorage.removeItem('oficina_user');
  token = null; user = null;
  showLogin();
}

async function loadClientes() {
  const rows = await api('/clientes');
  const body = document.querySelector('#clientesBody');
  body.innerHTML = rows.map(row => `<tr><td>${escapeHtml(row.nome)}</td><td>${escapeHtml(row.cpf || '')}</td><td>${escapeHtml(row.telefone || '')}</td><td>${escapeHtml(row.email || '')}</td><td>${user.perfil === 'ADMINISTRADOR' ? `<button class="btn danger" onclick="deleteCliente(${row.id})">Excluir</button>` : ''}</td></tr>`).join('');
}

document.querySelector('#clienteForm').addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  await api('/clientes', { method: 'POST', body: JSON.stringify(data) });
  event.currentTarget.reset(); loadClientes(); loadDashboard();
});

async function deleteCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  await api(`/clientes/${id}`, { method: 'DELETE' });
  loadClientes(); loadDashboard();
}

async function loadVeiculos() {
  const [clientes, veiculos] = await Promise.all([api('/clientes'), api('/veiculos')]);
  const select = document.querySelector('#clienteVeiculoSelect');
  select.innerHTML = clientes.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  document.querySelector('#veiculosBody').innerHTML = veiculos.map(row => `<tr><td>${escapeHtml(row.placa)}</td><td>${escapeHtml(row.marca)}</td><td>${escapeHtml(row.modelo)}</td><td>${escapeHtml(row.ano || '')}</td><td>${escapeHtml(row.cliente_nome)}</td><td>${user.perfil === 'ADMINISTRADOR' ? `<button class="btn danger" onclick="deleteVeiculo(${row.id})">Excluir</button>` : ''}</td></tr>`).join('');
}

document.querySelector('#veiculoForm').addEventListener('submit', async event => {
  event.preventDefault();
  await api('/veiculos', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
  event.currentTarget.reset(); loadVeiculos(); loadDashboard();
});

async function deleteVeiculo(id) {
  if (!confirm('Excluir este veículo?')) return;
  await api(`/veiculos/${id}`, { method: 'DELETE' }); loadVeiculos(); loadDashboard();
}

async function loadOrdens(page = osPage) {
  osPage = page;
  const form = document.querySelector('#filterForm');
  const filtro = new FormData(form);
  const params = new URLSearchParams({ page, cliente: filtro.get('cliente') || '', data: filtro.get('data') || '' });
  const [resultado, clientes, veiculos, mecanicos] = await Promise.all([api(`/ordens?${params}`), api('/clientes'), api('/veiculos'), api('/mecanicos')]);
  document.querySelector('#osCliente').innerHTML = `<option value="">Selecione</option>` + clientes.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  document.querySelector('#osVeiculo').innerHTML = `<option value="">Selecione</option>` + veiculos.map(v => `<option value="${v.id}">${escapeHtml(v.placa + ' — ' + v.modelo)}</option>`).join('');
  document.querySelector('#osMecanico').innerHTML = `<option value="">Selecione</option>` + mecanicos.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('');
  document.querySelector('#ordensBody').innerHTML = resultado.data.map(row => `<tr><td>${row.id}</td><td>${escapeHtml(row.cliente_nome)}</td><td>${escapeHtml(row.veiculo_placa + ' — ' + row.veiculo_modelo)}</td><td>${escapeHtml(row.descricao)}</td><td>${escapeHtml(row.mecanico_nome)}</td><td>${row.data_agendamento} às ${row.horario_agendamento}</td><td>${escapeHtml(row.situacao)}</td><td>${user.perfil === 'ADMINISTRADOR' ? `<button class="btn danger" onclick="deleteOs(${row.id})">Excluir</button>` : ''}</td></tr>`).join('');
  const pagination = document.querySelector('#pagination');
  pagination.innerHTML = `${resultado.page > 1 ? `<button onclick="loadOrdens(${resultado.page - 1})">Anterior</button>` : ''}<span>Página ${resultado.page} de ${resultado.pages}</span>${resultado.page < resultado.pages ? `<button onclick="loadOrdens(${resultado.page + 1})">Próxima</button>` : ''}`;
}

document.querySelector('#filterForm').addEventListener('submit', event => { event.preventDefault(); loadOrdens(1); });
document.querySelector('#clearFilter').addEventListener('click', () => { document.querySelector('#filterForm').reset(); loadOrdens(1); });

document.querySelector('#osForm').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#osMessage');
  try {
    await api('/ordens', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    message.textContent = 'Ordem de serviço cadastrada com sucesso.'; message.className = 'alert success'; message.hidden = false;
    event.currentTarget.reset(); loadOrdens(); loadDashboard();
  } catch (err) { message.textContent = err.message; message.className = 'alert error'; message.hidden = false; }
});

async function deleteOs(id) {
  if (!confirm('Excluir esta ordem de serviço?')) return;
  await api(`/ordens/${id}`, { method: 'DELETE' }); loadOrdens(); loadDashboard();
}

async function loadAuditoria() {
  const rows = await api('/auditoria');
  document.querySelector('#auditoriaBody').innerHTML = rows.map(row => `<tr><td>${row.os_id || ''}</td><td>${escapeHtml(row.acao)}</td><td>${escapeHtml(row.data_hora)}</td><td>${escapeHtml(row.usuario_responsavel)}</td></tr>`).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

if (token && user) showApp(); else showLogin();
