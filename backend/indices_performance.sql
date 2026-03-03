-- Script de Criação de Índices para Melhoria de Performance (Etapa 4)
-- Execute este script diretamente no seu cliente MySQL (ex: DBeaver, phpMyAdmin, MySQL Workbench)

-- --------------------------------------------------------
-- Tabela: apostas
-- --------------------------------------------------------
-- Facilita as buscas por lances do usuário em uma partida específica (Dashboard e Minhas Apostas)
CREATE INDEX idx_apostas_partida_usuario ON apostas(partida_id, usuario_id);

-- Facilita a busca pelos vencedores de uma partida (Sorteio e Relatórios)
CREATE INDEX idx_apostas_partida_status ON apostas(partida_id, status);

-- Facilita a contagem de vitórias do usuário
CREATE INDEX idx_apostas_usuario_status ON apostas(usuario_id, status);

-- --------------------------------------------------------
-- Tabela: partidas
-- --------------------------------------------------------
-- Otimiza a listagem de partidas por status (ex: ABERTA, FINALIZADA) e ordenação por data (Histórico Público)
CREATE INDEX idx_partidas_status_data ON partidas(status, data_jogo);

-- Otimiza as buscas segmentadas por grupo (Filtro por departamento)
CREATE INDEX idx_partidas_grupo ON partidas(grupo_id);

-- --------------------------------------------------------
-- Tabela: usuarios
-- --------------------------------------------------------
-- Acelera o processo de login e sincronização com Active Directory
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_microsoft_id ON usuarios(microsoft_id);
CREATE INDEX idx_usuarios_username ON usuarios(username);

-- Acelera as consultas e updates que filtram usuários em massa por grupo e setor
CREATE INDEX idx_usuarios_grupo ON usuarios(grupo_id);
CREATE INDEX idx_usuarios_setor ON usuarios(setor_id);

-- --------------------------------------------------------
-- Tabela: ingressos
-- --------------------------------------------------------
-- Otimiza as queries de JOIN com a tabela de apostas, usuários e convidados (Recepção e Minhas Apostas)
CREATE INDEX idx_ingressos_aposta ON ingressos(aposta_id);
CREATE INDEX idx_ingressos_usuario ON ingressos(usuario_id);
CREATE INDEX idx_ingressos_convidado ON ingressos(convidado_id);

-- --------------------------------------------------------
-- Tabela: convidados
-- --------------------------------------------------------
-- Acelera a listagem de convidados de um usuário específico (Modal de Retirantes)
CREATE INDEX idx_convidados_usuario ON convidados(usuario_id);

-- --------------------------------------------------------
-- Tabela: historico_pontos
-- --------------------------------------------------------
-- Melhora a extração de extrato de pontos do usuário ordenado por data
CREATE INDEX idx_historico_usuario_data ON historico_pontos(usuario_id, data_alteracao);
