const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'oficina.db'));
const JWT_SECRET = process.env.JWT_SECRET || 'oficina-mecanica-secret';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK(perfil IN ('MECANICO','ADMINISTRADOR')),
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE,
      telefone TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      placa TEXT NOT NULL UNIQUE,
      ano INTEGER
    );
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id),
      descricao TEXT NOT NULL,
      mecanico_id INTEGER NOT NULL REFERENCES usuarios(id),
      data_agendamento TEXT NOT NULL,
      horario_agendamento TEXT NOT NULL,
      situacao TEXT DEFAULT 'AGENDADA',
      usuario_responsavel_id INTEGER REFERENCES usuarios(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS auditoria_os (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER,
      acao TEXT NOT NULL,
      data_hora TEXT NOT NULL,
      usuario_responsavel TEXT NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO usuarios(nome,email,senha,perfil) VALUES (?,?,?,?)');
    insert.run('Administrador', 'admin@oficina.com', bcrypt.hashSync('123456', 10), 'ADMINISTRADOR');
    insert.run('Carlos Mecânico', 'mecanico@oficina.com', bcrypt.hashSync('123456', 10), 'MECANICO');
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Token ausente ou inválido.' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (_) {
    res.status(401).json({ message: 'Sessão expirada ou token inválido.' });
  }
}

function admin(req, res, next) {
  if (req.user.perfil !== 'ADMINISTRADOR') {
    return res.status(403).json({ message: 'Acesso permitido apenas ao administrador.' });
  }
  next();
}

function audit(osId, acao, usuario) {
  db.prepare('INSERT INTO auditoria_os(os_id,acao,data_hora,usuario_responsavel) VALUES (?,?,?,?)')
    .run(osId, acao, new Date().toISOString(), usuario.nome);
}

initDb();

app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body;
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email);
  if (!usuario || !bcrypt.compareSync(senha || '', usuario.senha)) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }
  const token = jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil } });
});

app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

app.get('/api/clientes', auth, (req, res) => res.json(db.prepare('SELECT * FROM clientes ORDER BY nome').all()));

app.post('/api/clientes', auth, (req, res) => {
  const { nome, cpf, telefone, email } = req.body;
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });
  try {
    const result = db.prepare('INSERT INTO clientes(nome,cpf,telefone,email) VALUES (?,?,?,?)').run(nome, cpf || null, telefone || '', email || '');
    res.status(201).json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid));
  } catch (_) {
    res.status(400).json({ message: 'Cliente ou CPF já cadastrado.' });
  }
});

app.put('/api/clientes/:id', auth, (req, res) => {
  const { nome, cpf, telefone, email } = req.body;
  db.prepare('UPDATE clientes SET nome=?,cpf=?,telefone=?,email=? WHERE id=?').run(nome, cpf || null, telefone || '', email || '', req.params.id);
  res.json(db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id));
});

app.delete('/api/clientes/:id', auth, admin, (req, res) => {
  db.prepare('DELETE FROM clientes WHERE id=?').run(req.params.id);
  res.json({ message: 'Cliente excluído.' });
});

app.get('/api/veiculos', auth, (req, res) => {
  res.json(db.prepare(`SELECT v.*, c.nome AS cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id ORDER BY v.placa`).all());
});

app.post('/api/veiculos', auth, (req, res) => {
  const { cliente_id, marca, modelo, placa, ano } = req.body;
  if (!cliente_id || !marca || !modelo || !placa) return res.status(400).json({ message: 'Preencha proprietário, marca, modelo e placa.' });
  try {
    const result = db.prepare('INSERT INTO veiculos(cliente_id,marca,modelo,placa,ano) VALUES (?,?,?,?,?)').run(cliente_id, marca, modelo, placa, ano || null);
    res.status(201).json(db.prepare('SELECT * FROM veiculos WHERE id=?').get(result.lastInsertRowid));
  } catch (_) {
    res.status(400).json({ message: 'Placa já cadastrada ou cliente inválido.' });
  }
});

app.put('/api/veiculos/:id', auth, (req, res) => {
  const { cliente_id, marca, modelo, placa, ano } = req.body;
  db.prepare('UPDATE veiculos SET cliente_id=?,marca=?,modelo=?,placa=?,ano=? WHERE id=?').run(cliente_id, marca, modelo, placa, ano || null, req.params.id);
  res.json(db.prepare('SELECT * FROM veiculos WHERE id=?').get(req.params.id));
});

app.delete('/api/veiculos/:id', auth, admin, (req, res) => {
  db.prepare('DELETE FROM veiculos WHERE id=?').run(req.params.id);
  res.json({ message: 'Veículo excluído.' });
});

app.get('/api/mecanicos', auth, (req, res) => {
  res.json(db.prepare("SELECT id,nome,email FROM usuarios WHERE perfil='MECANICO' AND ativo=1").all());
});

const CONFLITO = 'Agendamento não permitido: o mecânico selecionado já possui uma ordem de serviço nesse horário. Selecione outro horário ou mecânico.';

app.get('/api/ordens', auth, (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = 10;
  const offset = (page - 1) * limit;
  const nome = (req.query.cliente || '').trim().toLowerCase();
  const data = (req.query.data || '').trim();
  let sql = `SELECT o.*, c.nome AS cliente_nome, v.placa AS veiculo_placa, v.modelo AS veiculo_modelo, u.nome AS mecanico_nome
             FROM ordens_servico o
             JOIN clientes c ON c.id=o.cliente_id
             JOIN veiculos v ON v.id=o.veiculo_id
             JOIN usuarios u ON u.id=o.mecanico_id
             WHERE 1=1`;
  const params = [];
  if (nome) { sql += ' AND LOWER(c.nome) LIKE ?'; params.push(`%${nome}%`); }
  if (data) { sql += ' AND o.data_agendamento = ?'; params.push(data); }
  sql += ' ORDER BY o.data_agendamento DESC, o.horario_agendamento DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const rows = db.prepare(sql).all(...params);
  let countSql = `SELECT COUNT(*) AS total FROM ordens_servico o JOIN clientes c ON c.id=o.cliente_id WHERE 1=1`;
  const countParams = [];
  if (nome) { countSql += ' AND LOWER(c.nome) LIKE ?'; countParams.push(`%${nome}%`); }
  if (data) { countSql += ' AND o.data_agendamento = ?'; countParams.push(data); }
  const total = db.prepare(countSql).get(...countParams).total;
  res.json({ data: rows, page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) });
});

app.post('/api/ordens', auth, (req, res) => {
  const { cliente_id, veiculo_id, descricao, mecanico_id, data_agendamento, horario_agendamento, situacao } = req.body;
  if (!cliente_id || !veiculo_id || !descricao || !mecanico_id || !data_agendamento || !horario_agendamento) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }
  const conflito = db.prepare(`SELECT id FROM ordens_servico WHERE mecanico_id=? AND data_agendamento=? AND horario_agendamento=? LIMIT 1`).get(mecanico_id, data_agendamento, horario_agendamento);
  if (conflito) return res.status(409).json({ message: CONFLITO });
  const result = db.prepare(`INSERT INTO ordens_servico(cliente_id,veiculo_id,descricao,mecanico_id,data_agendamento,horario_agendamento,situacao,usuario_responsavel_id) VALUES (?,?,?,?,?,?,?,?)`)
    .run(cliente_id, veiculo_id, descricao, mecanico_id, data_agendamento, horario_agendamento, situacao || 'AGENDADA', req.user.id);
  audit(result.lastInsertRowid, 'CADASTRO', req.user);
  res.status(201).json(db.prepare('SELECT * FROM ordens_servico WHERE id=?').get(result.lastInsertRowid));
});

app.put('/api/ordens/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  const atual = db.prepare('SELECT * FROM ordens_servico WHERE id=?').get(id);
  if (!atual) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' });
  const { cliente_id, veiculo_id, descricao, mecanico_id, data_agendamento, horario_agendamento, situacao } = req.body;
  const conflito = db.prepare(`SELECT id FROM ordens_servico WHERE mecanico_id=? AND data_agendamento=? AND horario_agendamento=? AND id<>? LIMIT 1`).get(mecanico_id, data_agendamento, horario_agendamento, id);
  if (conflito) return res.status(409).json({ message: CONFLITO });
  db.prepare(`UPDATE ordens_servico SET cliente_id=?,veiculo_id=?,descricao=?,mecanico_id=?,data_agendamento=?,horario_agendamento=?,situacao=?,usuario_responsavel_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(cliente_id, veiculo_id, descricao, mecanico_id, data_agendamento, horario_agendamento, situacao || atual.situacao, req.user.id, id);
  audit(id, 'ALTERAÇÃO', req.user);
  res.json(db.prepare('SELECT * FROM ordens_servico WHERE id=?').get(id));
});

app.delete('/api/ordens/:id', auth, admin, (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM ordens_servico WHERE id=?').get(id)) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' });
  db.prepare('DELETE FROM ordens_servico WHERE id=?').run(id);
  audit(id, 'EXCLUSÃO', req.user);
  res.json({ message: 'Ordem de serviço excluída.' });
});

app.get('/api/auditoria', auth, admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM auditoria_os ORDER BY id DESC').all());
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Rota não encontrada.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
if (require.main === module) app.listen(port, () => console.log(`Servidor iniciado em http://localhost:${port}`));

module.exports = { app, db, CONFLITO };
