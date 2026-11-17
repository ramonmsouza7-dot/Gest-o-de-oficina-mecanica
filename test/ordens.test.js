const test = require('node:test');
const assert = require('node:assert/strict');
const { app, db, CONFLITO } = require('../server');

let server;
let baseUrl;
let token;

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  return { status: response.status, body: await response.json() };
}

function prepararDados() {
  db.exec('DELETE FROM ordens_servico; DELETE FROM veiculos; DELETE FROM clientes; DELETE FROM auditoria_os;');
  db.prepare('INSERT INTO clientes(id,nome,cpf) VALUES (1,?,?)').run('Maria Silva', '11111111111');
  db.prepare('INSERT INTO veiculos(id,cliente_id,marca,modelo,placa) VALUES (1,1,?,?,?)').run('Honda', 'Civic', 'ABC1D23');
}

test.before(async () => {
  prepararDados();
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@oficina.com', senha: '123456' })
  });
  assert.equal(login.status, 200);
  token = login.body.token;
});

test.after(() => server.close());

function os(data, horario) {
  return {
    cliente_id: 1,
    veiculo_id: 1,
    descricao: 'Troca de óleo e revisão',
    mecanico_id: 2,
    data_agendamento: data,
    horario_agendamento: horario,
    situacao: 'AGENDADA'
  };
}

test('Cenário 1: cadastro permitido quando mecânico está livre', async () => {
  prepararDados();
  const response = await request('/api/ordens', { method: 'POST', body: JSON.stringify(os('2026-12-01', '09:00')) });
  assert.equal(response.status, 201);
  assert.ok(response.body.id);
});

test('Cenário 2: bloqueia segunda OS no mesmo horário', async () => {
  prepararDados();
  await request('/api/ordens', { method: 'POST', body: JSON.stringify(os('2026-12-02', '10:00')) });
  const response = await request('/api/ordens', { method: 'POST', body: JSON.stringify(os('2026-12-02', '10:00')) });
  assert.equal(response.status, 409);
  assert.equal(response.body.message, CONFLITO);
});

test('Cenário 3: bloqueia alteração para horário ocupado', async () => {
  prepararDados();
  const primeira = await request('/api/ordens', { method: 'POST', body: JSON.stringify(os('2026-12-03', '11:00')) });
  const outra = await request('/api/ordens', { method: 'POST', body: JSON.stringify(os('2026-12-03', '14:00')) });
  const alterada = await request(`/api/ordens/${outra.body.id}`, {
    method: 'PUT',
    body: JSON.stringify(os('2026-12-03', '11:00'))
  });
  assert.equal(primeira.status, 201);
  assert.equal(outra.status, 201);
  assert.equal(alterada.status, 409);
  assert.equal(alterada.body.message, CONFLITO);
});
