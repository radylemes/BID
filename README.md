# BID — Sistema de Apostas e Eventos

Sistema completo para gestão de **BIDs** (leilões de ingressos com pontos), **WT Pass** (eventos RH por ordem de inscrição), portaria (check-in), grupos, usuários e integração com **Microsoft Azure AD** (multi-tenant). Desenvolvido com **Angular 21** no frontend e **Node.js + Express + MySQL** no backend.

---

## Índice

- [Visão geral](#visão-geral)
- [Perfis de acesso](#perfis-de-acesso)
- [Funcionalidades](#funcionalidades)
- [Rotas do frontend](#rotas-do-frontend)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando o projeto](#executando-o-projeto)
- [API (Backend)](#api-backend)
- [Tarefas agendadas (Cron)](#tarefas-agendadas-cron)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Banco de dados](#banco-de-dados)
- [Scripts úteis](#scripts-úteis)
- [Licença](#licença)

---

## Visão geral

O **BID** permite:

- **BIDs (leilões)**: usuários gastam pontos em lances; ao encerrar, ganhadores recebem ingressos; redistribuição e acréscimo de ingressos sobressalentes.
- **WT Pass**: eventos corporativos com inscrição FIFO, lista de espera, auto-encerramento, bloqueio por falta de presença e exportação de inscritos.
- **Portaria**: tela em tela cheia para check-in de ingressos (tablet), com assinatura e dados do recebedor; consulta histórica; supervisor ADMIN para relatório e cancelamento de liberações indevidas.
- **Organograma**: empresas, setores e grupos (do AD ou Excel) vinculados a usuários e partidas.
- **Multi-tenant**: suporte a mais de um tenant Azure AD (ex.: WTorre, Real Arenas).
- **Auditoria e monitor**: logs de ações e erros do sistema.
- **E-mail**: templates HTML (TinyMCE), listas de destinatários e disparo em massa.
- **Relatórios**: indicadores e exportação Excel de BIDs e WT Pass.

---

## Perfis de acesso

| Perfil | Descrição |
|--------|-----------|
| **ADMIN** | Acesso total: usuários, grupos, BIDs, WT Pass, configurações, e-mail, auditoria, relatórios, **Supervisor Portaria** |
| **USER** | Dashboard, apostas, perfil, convidados, WT Pass, histórico, políticas de acesso |
| **PORTARIA** | App de portaria (check-in) e lista de confirmados; sem menu de apostas |

---

## Funcionalidades

### Autenticação e sessão

| Função | Descrição |
|--------|-----------|
| Login local | E-mail/senha com JWT |
| Login Microsoft | Azure AD via MSAL (frontend) + Passport OAuth Bearer (backend) |
| Logout | Encerramento de sessão no cliente |
| Guard de rotas | `AuthGuard` com controle por perfil (`ADMIN`, `USER`, `PORTARIA`) |
| Interceptor JWT | Token enviado automaticamente nas requisições à API |

### Dashboard (Início)

| Função | Descrição |
|--------|-----------|
| Partidas abertas | Listagem de BIDs com contagem regressiva |
| Realizar lance | Aposta com pontos; validação de saldo e regras |
| Saldo e pontos em jogo | Widget no menu lateral |
| Contagem WT Pass | Eventos disponíveis para inscrição |
| Banner de evento | URL externa ou imagem servida pela API |

### BIDs — Leilões de ingressos

| Função | Descrição |
|--------|-----------|
| Criar / editar BID | Título, datas, custo em pontos, banner, setor de evento, grupos elegíveis |
| Status | `ABERTA`, `ENCERRADA`, `FINALIZADA` |
| Encerrar leilão | Sorteio de ganhadores e geração de ingressos |
| Redistribuir ingressos | Encaminhar ingressos sobressalentes para outro BID/grupo |
| Acrescentar ingressos | Inclusão de novos ingressos em BID existente |
| Relatório de ganhadores | Exportação PDF (com papel timbrado opcional) |
| Relatório de lances | Listagem de apostas por BID |
| Disparo de e-mail | Envio em massa aos ganhadores (integrado ao gerenciador de BIDs) |
| Setores de evento | Catálogo (Cadeira, Pista, etc.) no gerenciador |
| Minhas apostas | Histórico, status e atribuição de convidados aos ingressos |
| Histórico público | Partidas e apostas encerradas/finalizadas |

### WT Pass — Eventos RH

| Função | Descrição |
|--------|-----------|
| Listar eventos | Eventos abertos para inscrição (usuário) |
| Inscrição FIFO | Ordem de chegada; promoção automática da lista de espera |
| Cancelar inscrição | Com limite temporal antes do evento |
| Lista de participantes | Visão do colaborador (colegas inscritos) |
| Histórico do usuário | Eventos passados e status de presença |
| Gerenciar eventos (ADMIN) | CRUD, estados, auto-encerramento, cópia de evento |
| Lista de inscritos (ADMIN) | Inscritos, fila de espera, presença |
| Marcar presença | `PRESENTE`, `AUSENTE`, `NAO_RETIRADA` |
| Bloqueio por falta | Penalização configurável (ausência / não retirada) |
| Política WT Pass | Texto e PDF de aceite obrigatório |
| Auto-encerramento | Cron fecha inscrições após `data_limite_inscricao` |
| Presença / falta | Manual via admin ou portaria (marcação automática após o evento desativada) |
| Exportação Excel | Inscritos por evento (relatórios e gerenciador) |

### Portaria (Concierge BID)

| Função | Descrição |
|--------|-----------|
| Eventos por data | BIDs (ganhadores) e WT Pass (inscritos) do dia selecionado; consulta de **datas passadas** em modo somente leitura |
| Calendário customizado | Seletor de data com **destaque** nos dias que possuem evento (`GET /events/dates`) |
| Lista de convidados | Por evento; filtros por tipo (BID/WT Pass), setor, status (pendentes/liberados) e busca |
| Check-in | Assinatura digital, CPF/nome do recebedor e foto opcional do documento |
| Prazo de liberação | Permitido **no dia do evento até 23:59** (fuso `America/Sao_Paulo`); após isso, somente visualização |
| Confirmados | Tela separada com ingressos já validados; também consulta histórica |
| Normalização de textos | Nomes, empresas e setores exibidos em formato título (ex.: "Ana Paula") |
| Debug (dev) | `GET /reception/debug` para diagnóstico |

### Supervisor Portaria (ADMIN)

| Função | Descrição |
|--------|-----------|
| Relatório de acessos | Liberações BID e WT Pass com filtros por período, tipo, status e busca |
| Detalhe do acesso | Titular, recebedor, CPF, evento, quem liberou, assinatura e documento |
| Cancelar liberação | Reverte check-in indevido com motivo obrigatório; **somente no dia do evento até 23:59** |
| Exportação XLSX | Relatório completo na aba Relatório |
| Auditoria | Toda reversão gera log `CHECKIN_CANCEL_INGRESSO` ou `CHECKIN_CANCEL_WT_PASS` |

### Usuários

| Função | Descrição |
|--------|-----------|
| CRUD | Criar, editar, excluir usuários |
| Avatar | Upload de foto de perfil (compressão no frontend) |
| Perfil | `ADMIN`, `USER`, `PORTARIA` |
| Pontos | Ajuste manual e histórico de movimentações |
| Grupo / setor / empresa | Vínculo ao organograma |
| Ativar / desativar | Toggle de status |
| Tema | Preferência claro/escuro por usuário |
| Sincronizar Azure AD | Importação de usuários dos tenants |
| Importar Excel | Atualização em lote (organograma, pontos, grupos) |
| Pontos em lote | Por empresa, setor ou grupo |
| Grupo em lote | Atribuição de grupo a múltiplos usuários |
| Exportar Excel | Relatório de usuários |
| Estatísticas | Stats por usuário (`/:id/stats`) |
| Status dos tenants | Diagnóstico de conexão Azure (ADMIN) |

### Grupos

| Função | Descrição |
|--------|-----------|
| CRUD | Grupos de apostas vinculados a BIDs |
| Grupos por usuário | Listagem dos grupos de um colaborador |

### Convidados

| Função | Descrição |
|--------|-----------|
| CRUD | Convidados cadastrados no perfil do usuário |
| Atribuir ao ingresso | Vincular convidado a bilhete ganho em aposta |

### Perfil do usuário

| Função | Descrição |
|--------|-----------|
| Dados pessoais | Nome, e-mail, CPF, foto |
| Convidados | Gestão no próprio perfil |
| Histórico de pontos | Movimentações de saldo |
| Tema da interface | Seleção de tema visual |
| Política de acesso | Aceite das políticas de BIDs e WT Pass |

### Configurações (ADMIN)

| Aba | Função |
|-----|--------|
| Regras de pontos | CRUD de regras automáticas (cron) por empresa/setor/grupo |
| Servidor SMTP | Host, porta, credenciais, teste de envio |
| Política de acesso (BIDs) | Texto e PDF da política de lances |
| WT Pass | Política, bloqueio por falta, liberação de bloqueios |
| Status Tenants Azure | Diagnóstico dos tenants configurados |
| Monitor de erros | Listagem, resolução e limpeza de logs |
| Templates de e-mail | CRUD com editor TinyMCE (rotas dedicadas) |
| Papel timbrado | Upload PDF/PNG/JPG para exportações |

### E-mail

| Função | Descrição |
|--------|-----------|
| Listas | CRUD de listas de destinatários |
| Itens da lista | Adicionar/remover e-mails manualmente |
| Importar CSV | Upload de ficheiro para lista |
| Importar usuários | Preencher lista a partir do banco |
| Templates | CRUD, preview, teste, clonagem |
| Disparo em massa | Envio por template + lista (tela `/email/disparo`) |
| Log de disparos | Histórico por partida |
| PDF ganhadores | Geração de PDF para e-mail |
| Teste SMTP | Validação de configuração |

### Relatórios (ADMIN)

| Função | Descrição |
|--------|-----------|
| Indicadores WT Pass | Eventos realizados (encerrados) |
| Indicadores BIDs | BIDs finalizados e ingressos distribuídos |
| Exportação WT Pass | Excel de inscritos por evento |
| Exportação BIDs | Relatórios de ganhadores e lances |

### Auditoria e monitor

| Função | Descrição |
|--------|-----------|
| Auditoria | Consulta de logs por módulo (USUARIOS, PARTIDAS, PORTARIA, EVENTOS_RH, etc.) |
| Monitor de erros | Erros da API e do sistema; marcar como resolvido; limpar histórico |

### Políticas de acesso

| Rota | Escopo |
|------|--------|
| `/politica-acesso` | Política dos lances (BIDs) |
| `/politica-acesso-wt-pass` | Política do WT Pass |

Telas sem menu lateral; exigem aceite antes de usar o módulo correspondente.

---

## Rotas do frontend

Base: `http://localhost:4201` (dev) ou URL de produção.

| Rota | Componente | Perfis |
|------|------------|--------|
| `/login` | Login | Público |
| `/dashboard` | Início | ADMIN, USER |
| `/eventos-rh` | WT Pass (lista) | ADMIN, USER |
| `/eventos-rh/manage` | Gerenciar WT Pass | ADMIN |
| `/minhas-apostas` | Meus BIDs | ADMIN, USER |
| `/profile` | Meu perfil | ADMIN, USER |
| `/historico` | Histórico | ADMIN, USER |
| `/users` | Usuários | ADMIN |
| `/groups` | Grupos | ADMIN |
| `/matches/manage` | Gerenciar BIDs | ADMIN |
| `/relatorios` | Relatórios | ADMIN |
| `/settings` | Configurações | ADMIN |
| `/settings/templates-email/new` | Novo template | ADMIN |
| `/settings/templates-email/edit/:id` | Editar template | ADMIN |
| `/email/disparo` | Disparo de e-mails | ADMIN |
| `/auditoria` | Auditoria | ADMIN |
| `/monitor` | Monitor (também em Configurações) | ADMIN |
| `/tenants-status` | Status Azure (também em Configurações) | ADMIN |
| `/reception` | App Portaria | ADMIN, PORTARIA |
| `/reception/confirmados` | Confirmados | ADMIN, PORTARIA |
| `/portaria-supervisor` | Supervisor Portaria | ADMIN |
| `/politica-acesso` | Política BIDs | ADMIN, USER |
| `/politica-acesso-wt-pass` | Política WT Pass | ADMIN, USER |

---

## Tecnologias

### Backend

- **Node.js** + **Express**
- **MySQL** (mysql2)
- **Autenticação**: JWT + **Passport** (Azure AD OAuth Bearer)
- **Validação**: Joi
- **E-mail**: Nodemailer
- **Agendamento**: node-cron
- **Upload**: Multer (avatars, banners, políticas PDF, papel timbrado)
- **PDF**: pdfkit, puppeteer
- **Planilhas**: xlsx

### Frontend

- **Angular 21**
- **MSAL Angular** (login Microsoft)
- **Tailwind CSS**
- **TinyMCE** (templates de e-mail)
- **jsPDF** / **pdf-lib** / **pdfjs-dist** (PDFs e timbrado)
- **SweetAlert2**
- **xlsx** (import/export Excel)

---

## Pré-requisitos

- **Node.js** 18+ (recomendado 20+)
- **MySQL** 8+ (ou MariaDB compatível)
- **npm** 11+
- Conta **Azure AD** (tenant(s)) para login corporativo (opcional)

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

Na pasta `backend`, crie o arquivo `.env` (use `backend/.env.example` como base):

```env
# Servidor
PORT=3005

# Banco de dados MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=dbbid

# Azure AD — tenant principal
AZURE_TENANT_ID=seu-tenant-id
AZURE_CLIENT_ID=seu-client-id
AZURE_CLIENT_SECRET=seu-client-secret

# Azure AD — tenant secundário (opcional)
AZURE_TENANT_ID_2=
AZURE_CLIENT_ID_2=
AZURE_CLIENT_SECRET_2=

# JWT (ex: openssl rand -hex 64)
JWT_SECRET=seu-jwt-secret-aqui

# CORS (origens permitidas, separadas por vírgula)
CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://127.0.0.1:4201

# Cron — regras de pontuação (opcional)
# POINTS_CRON_INTERVAL_MINUTES=1

# Cron — auto-encerramento WT Pass (opcional, expressão cron)
# EVENTO_RH_AUTO_ENCERRAR_CRON=* * * * *
```

- O backend cria o banco e as tabelas na primeira execução (`config/setupDatabase.js`).
- **Não commite** o arquivo `.env`.

### Frontend — Ambiente

Em `frontend/src/environments/`:

- **environment.ts** (desenvolvimento): `apiUri` (ex.: `http://localhost:3005/api`) e `msalConfig` (clientId, authority).
- **environment.prod.ts** (produção): URLs da API e do app em produção.

---

## Executando o projeto

### Desenvolvimento

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

Servidor em `http://localhost:3005`.

**Terminal 2 — Frontend**

```bash
cd frontend
npm start
```

Aplicação em `http://127.0.0.1:4201` (porta definida em `package.json`).

### Produção

**Backend**

```bash
cd backend
npm start
```

**Frontend**

```bash
cd frontend
npm run build
```

Sirva `frontend/dist/` com Nginx/Apache e configure proxy para `/api` → backend.

---

## API (Backend)

Base URL: `http://localhost:3005/api`

Uploads estáticos: `http://localhost:3005/api/uploads/...` ou `http://localhost:3005/uploads/...`

### Autenticação — `/api/auth`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/login` | Login local (JWT) | — |
| POST | `/login-microsoft` | Login Azure AD (Bearer token) | — |
| POST | `/logout` | Logout | — |

### Usuários — `/api/users`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar usuários | — |
| POST | `/`, `/create` | Criar usuário | — |
| GET | `/:id` | Obter por ID | — |
| PUT | `/:id` | Atualizar usuário | — |
| DELETE | `/:id` | Excluir usuário | — |
| PUT | `/:id/perfil` | Alterar perfil (ADMIN/USER/PORTARIA) | — |
| PUT | `/:id/pontos` | Ajustar pontos | — |
| PUT | `/:id/status` | Ativar/desativar | — |
| PUT | `/:id/grupo` | Alterar grupo | — |
| PUT | `/:id/theme` | Tema do usuário | JWT |
| GET | `/:id/historico` | Histórico de pontos | — |
| GET | `/:id/stats` | Estatísticas | — |
| POST | `/upload-avatar` | Upload de avatar | JWT |
| GET | `/tenants-status` | Status dos tenants Azure | ADMIN |
| POST | `/sync` | Sincronizar usuários do AD | ADMIN |
| POST | `/import`, `/bulk-update` | Importação em lote (Excel) | ADMIN |
| POST | `/batch-points` | Pontos em lote | — |
| POST | `/batch-group` | Grupo em lote | — |
| GET | `/grupos-apostas` | Grupos para apostas | — |

### Grupos — `/api/groups`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar grupos | JWT |
| POST | `/` | Criar grupo | ADMIN |
| PUT | `/:id` | Atualizar grupo | ADMIN |
| DELETE | `/:id` | Excluir grupo | ADMIN |
| GET | `/user/:userId` | Grupos do usuário | JWT |

### Partidas (BIDs) — `/api/matches`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar partidas | JWT |
| GET | `/my-bets/:userId` | Apostas do usuário | JWT |
| GET | `/public/history` | Histórico público | JWT |
| GET | `/:id/banner` | Imagem do banner | — |
| POST | `/` | Criar partida | ADMIN |
| PUT | `/:id` | Atualizar partida | ADMIN |
| DELETE | `/:id` | Excluir partida | ADMIN |
| POST | `/finish` | Encerrar e sortear | ADMIN |
| GET | `/:id/winners-report` | Relatório ganhadores | ADMIN |
| GET | `/:id/bets-report` | Relatório de lances | ADMIN |
| POST | `/:id/redistribuir` | Redistribuir ingressos | ADMIN |
| POST | `/:id/acrescentar-ingressos` | Acrescentar ingressos | ADMIN |
| POST | `/bet` | Realizar aposta | JWT |
| GET | `/balance/:userId` | Saldo e pontos em jogo | JWT |

### Convidados — `/api/guests`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/user/:userId` | Listar convidados | JWT |
| POST | `/` | Criar convidado | JWT |
| PUT | `/:id` | Atualizar convidado | JWT |
| DELETE | `/:id` | Excluir convidado | JWT |
| PUT | `/assign-ticket/:apostaId` | Atribuir convidado ao ingresso | JWT |

### Portaria — `/api/reception`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/debug` | Diagnóstico (dev) | ADMIN, PORTARIA |
| GET | `/events/today` | Eventos por data (`?date=YYYY-MM-DD`; passado permitido) | ADMIN, PORTARIA |
| GET | `/events/dates` | Datas com eventos no intervalo (`?from=&to=`) | ADMIN, PORTARIA |
| GET | `/events/:eventId/guests` | Convidados do evento (`?tipo=BID\|WT_PASS`) | ADMIN, PORTARIA |
| POST | `/checkin` | Check-in (BID ou WT Pass) | ADMIN, PORTARIA |

### Supervisor Portaria — `/api/reception/supervisor`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/acessos` | Lista de acessos (`from`, `to`, `tipo`, `status`, `q`) | ADMIN |
| GET | `/acessos/:tipo/:id` | Detalhe (`tipo`: `BID` ou `WT_PASS`) | ADMIN |
| POST | `/acessos/:tipo/:id/cancelar` | Cancelar liberação (`motivo` obrigatório) | ADMIN |

### Configurações — `/api/settings`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Configurações gerais | ADMIN |
| POST | `/` | Atualizar configurações | ADMIN |
| GET | `/export` | Config. de exportação PDF | JWT |
| GET | `/bid-policy` | Política BIDs (texto) | JWT |
| GET | `/bid-policy/document` | PDF política BIDs | JWT |
| POST | `/bid-policy/pdf` | Upload PDF política BIDs | ADMIN |
| GET | `/wt-pass-policy` | Política WT Pass | JWT |
| GET | `/wt-pass-policy/document` | PDF política WT Pass | JWT |
| POST | `/wt-pass-policy/pdf` | Upload PDF WT Pass | ADMIN |
| GET | `/wt-pass` | Config. WT Pass | ADMIN |
| POST | `/wt-pass` | Atualizar config. WT Pass | ADMIN |
| POST | `/letterhead` | Upload papel timbrado | ADMIN |
| GET | `/letterhead` | Obter papel timbrado | JWT |

### Regras de pontuação — `/api/points-rules`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar regras | ADMIN |
| POST | `/` | Criar regra | ADMIN |
| PUT | `/:id` | Atualizar regra | ADMIN |
| PUT | `/:id/toggle` | Ativar/desativar regra | ADMIN |
| DELETE | `/:id` | Excluir regra | ADMIN |

### Setores — `/api/sectors`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar setores | ADMIN |
| GET | `/organograma` | Empresas com setores aninhados | ADMIN |

### Setores de evento — `/api/setores-evento`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar setores de evento | JWT |
| POST | `/` | Criar setor | ADMIN |
| DELETE | `/:id` | Excluir setor | ADMIN |

### Auditoria — `/api/audits`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Consultar logs | ADMIN |

### Monitor de erros — `/api/system-errors`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Listar erros | ADMIN |
| PUT | `/:id/resolve` | Marcar como resolvido | ADMIN |
| DELETE | `/` | Limpar histórico | ADMIN |

### E-mail — `/api/email`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/lists` | Listar listas | ADMIN |
| POST | `/lists` | Criar lista | ADMIN |
| PUT | `/lists/:id` | Atualizar lista | ADMIN |
| DELETE | `/lists/:id` | Excluir lista | ADMIN |
| GET | `/lists/:listaId/itens` | Itens da lista | ADMIN |
| POST | `/lists/:listaId/itens` | Adicionar item | ADMIN |
| DELETE | `/lists/:listaId/itens/:itemId` | Remover item | ADMIN |
| POST | `/lists/:listaId/import-csv` | Importar CSV | ADMIN |
| POST | `/lists/:listaId/import-users` | Importar do banco | ADMIN |
| GET | `/templates` | Listar templates | ADMIN |
| GET | `/templates/:id` | Obter template | ADMIN |
| POST | `/templates` | Criar template | ADMIN |
| PUT | `/templates/:id` | Atualizar template | ADMIN |
| DELETE | `/templates/:id` | Excluir template | ADMIN |
| GET | `/templates/:templateId/preview` | Preview | JWT |
| POST | `/templates/preview-draft` | Preview rascunho | JWT |
| POST | `/templates/:templateId/test` | E-mail de teste | ADMIN |
| GET | `/partida/:partidaId/disparos-log` | Log de disparos | ADMIN |
| GET | `/partida/:partidaId/pdf-ganhadores` | PDF ganhadores | ADMIN |
| POST | `/send` | Disparo em massa | ADMIN |
| POST | `/test` | Teste SMTP | ADMIN |

### WT Pass — `/api/eventos-rh`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Eventos abertos (usuário) | JWT |
| GET | `/historico` | Histórico do usuário | JWT |
| GET | `/admin/todos` | Todos os eventos (admin) | ADMIN |
| GET | `/admin/evento/:id/descricao` | Descrição para admin | ADMIN |
| GET | `/:id` | Detalhe do evento | JWT |
| GET | `/:id/lista-participantes` | Participantes (colaborador) | JWT |
| GET | `/:id/inscritos` | Inscritos e fila (admin) | ADMIN |
| POST | `/` | Criar evento | ADMIN |
| PUT | `/:id` | Atualizar evento | ADMIN |
| DELETE | `/:id` | Excluir evento | ADMIN |
| POST | `/:id/inscrever` | Inscrever-se | JWT |
| DELETE | `/:id/inscrever` | Cancelar inscrição | JWT |
| POST | `/:id/presenca` | Marcar presença | ADMIN |

---

## Tarefas agendadas (Cron)

| Cron | Ficheiro | Função |
|------|----------|--------|
| Regras de pontuação | `backend/cron/automations.js` | Acumula pontos por empresa/setor conforme `regras_pontuacao` ativas. Intervalo: `POINTS_CRON_INTERVAL_MINUTES` (padrão: 1 min) |
| Auto-encerramento WT Pass | `backend/cron/eventoRhAutoClose.js` | Encerra inscrições com `auto_encerrar=1` após `data_limite_inscricao`. Expressão: `EVENTO_RH_AUTO_ENCERRAR_CRON` (padrão: `* * * * *`) |

> A marcação automática de falta (`FALTOU` / `NAO_RETIRADA`) após o evento foi **desativada**. Presença e falta são tratadas manualmente (admin/portaria). Para reverter faltas aplicadas indevidamente, use o script `reverter-faltas-wt-pass`.

---

## Estrutura do projeto

```
BID/
├── backend/
│   ├── config/          # setupDatabase, db, passport, azureAuth
│   ├── controllers/     # Lógica de negócio por módulo (reception, receptionSupervisor, integracao, etc.)
│   ├── cron/            # automations.js, eventoRhAutoClose.js
│   ├── middleware/      # authMiddleware, validateRequest
│   ├── routes/          # Rotas REST da API
│   ├── scripts/         # migrate.js, reverterFaltasWtPassAuto.js, etc.
│   ├── utils/           # receptionQueries, portariaPrazoCheckin, cpf, etc.
│   ├── uploads/         # Avatares, banners, políticas, timbrado (não versionar)
│   ├── validations/     # Schemas Joi
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/app/
│   │   ├── components/   # reception-date-picker, login-carousel, etc.
│   │   ├── guards/       # AuthGuard
│   │   ├── interceptors/ # JWT
│   │   ├── layouts/      # MainLayout, AuthLayout
│   │   ├── pages/        # Dashboard, users, matches, eventos-rh, reception, portaria-supervisor, etc.
│   │   ├── services/     # auth, match, user, evento-rh, reception-supervisor, email, etc.
│   │   └── utils/        # CPF, export XLSX, formatar-texto, portaria-prazo, WT Pass
│   └── environments/
└── README.md
```

---

## Banco de dados

Criado e migrado automaticamente ao subir o backend. Principais entidades:

| Tabela | Descrição |
|--------|-----------|
| `empresas`, `setores` | Organograma |
| `grupos` | Grupos de apostas |
| `usuarios` | Usuários (AD + local), pontos, perfil, empresa/setor/grupo |
| `convidados` | Convidados por usuário |
| `partidas` | BIDs (datas, custo, status, grupo, setor_evento) |
| `apostas` | Lances (partida, usuário, pontos, status) |
| `ingressos` | Bilhetes (check-in, assinatura, recebedor) |
| `regras_pontuacao` | Regras de acúmulo automático (cron) |
| `historico_pontos` | Movimentações de saldo |
| `auditoria` | Logs de ações administrativas |
| `logs_erros` | Erros do sistema (monitor) |
| `configuracoes` | Configurações gerais, SMTP, políticas |
| `templates_email`, `listas_email`, `listas_email_itens` | E-mail |
| `setores_evento` | Catálogo de setores (Cadeira, Pista, etc.) |
| `eventos_rh` | Eventos WT Pass |
| `inscricoes_rh` | Inscrições WT Pass (incl. campos `portaria_*` para check-in) |
| `bloqueios_eventos_rh` | Bloqueios por falta de presença |

---

## Scripts úteis

### Backend

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor com nodemon |
| `npm start` | Servidor em produção |
| `npm run migrate` | Executar migrações manuais |
| `npm run reset-db` | Reset do banco (cuidado em produção) |
| `npm run reverter-faltas-wt-pass` | Reverter `FALTOU` → `INSCRITO` (WT Pass); ver `scripts/reverterFaltasWtPassAuto.js` |

### Frontend

| Comando | Descrição |
|---------|-----------|
| `npm start` | `ng serve` na porta 4201 |
| `npm run build` | Build de produção |
| `npm test` | Testes (Vitest) |

---

## Licença

ISC.

---

Para dúvidas ou contribuições, abra uma issue ou pull request no repositório.
