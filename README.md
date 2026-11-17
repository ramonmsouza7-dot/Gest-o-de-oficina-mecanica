# Gestão de Serviços da Oficina Mecânica

Sistema web desenvolvido com Java, Spring Boot, HTML, CSS e JavaScript.

## Tecnologias

- Java 21
- Spring Boot 3.5
- Spring Security
- Spring Data JPA
- Thymeleaf
- HTML/CSS/JavaScript
- Banco H2
- JUnit

## Executar

```bat
mvnw.cmd spring-boot:run
```

Acesse: `http://localhost:8080`

## Usuários iniciais

- Administrador: `admin@oficina.com` / `123456`
- Mecânico: `mecanico@oficina.com` / `123456`
- Mecânico: `joao@oficina.com` / `123456`

## Banco de dados

O banco H2 é criado automaticamente em `data/oficina.mv.db`. O console fica em `http://localhost:8080/h2-console`.

## Testes

```bat
mvnw.cmd test
```

Os cenários obrigatórios estão em `src/test/java/com/oficina/service/OrdemServicoServiceTest.java`.

## Permissões

- Mecânico: consulta e atualiza informações permitidas, mas não exclui registros.
- Administrador: acesso completo, inclusive exclusão de clientes e ordens de serviço.