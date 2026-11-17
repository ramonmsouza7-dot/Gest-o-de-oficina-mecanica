# Gestão de Serviços da Oficina Mecânica

Sistema web em JavaScript, HTML e CSS, com servidor Node.js e banco SQLite.

## Tecnologias

- HTML
- CSS
- JavaScript
- Node.js
- Express
- SQLite
- JWT
- BCrypt

## Executar

```bat
npm install
npm start
```

Acesse: `http://localhost:3000`

## Usuários iniciais

- Administrador: `admin@oficina.com` / `123456`
- Mecânico: `mecanico@oficina.com` / `123456`

## Banco de dados

O banco SQLite é criado automaticamente em `data/oficina.db`.

## Testes

```bat
npm test
```

Os três cenários obrigatórios estão em `test/ordens.test.js`.

## Permissões

- Mecânico: consulta e atualiza dados permitidos, mas não exclui registros.
- Administrador: acesso completo, incluindo exclusão de clientes, veículos e ordens de serviço.