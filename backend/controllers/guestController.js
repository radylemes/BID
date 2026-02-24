const db = require("../config/db");

// ============================================================
// MOTOR DE AUDITORIA INVISÍVEL
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
    console.error("Falha ao gravar auditoria no GuestController:", e.message);
  }
}

// 1. Listar convidados do usuário (já trazendo os eventos que participaram)
exports.getGuests = async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT 
        c.*,
        (
          SELECT GROUP_CONCAT(DISTINCT p.titulo SEPARATOR ', ')
          FROM apostas a
          JOIN partidas p ON a.partida_id = p.id
          WHERE a.convidado_id = c.id AND a.status = 'GANHOU'
        ) as eventos_participados
      FROM convidados c
      WHERE c.usuario_id = ?
      ORDER BY c.nome_completo ASC
    `;
    const [rows] = await db.execute(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error("Erro getGuests:", error);
    res.status(500).json({ error: "Erro ao buscar convidados." });
  }
};

// 2. Criar novo convidado
exports.createGuest = async (req, res) => {
  const { usuario_id, nome_completo, cpf, email, telefone } = req.body;
  try {
    // Busca o NOME do usuário para a auditoria
    const [userRows] = await db.execute(
      "SELECT nome_completo FROM usuarios WHERE id = ?",
      [usuario_id],
    );
    const userName =
      userRows.length > 0 ? userRows[0].nome_completo : "Usuário";

    const [result] = await db.execute(
      "INSERT INTO convidados (usuario_id, nome_completo, cpf, email, telefone) VALUES (?, ?, ?, ?, ?)",
      [usuario_id, nome_completo, cpf, email || null, telefone || null],
    );

    // Grava a auditoria com o nome claro
    await gravarAuditoria(
      null,
      usuario_id,
      "CONVIDADOS",
      "CREATE_GUEST",
      result.insertId,
      {
        usuario: userName,
        convidado_cadastrado: nome_completo,
        cpf,
        motivo: `${userName} cadastrou o acompanhante/retirante: ${nome_completo}.`,
      },
    );

    res.json({ message: "Convidado salvo com sucesso!", id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar convidado." });
  }
};

// 3. Atualizar convidado
exports.updateGuest = async (req, res) => {
  const { id } = req.params;
  const { nome_completo, cpf, email, telefone } = req.body;
  try {
    await db.execute(
      "UPDATE convidados SET nome_completo = ?, cpf = ?, email = ?, telefone = ? WHERE id = ?",
      [nome_completo, cpf, email || null, telefone || null, id],
    );
    res.json({ message: "Convidado atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar." });
  }
};

// 4. Excluir convidado
exports.deleteGuest = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM convidados WHERE id = ?", [id]);
    res.json({ message: "Convidado excluído!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
};

// 5. Vincular convidado ao Ingresso Específico (Blindado contra erros de rota)
exports.assignGuestToTicket = async (req, res) => {
  // Pega o ID venha ele com o nome que vier da rota!
  const ingressoId =
    req.params.ingressoId || req.params.apostaId || req.params.id;
  const { convidado_id, usuario_id } = req.body;

  try {
    if (!ingressoId) {
      console.error("❌ Erro: ID do ingresso não chegou ao Controller!");
      return res
        .status(400)
        .json({ error: "ID do ingresso não foi identificado." });
    }

    // 1. Verifica se o INGRESSO existe e se já foi retirado
    const [ticketData] = await db.execute(
      "SELECT checkin FROM ingressos WHERE id = ? AND usuario_id = ?",
      [ingressoId, usuario_id],
    );

    if (ticketData.length === 0) {
      return res
        .status(403)
        .json({ error: "Ingresso inválido ou não pertence a você." });
    }

    if (ticketData[0].checkin === 1) {
      return res.status(403).json({
        error: "Bloqueado! Este ingresso já foi retirado na portaria.",
      });
    }

    // 2. Busca nomes para auditoria
    const [userRows] = await db.execute(
      "SELECT nome_completo FROM usuarios WHERE id = ?",
      [usuario_id],
    );
    const userName =
      userRows.length > 0 ? userRows[0].nome_completo : "Usuário";

    const [guestRows] = await db.execute(
      "SELECT nome_completo FROM convidados WHERE id = ?",
      [convidado_id],
    );
    const guestName =
      guestRows.length > 0
        ? guestRows[0].nome_completo
        : "Convidado Desconhecido";

    // 3. Atualiza o INGRESSO específico
    await db.execute("UPDATE ingressos SET convidado_id = ? WHERE id = ?", [
      convidado_id,
      ingressoId,
    ]);

    // 4. Grava Auditoria (Validação extra para não quebrar se a função global faltar)
    if (typeof gravarAuditoria === "function") {
      await gravarAuditoria(
        null,
        usuario_id,
        "BIDS",
        "ASSIGN_TICKET",
        ingressoId,
        {
          usuario: userName,
          convidado: guestName,
          motivo: `${userName} definiu ${guestName} como retirante do ingresso #${ingressoId}.`,
        },
      );
    }

    res.json({ message: "Retirante vinculado com sucesso!" });
  } catch (error) {
    console.error("❌ Erro fatal no assignGuestToTicket:", error);
    res
      .status(500)
      .json({
        error: "Erro interno ao vincular retirante. Verifique os logs.",
      });
  }
};
