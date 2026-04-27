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
        (SELECT GROUP_CONCAT(DISTINCT p.titulo SEPARATOR ', ') FROM ingressos i JOIN apostas a ON i.aposta_id = a.id JOIN partidas p ON a.partida_id = p.id WHERE i.convidado_id = c.id AND a.status = 'GANHOU') as eventos_participados
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
    await gravarAuditoria(null, req.user?.id, "CONVIDADOS", "UPDATE", id, {
      nome_completo,
      cpf,
    });
    res.json({ message: "Convidado atualizado!" });
  } catch (error) {
    await logErro("GUEST_CONTROLLER_UPDATE_GUEST", error);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
};

exports.deleteGuest = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute("SELECT id, nome_completo FROM convidados WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Convidado não encontrado." });
    }
    await db.execute("DELETE FROM convidados WHERE id = ?", [id]);
    await gravarAuditoria(null, req.user?.id, "CONVIDADOS", "DELETE", id, {
      nome_completo: rows[0].nome_completo,
    });
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

  if (!ingressoId)
    return res
      .status(400)
      .json({ error: "ID do ingresso não foi identificado." });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [ticketData] = await connection.execute(
      "SELECT checkin FROM ingressos WHERE id = ? AND usuario_id = ? FOR UPDATE",
      [ingressoId, usuario_id],
    );
    if (ticketData.length === 0) {
      await connection.rollback();
      return res
        .status(403)
        .json({ error: "Ingresso inválido ou não pertence a você." });
    }
    if (ticketData[0].checkin === 1) {
      await connection.rollback();
      return res.status(403).json({
        error: "Bloqueado! Este ingresso já foi retirado na portaria.",
      });
    }

    await connection.execute(
      `SELECT i.id FROM ingressos i
       INNER JOIN apostas a ON i.aposta_id = a.id
       WHERE i.usuario_id = ?
         AND a.partida_id = (
           SELECT a2.partida_id FROM ingressos i2
           INNER JOIN apostas a2 ON i2.aposta_id = a2.id
           WHERE i2.id = ?
         )
       ORDER BY i.id FOR UPDATE`,
      [usuario_id, ingressoId],
    );

    if (!convidado_id) {
      await connection.rollback();
      return res.status(400).json({ error: "Convidado não informado." });
    }

    const [guestOwned] = await connection.execute(
      "SELECT nome_completo FROM convidados WHERE id = ? AND usuario_id = ?",
      [convidado_id, usuario_id],
    );
    if (guestOwned.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        error: "Convidado inválido ou não pertence à sua conta.",
      });
    }

    const [dupOutroIngresso] = await connection.execute(
      `SELECT i2.id FROM ingressos i2
       INNER JOIN apostas a2 ON i2.aposta_id = a2.id
       WHERE i2.convidado_id = ?
         AND i2.id != ?
         AND i2.usuario_id = ?
         AND a2.partida_id = (
           SELECT a.partida_id FROM ingressos i
           INNER JOIN apostas a ON i.aposta_id = a.id
           WHERE i.id = ?
         )
       LIMIT 1`,
      [convidado_id, ingressoId, usuario_id, ingressoId],
    );
    if (dupOutroIngresso.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        error:
          "Cada convidado pode ser indicado em apenas um ingresso deste evento. Escolha outra pessoa ou remova a indicação duplicada.",
      });
    }

    const [userRows] = await connection.execute(
      "SELECT nome_completo FROM usuarios WHERE id = ?",
      [usuario_id],
    );
    const userName =
      userRows.length > 0 ? userRows[0].nome_completo : "Usuário";

    const guestName = guestOwned[0].nome_completo;

    await connection.execute(
      "UPDATE ingressos SET convidado_id = ? WHERE id = ?",
      [convidado_id, ingressoId],
    );

    await connection.commit();

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
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    await logErro("GUEST_CONTROLLER_ASSIGN_TICKET", error);
    res.status(500).json({
      error: "Erro interno ao vincular retirante. Verifique os logs.",
    });
  } finally {
    if (connection) connection.release();
  }
};
