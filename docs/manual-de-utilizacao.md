# Manual de Utilização do Sistema BID

## 1) Descrição do sistema

O **BID** é uma plataforma corporativa para gestão de apostas em eventos e distribuição de ingressos, com recursos de:

- cadastro e gestão de usuários;
- gestão de grupos e partidas/eventos;
- apostas com consumo de pontos;
- portaria para confirmação de entrada (check-in);
- auditoria e monitoramento de erros;
- gestão de templates e disparo de e-mails;
- suporte a múltiplos tenants Microsoft/Azure AD.

O sistema possui perfis de acesso com permissões específicas:

- `ADMIN`: administração completa;
- `USER`: apostas, histórico e perfil;
- `PORTARIA`: operação de check-in na entrada de eventos.

---

## 2) Acesso ao sistema

1. Abra a aplicação no navegador.
2. Acesse a tela de login.
3. Entre com:
   - autenticação corporativa Microsoft (quando habilitada), ou
   - usuário e senha local.
4. Após autenticar, o sistema direciona para a área permitida ao seu perfil.

Se ocorrer falha de acesso:

- confirme usuário/senha;
- verifique se o usuário está ativo;
- confirme se o perfil possui permissão para a tela;
- em caso de erro recorrente, acione o administrador.

---

## 3) Navegação principal

No menu lateral (perfil `ADMIN` e `USER`), as telas principais são:

- **Dashboard**: visão geral, partidas abertas e ações rápidas.
- **Minhas apostas**: apostas realizadas pelo usuário.
- **Histórico**: partidas finalizadas e resultados.
- **Perfil**: dados pessoais, foto e preferências.
- **Eventos RH / Política de acesso** (quando habilitados): fluxos internos específicos.

Menus administrativos (`ADMIN`):

- **Usuários**
- **Grupos**
- **Gerenciar partidas**
- **Configurações**
- **Auditoria**
- **Monitor**
- **Status dos tenants**
- **Disparo de e-mails**

Portaria (`ADMIN` e `PORTARIA`):

- **Recepção**
- **Recepção confirmados**

---

## 4) Fluxos por perfil

## 4.1) Perfil USER

### Realizar aposta

1. Acesse **Dashboard**.
2. Selecione uma partida aberta.
3. Informe a quantidade de pontos da aposta.
4. Confirme a operação.
5. Valide o lançamento em **Minhas apostas**.

### Acompanhar resultados

1. Acesse **Minhas apostas** para status da sua participação.
2. Use **Histórico** para consultar partidas encerradas/finalizadas.

### Atualizar perfil

1. Acesse **Perfil**.
2. Atualize dados permitidos (incluindo avatar, quando habilitado).
3. Salve e confirme as alterações.

---

## 4.2) Perfil ADMIN

### Gestão de usuários

1. Acesse **Usuários**.
2. Crie, edite ou inative usuários.
3. Ajuste perfil de acesso (`ADMIN`, `USER`, `PORTARIA`), grupo e pontos.
4. Utilize ações em lote quando necessário.

### Gestão de grupos

1. Acesse **Grupos**.
2. Cadastre e mantenha grupos de apostas.
3. Vincule corretamente os grupos às regras de operação.

### Gestão de partidas/eventos

1. Acesse **Gerenciar partidas**.
2. Cadastre nova partida com período, custos em pontos e parâmetros do evento.
3. Durante a operação, acompanhe participantes e apostas.
4. Ao encerrar o evento, finalize a partida para apuração.
5. Gere relatórios de apostas/vencedores conforme necessidade.

### Configurações e comunicação

1. Acesse **Configurações** para ajustes gerais do sistema.
2. Gerencie templates de e-mail.
3. Acesse **Disparo de e-mails** para envio de campanhas/listas.

### Auditoria e monitoramento

1. Acesse **Auditoria** para rastrear ações por módulo/usuário.
2. Acesse **Monitor** para analisar erros do sistema e status de resolução.
3. Use **Status dos tenants** para validar conectividade e autenticação dos tenants Azure AD.

---

## 4.3) Perfil PORTARIA

### Confirmar entrada (check-in)

1. Acesse **Recepção**.
2. Pesquise o ingresso/participante (por documento ou dados cadastrais, conforme fluxo disponível).
3. Confirme dados do recebedor.
4. Registre assinatura, quando solicitado.
5. Conclua o check-in.

### Consultar confirmados

1. Acesse **Recepção confirmados**.
2. Pesquise registros já processados para validação de entrada.

---

## 5) Boas práticas de operação

- Mantenha perfis de acesso mínimos por função.
- Evite operações em lote sem revisão prévia dos dados.
- Antes de finalizar partidas, valide regras e dados de apostas.
- Registre e acompanhe erros no Monitor para correções rápidas.
- Revise templates antes de disparos em massa de e-mail.

---

## 6) Solução de problemas comuns

### Não consigo acessar uma tela

- Verifique seu perfil de acesso.
- Faça logout/login novamente.
- Se persistir, solicite revisão de permissões ao administrador.

### Aposta não aparece na listagem

- Atualize a tela e confira o status da partida.
- Verifique saldo de pontos e período válido da aposta.
- Consulte o histórico para confirmar processamento.

### Erro em upload de imagem/avatar/banner

- Verifique formato e tamanho do arquivo.
- Tente novamente com conexão estável.
- Se continuar falhando, acione o suporte técnico.

### Falha no envio de e-mail

- Confirme template e lista de destinatários.
- Revise configurações de envio no ambiente.
- Consulte o Monitor para detalhes técnicos.

---

## 7) Contato e suporte

Para suporte funcional ou técnico:

1. registre o problema com data, horário e tela afetada;
2. anexe evidências (mensagem de erro e captura de tela);
3. encaminhe para o time administrador do BID.

Esse procedimento acelera o diagnóstico e a resolução.

---

## 8) Manual de utilização por módulo

> Esta seção detalha **cada módulo funcional** disponível no BID, com foco em uso operacional.

## 8.1) Login (`/login`)

**Perfis:** `ADMIN`, `USER`, `PORTARIA`  
**Objetivo:** autenticar o usuário no sistema.

### Como usar

1. Acesse a URL do BID.
2. Informe credenciais válidas (Microsoft/Azure AD ou login local, conforme ambiente).
3. Clique em entrar.
4. Aguarde redirecionamento automático para sua área autorizada.

### Resultado esperado

- sessão iniciada;
- menus exibidos conforme o perfil.

---

## 8.2) Dashboard / Início (`/dashboard`)

**Perfis:** `ADMIN`, `USER`  
**Objetivo:** acompanhar visão geral e acessar rapidamente os eventos abertos para aposta.

### Como usar

1. Abra o menu **Início**.
2. Consulte os cards/indicadores de status.
3. Localize partidas/eventos em andamento.
4. Inicie aposta diretamente pelo card do evento.

### Boas práticas

- confirme data e status da partida antes de apostar;
- valide o saldo de pontos disponível.

---

## 8.3) WT Pass - Lista (`/eventos-rh`)

**Perfis:** `ADMIN`, `USER`  
**Objetivo:** consultar eventos RH (WT Pass) disponíveis.

### Como usar

1. Acesse **WT Pass** no menu principal.
2. Utilize filtros de busca quando disponíveis.
3. Abra o evento desejado para ver regras e elegibilidade.
4. Realize a ação permitida no evento (inscrição/consulta/validação).

### Resultado esperado

- visualização dos eventos vigentes e do seu status de participação.

---

## 8.4) WT Pass - Gestão (`/eventos-rh/manage`)

**Perfis:** `ADMIN`  
**Objetivo:** criar, editar e encerrar eventos WT Pass.

### Como usar

1. Acesse **Gerenciar WT Pass**.
2. Clique em novo cadastro ou selecione um evento existente.
3. Preencha dados obrigatórios (nome, período, regras e capacidade).
4. Salve e publique.
5. Monitore inscrições e atualize o status conforme a operação.

### Cuidados

- revise período de vigência antes da publicação;
- evite editar eventos já em execução sem comunicação prévia.

---

## 8.5) Meu Perfil (`/profile`)

**Perfis:** `ADMIN`, `USER`  
**Objetivo:** manter dados pessoais e avatar atualizados.

### Como usar

1. Acesse **Meu Perfil**.
2. Atualize os campos permitidos.
3. Faça upload de foto/avatar (quando habilitado).
4. Salve as alterações.

### Resultado esperado

- dados refletidos no cabeçalho e nas áreas de identificação do usuário.

---

## 8.6) Meus BIDs (`/minhas-apostas`)

**Perfis:** `ADMIN`, `USER`  
**Objetivo:** acompanhar apostas realizadas e seus status.

### Como usar

1. Acesse **Meus BIDs**.
2. Consulte as apostas por evento/partida.
3. Verifique quantidade de lances e pontos consumidos.
4. Acompanhe status (ativa, encerrada, apurada).

### Resultado esperado

- rastreabilidade total das suas apostas ativas e passadas.

---

## 8.7) Histórico / Hall da Fama (`/historico`)

**Perfis:** `ADMIN`, `USER`  
**Objetivo:** consultar resultados de partidas finalizadas e histórico de desempenho.

### Como usar

1. Acesse **Histórico**.
2. Aplique filtros por período, status ou evento (quando disponível).
3. Abra os registros para ver resultado e premiação.

### Boas práticas

- use este módulo para validação pós-apuração e conferência de resultados.

---

## 8.8) App Portaria (`/reception`)

**Perfis:** `ADMIN`, `PORTARIA`  
**Objetivo:** realizar check-in de entrada de participantes/convidados.

### Como usar

1. Acesse **App Portaria**.
2. Pesquise o participante (nome, documento ou identificador disponível).
3. Confirme os dados exibidos na tela.
4. Registre assinatura/validação quando exigido.
5. Confirme a entrada.

### Resultado esperado

- entrada registrada com horário e operador.

---

## 8.9) Recepção Confirmados (`/reception/confirmados`)

**Perfis:** `ADMIN`, `PORTARIA`  
**Objetivo:** consultar quem já realizou check-in.

### Como usar

1. Acesse a listagem de **confirmados**.
2. Pesquise por nome, documento ou período.
3. Valide registro de entrada antes de permitir novo atendimento.

### Resultado esperado

- prevenção de duplicidade de entrada e melhor controle da portaria.

---

## 8.10) Gerenciar Usuários (`/users`)

**Perfis:** `ADMIN`  
**Objetivo:** administrar contas, perfis e permissões.

### Como usar

1. Acesse **Gerenciar Usuários**.
2. Cadastre novo usuário ou edite um existente.
3. Defina perfil (`ADMIN`, `USER`, `PORTARIA`), grupo e pontos.
4. Salve e valide o acesso.

### Boas práticas

- aplique princípio do menor privilégio;
- revise usuários inativos periodicamente.

---

## 8.11) Gerenciar Grupos / Empresas (`/groups`)

**Perfis:** `ADMIN`  
**Objetivo:** organizar usuários por grupos/empresas e regras associadas.

### Como usar

1. Acesse **Gerenciar Grupos**.
2. Cadastre ou edite o grupo.
3. Associe usuários e parâmetros operacionais.
4. Salve e valide impactos nas permissões.

### Resultado esperado

- estrutura organizacional refletida corretamente nas operações.

---

## 8.12) Gestão de Bids (`/matches/manage`)

**Perfis:** `ADMIN`  
**Objetivo:** criar e administrar partidas/eventos de aposta.

### Como usar

1. Acesse **Gerenciar Bids**.
2. Cadastre nova partida com regras, período e custo em pontos.
3. Publique para os usuários elegíveis.
4. Acompanhe participação durante a vigência.
5. Encerre e finalize para apuração.

### Cuidados

- não finalize sem validar dados de participação;
- mantenha regras claras para evitar contestação.

---

## 8.13) Auditoria (`/auditoria`)

**Perfis:** `ADMIN`  
**Objetivo:** rastrear ações críticas e alterações no sistema.

### Como usar

1. Acesse **Auditoria**.
2. Filtre por usuário, módulo, ação e período.
3. Analise os logs para investigação ou conformidade.
4. Exporte evidências quando necessário.

### Resultado esperado

- trilha de auditoria para segurança e governança.

---

## 8.14) Disparo de E-mails (`/email/disparo`)

**Perfis:** `ADMIN`  
**Objetivo:** enviar comunicações em massa com base em listas e templates.

### Como usar

1. Acesse **Disparo de E-mails**.
2. Selecione lista de destinatários.
3. Escolha template aprovado.
4. Revise assunto/conteúdo.
5. Execute o envio.

### Cuidados

- sempre valide destinatários antes do envio final;
- teste template em amostra reduzida quando possível.

---

## 8.15) Configurações (`/settings`)

**Perfis:** `ADMIN`  
**Objetivo:** administrar parâmetros globais e templates.

### Como usar

1. Acesse **Configurações**.
2. Ajuste parâmetros necessários (regras gerais, integrações, comunicação).
3. Salve as alterações.
4. Valide comportamento no módulo afetado.

### Boas práticas

- registrar mudanças de configuração em rotina de controle interno;
- executar validação funcional após alterações críticas.

---

## 8.16) Editor de Template de E-mail (`/settings/templates-email/new` e `/settings/templates-email/edit/:id`)

**Perfis:** `ADMIN`  
**Objetivo:** criar e manter templates utilizados nos disparos.

### Como usar

1. Acesse criação (`new`) ou edição (`edit`).
2. Defina assunto e corpo do e-mail.
3. Salve o template.
4. Realize teste de renderização antes de uso em massa.

### Resultado esperado

- template disponível para seleção no módulo de disparo.

---

## 8.17) Monitor do Sistema (`/monitor`)

**Perfis:** `ADMIN`  
**Objetivo:** acompanhar erros técnicos e estabilidade operacional.

### Como usar

1. Acesse **Monitor do Sistema**.
2. Filtre por nível de erro, data e módulo.
3. Analise mensagens e stack traces disponíveis.
4. Encaminhe correções para o time técnico.

### Resultado esperado

- redução do tempo de diagnóstico e resposta a incidentes.

---

## 8.18) Status dos Tenants (`/tenants-status`)

**Perfis:** `ADMIN`  
**Objetivo:** verificar saúde das integrações de autenticação multi-tenant.

### Como usar

1. Acesse **Status dos tenants**.
2. Verifique conectividade e status de autenticação por tenant.
3. Identifique falhas de configuração/credenciais.
4. Ajuste parâmetros e revalide.

### Resultado esperado

- continuidade do login corporativo para tenants habilitados.

---

## 9) Matriz rápida de módulos por perfil

- `USER`: Login, Dashboard, WT Pass (lista), Meu Perfil, Meus BIDs, Histórico.
- `PORTARIA`: Login, App Portaria, Recepção Confirmados.
- `ADMIN`: acesso completo a todos os módulos.

