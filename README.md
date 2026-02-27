# BID — Sistema de Apostas e Eventos

Sistema completo para gestão de apostas em eventos, portaria (check-in de ingressos), grupos, usuários e integração com Microsoft Azure AD (multi-tenant). Desenvolvido com **Angular 21** no frontend e **Node.js + Express + MySQL** no backend.

---

## Índice

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando o projeto](#executando-o-projeto)
- [API (Backend)](#api-backend)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Banco de dados](#banco-de-dados)
- [Licença](#licença)

---

## Visão geral

O **BID** permite:

- **Apostas em partidas/eventos**: usuários gastam pontos em apostas; ao final, ganhadores recebem ingressos.
- **Portaria**: tela em tela cheia para check-in de ingressos (tablet), com assinatura e dados do recebedor.
- **Organograma**: empresas, setores e grupos (do AD ou Excel) vinculados a usuários e partidas.
- **Multi-tenant**: suporte a mais de um tenant Azure AD (ex.: WTorre, Real Arenas).
- **Auditoria e monitor**: logs de ações e erros do sistema.
- **E-mail**: templates HTML e disparo em massa para listas.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Autenticação** | Login com Azure AD (MSAL) e JWT; perfis ADMIN, USER, PORTARIA |
| **Dashboard** | Estatísticas, partidas abertas e realização de apostas |
| **Minhas apostas** | Histórico e status das apostas do usuário |
| **Usuários** | CRUD, foto (avatar), empresa/setor/grupo, pontos, perfil |
| **Grupos** | Grupos de apostas (vinculados a partidas) |
| **Partidas** | Eventos com banner, datas, custo em pontos, sorteio, status (ABERTA/ENCERRADA/FINALIZADA) |
| **Portaria** | Check-in de ingressos por CPF, assinatura, recebedor |
| **Convidados** | Cadastro de convidados por usuário (para ingressos) |
| **Histórico** | Histórico de partidas e apostas |
| **Configurações** | Configurações gerais, templates de e-mail, papel timbrado |
| **Regras de pontuação** | Cron: acúmulo de pontos por tempo (minutos/horas/dias/meses) por grupo/setor/perfil |
| **Auditoria** | Registro de ações por módulo (USUARIOS, PARTIDAS, PORTARIA, etc.) |
| **Monitor de erros** | Listagem e resolução de erros registrados no sistema |
| **Disparo de e-mails** | Envio em massa usando listas e templates |
| **Status dos tenants** | Visão do status dos tenants Azure configurados |

---

## Tecnologias

### Backend

- **Node.js** + **Express**
- **MySQL** (mysql2)
- **Autenticação**: JWT + **Passport** (Azure AD)
- **Validação**: Joi
- **E-mail**: Nodemailer
- **Agendamento**: node-cron (regras de pontuação)
- **Upload**: Multer (avatars, banners, papel timbrado)
- **Segurança**: Helmet, CORS, rate limit, bcryptjs
- **Planilhas**: xlsx

### Frontend

- **Angular 21**
- **MSAL Angular** (login Microsoft)
- **Tailwind CSS**
- **Bootstrap Icons**
- **TinyMCE** (editor de templates de e-mail)
- **jsPDF** / pdf-lib (geração de PDFs)
- **SweetAlert2**
- **xlsx** (import/export)

---

## Pré-requisitos

- **Node.js** 18+ (recomendado 20+)
- **MySQL** 8+ (ou MariaDB compatível)
- **npm** 11+
- Conta **Azure AD** (tenant(s)) para login corporativo (opcional; pode usar apenas usuário/senha local)

---

## Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd BID
```

### 2. Backend

```bash
cd backend
npm install
```

### 3. Frontend

```bash
cd frontend
npm install
```

---

## Configuração

### Backend — Variáveis de ambiente

Na pasta `backend`, crie o arquivo `.env` (use o `.env.example` como base):

```env
# Servidor
PORT=3005

# Banco de dados MySQL
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=dbbid

# Azure AD (tenant principal)
AZURE_TENANT_ID=seu-tenant-id
AZURE_CLIENT_ID=seu-client-id
AZURE_CLIENT_SECRET=seu-client-secret

# Azure AD — tenant secundário (opcional)
AZURE_TENANT_ID_2=
AZURE_CLIENT_ID_2=
AZURE_CLIENT_SECRET_2=

# JWT (gere um segredo forte, ex: openssl rand -hex 64)
JWT_SECRET=seu-jwt-secret-aqui

# CORS (origens permitidas, separadas por vírgula)
CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

- O backend cria o banco e as tabelas automaticamente na primeira execução (`config/setupDatabase.js`).
- **Não commite** o arquivo `.env` (use `.gitignore`).

### Frontend — Ambiente

Em `frontend/src/environments/`:

- **environment.ts** (desenvolvimento): defina `apiUri` (ex.: `http://localhost:3005/api`) e, se usar Azure AD, `msalConfig.auth.clientId` e `authority`.
- **environment.prod.ts** (produção): ajuste `apiUri` e MSAL para a URL da API e do app em produção.

---

## Executando o projeto

### Desenvolvimento

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

Servidor em `http://localhost:3005` (ou na porta definida em `PORT`).

**Terminal 2 — Frontend**

```bash
cd frontend
ng serve
```

Aplicação em `http://localhost:4200`.

### Produção

**Backend**

```bash
cd backend
npm start
```

**Frontend**

```bash
cd frontend
ng build
```

Os arquivos de build ficam em `frontend/dist/`. Sirva essa pasta com o servidor web de sua preferência (Nginx, Apache, etc.) e configure o proxy/reverse proxy para a API na porta do backend.

---

## API (Backend)

Base URL (desenvolvimento): `http://localhost:3005/api`

| Recurso | Prefixo | Descrição |
|---------|---------|-----------|
| Autenticação | `/auth` | Login (Azure AD + JWT), refresh, logout |
| Usuários | `/users` | CRUD, perfil, avatar, pontos |
| Grupos | `/groups` | CRUD de grupos de apostas |
| Partidas | `/matches` | CRUD, sorteio, status |
| Convidados | `/guests` | CRUD de convidados por usuário |
| Portaria | `/reception` | Check-in de ingressos, consultas |
| Configurações | `/settings` | Configurações gerais, uploads (banner, papel timbrado) |
| Regras de pontuação | `/points-rules` | CRUD de regras de pontuação (cron) |
| Setores | `/sectors` | Setores (organograma) |
| Setores de evento | `/setores-evento` | Catálogo de setores de evento (Cadeira, Pista, etc.) |
| Auditoria | `/audits` | Consulta de logs de auditoria |
| Monitor de erros | `/system-errors` | Listagem e resolução de erros |
| E-mail | `/email` | Listas, templates, disparo |

Uploads estáticos (avatars, banners, papel timbrado): `http://localhost:3005/uploads/...`

---

## Estrutura do projeto

```
BID/
├── backend/
│   ├── config/          # setupDatabase, passport (Azure AD)
│   ├── controllers/     # Lógica das rotas
│   ├── cron/            # Automations (regras de pontuação)
│   ├── middleware/      # Auth, validação
│   ├── routes/          # Rotas da API
│   ├── uploads/         # Avatares, banners, letterhead (não versionar)
│   ├── validations/     # Schemas Joi
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── guards/       # AuthGuard
│   │   │   ├── interceptors/ # Auth interceptor (JWT)
│   │   │   ├── layouts/      # MainLayout
│   │   │   ├── pages/        # Dashboard, users, matches, reception, etc.
│   │   │   ├── services/     # auth, API
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   └── environments/
│   └── package.json
└── README.md
```

---

## Banco de dados

O banco é criado e migrado automaticamente ao subir o backend. Principais entidades:

- **empresas**, **setores** — Organograma
- **grupos** — Grupos de apostas
- **usuarios** — Usuários (AD + local), pontos, perfil, empresa/setor/grupo
- **convidados** — Convidados por usuário
- **partidas** — Eventos (datas, custo, status, grupo, setor_evento)
- **apostas** — Apostas (partida, usuário, valor em pontos, status)
- **ingressos** — Bilhetes por aposta (check-in, assinatura, recebedor)
- **regras_pontuacao** — Regras de acúmulo de pontos (cron)
- **auditoria**, **logs_erros** — Auditoria e monitor
- **configuracoes**, **templates_email**, **listas_email** — Config e e-mail

---

## Licença

ISC.

---

Para dúvidas ou contribuições, abra uma issue ou pull request no repositório.
