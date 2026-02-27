const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");

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
        safeAuditoriaDetalhes(detalhes),
      ],
    );
  } catch (e) {
    await logErro("GUEST_CONTROLLER_GRAVAR_AUDITORIA", e);
  }
}

exports.getGuests = async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT c.*,
        (SELECT GROUP_CONCAT(DISTINCT p.titulo SEPARATOR ', ') FROM apostas a JOIN partidas p ON a.partida_id = p.id WHERE a.convidado_id = c.id AND a.status = 'GANHOU') as eventos_participados
      FROM convidados c WHERE c.usuario_id = ? ORDER BY c.nome_completo ASC
    `;
    const [rows] = await db.execute(query, [userId]);
    res.json(rows);
  } catch (error) {
    await logErro("GUEST_CONTROLLER_GET_GUESTS", error);
    res.status(500).json({ error: "Erro ao buscar convidados." });
  }
};

exports.createGuest = async (req, res) => {
  const { usuario_id, nome_completo, cpf, email, telefone } = req.body;
  try {
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
    await logErro("GUEST_CONTROLLER_CREATE_GUEST", error);
    res.status(500).json({ error: "Erro ao salvar convidado." });
  }
};

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
    await logErro("GUEST_CONTROLLER_UPDATE_GUEST", error);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
};

exports.deleteGuest = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM convidados WHERE id = ?", [id]);
    res.json({ message: "Convidado excluído!" });
  } catch (error) {
    await logErro("GUEST_CONTROLLER_DELETE_GUEST", error);
    res.status(500).json({ error: "Erro ao excluir." });
  }
};

exports.assignGuestToTicket = async (req, res) => {
  const ingressoId =
    req.params.ingressoId || req.params.apostaId || req.params.id;
  const { convidado_id, usuario_id } = req.body;

  try {
    if (!ingressoId)
      return res
        .status(400)
        .json({ error: "ID do ingresso não foi identificado." });

    const [ticketData] = await db.execute(
      "SELECT checkin FROM ingressos WHERE id = ? AND usuario_id = ?",
      [ingressoId, usuario_id],
    );
    if (ticketData.length === 0)
      return res
        .status(403)
        .json({ error: "Ingresso inválido ou não pertence a você." });
    if (ticketData[0].checkin === 1)
      return res
        .status(403)
        .json({
          error: "Bloqueado! Este ingresso já foi retirado na portaria.",
        });

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

    await db.execute("UPDATE ingressos SET convidado_id = ? WHERE id = ?", [
      convidado_id,
      ingressoId,
    ]);

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
    await logErro("GUEST_CONTROLLER_ASSIGN_TICKET", error);
    res
      .status(500)
      .json({
        error: "Erro interno ao vincular retirante. Verifique os logs.",
      });
  }
};
