const db = require("../config/db");

// ============================================================
// MOTOR DE AUDITORIA
// ============================================================
async function gravarAuditoria(
  connection,
  adminId,
  modulo,
  acao,
  registroId,
  detalhes,
) {
  try {
    const executor = connection || db;
    await executor.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [
        adminId || 1,
        modulo,
        acao,
        registroId || null,
        JSON.stringify(detalhes),
      ],
    );
  } catch (e) {
    console.error("Falha ao gravar auditoria nas Regras de Pontos:", e.message);
  }
}

exports.getRules = async (req, res) => {
  try {
    // Busca as regras já trazendo o Nome do Grupo e o Nome do Setor (se houver)
    const [rows] = await db.query(`
      SELECT r.*, g.nome as grupo_nome, s.nome as setor_nome 
      FROM regras_pontuacao r
      LEFT JOIN grupos g ON r.grupo_id = g.id
      LEFT JOIN setores s ON r.setor_id = s.id
      ORDER BY r.criado_em DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar regras." });
  }
};

exports.createRule = async (req, res) => {
  const {
    descricao,
    pontos,
    frequencia_valor,
    frequencia_tipo,
    grupo_id,
    perfil_alvo,
    setor_id,
    somente_ativos,
    adminId,
  } = req.body;

  const grupoIdFinal =
    grupo_id === "GLOBAL" || !grupo_id ? null : parseInt(grupo_id);
  const setorIdFinal = !setor_id ? null : parseInt(setor_id);
  const perfilFinal = !perfil_alvo ? null : perfil_alvo;
  const ativosFinal =
    somente_ativos === undefined ? 1 : parseInt(somente_ativos);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO regras_pontuacao (
        descricao, pontos, frequencia_valor, frequencia_tipo, 
        grupo_id, perfil_alvo, setor_id, somente_ativos, proxima_execucao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        descricao,
        pontos,
        frequencia_valor,
        frequencia_tipo,
        grupoIdFinal,
        perfilFinal,
        setorIdFinal,
        ativosFinal,
      ],
    );

    await gravarAuditoria(
      connection,
      adminId,
      "CONFIG_PONTOS",
      "CREATE_RULE",
      result.insertId,
      {
        descricao,
        pontos,
        grupo_id: grupoIdFinal,
        perfil: perfilFinal,
        setor: setorIdFinal,
        ativos: ativosFinal,
      },
    );

    await connection.commit();
    res.json({ message: "Regra criada com sucesso!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro ao criar regra." });
  } finally {
    connection.release();
  }
};

exports.updateRule = async (req, res) => {
  const { id } = req.params;
  const {
    descricao,
    pontos,
    frequencia_valor,
    frequencia_tipo,
    grupo_id,
    perfil_alvo,
    setor_id,
    somente_ativos,
    adminId,
  } = req.body;

  const grupoIdFinal =
    grupo_id === "GLOBAL" || !grupo_id ? null : parseInt(grupo_id);
  const setorIdFinal = !setor_id ? null : parseInt(setor_id);
  const perfilFinal = !perfil_alvo ? null : perfil_alvo;
  const ativosFinal =
    somente_ativos === undefined ? 1 : parseInt(somente_ativos);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE regras_pontuacao 
       SET descricao = ?, pontos = ?, frequencia_valor = ?, frequencia_tipo = ?, 
           grupo_id = ?, perfil_alvo = ?, setor_id = ?, somente_ativos = ?
       WHERE id = ?`,
      [
        descricao,
        pontos,
        frequencia_valor,
        frequencia_tipo,
        grupoIdFinal,
        perfilFinal,
        setorIdFinal,
        ativosFinal,
        id,
      ],
    );

    await gravarAuditoria(
      connection,
      adminId,
      "CONFIG_PONTOS",
      "UPDATE_RULE",
      id,
      {
        descricao,
        pontos,
        grupo_id: grupoIdFinal,
        perfil: perfilFinal,
        setor: setorIdFinal,
        ativos: ativosFinal,
      },
    );

    await connection.commit();
    res.json({ message: "Regra atualizada!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro ao atualizar regra." });
  } finally {
    connection.release();
  }
};

exports.toggleRule = async (req, res) => {
  const { id } = req.params;
  const { ativo, adminId } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const updateProxima = ativo ? ", proxima_execucao = NOW()" : "";

    await connection.execute(
      `UPDATE regras_pontuacao SET ativo = ? ${updateProxima} WHERE id = ?`,
      [ativo, id],
    );

    await gravarAuditoria(
      connection,
      adminId,
      "CONFIG_PONTOS",
      "TOGGLE_RULE",
      id,
      { status: ativo ? "Ativada" : "Pausada" },
    );

    await connection.commit();
    res.json({ message: "Status alterado!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro ao alterar status." });
  } finally {
    connection.release();
  }
};

exports.deleteRule = async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.query;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rule] = await connection.execute(
      "SELECT descricao FROM regras_pontuacao WHERE id = ?",
      [id],
    );
    const nomeRegra = rule.length > 0 ? rule[0].descricao : "Desconhecida";

    await connection.execute("DELETE FROM regras_pontuacao WHERE id = ?", [id]);

    await gravarAuditoria(
      connection,
      adminId,
      "CONFIG_PONTOS",
      "DELETE_RULE",
      id,
      { regra_apagada: nomeRegra },
    );

    await connection.commit();
    res.json({ message: "Regra apagada!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro ao apagar regra." });
  } finally {
    connection.release();
  }
};
