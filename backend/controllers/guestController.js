const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");

/** Normaliza CPF para 11 dígitos ou string vazia. */
function normalizarCpfDigits(cpf) {
  if (cpf == null || cpf === undefined) return "";
  return String(cpf).replace(/\D/g, "").slice(0, 11);
}

/** Valida dígitos verificadores do CPF brasileiro. */
function validarCpf(cpf) {
  const digits = normalizarCpfDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(digits[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(digits[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += Number(digits[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(digits[10]);
}

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
  const cpfDigits = normalizarCpfDigits(cpf);
  if (!validarCpf(cpfDigits)) {
    return res.status(400).json({ error: "CPF inválido." });
  }
  try {
    // Fallback de regra de negócio: evita duplicidade mesmo sem índice UNIQUE aplicado.
    const [dupRows] = await db.execute(
      "SELECT id FROM convidados WHERE usuario_id = ? AND cpf = ? LIMIT 1",
      [usuario_id, cpfDigits],
    );
    if (dupRows.length > 0) {
      return res.status(409).json({
        error: "Você já cadastrou um convidado com este CPF.",
      });
    }

    const [userRows] = await db.execute(
      "SELECT nome_completo FROM usuarios WHERE id = ?",
      [usuario_id],
    );
    const userName =
      userRows.length > 0 ? userRows[0].nome_completo : "Usuário";

    const [result] = await db.execute(
      "INSERT INTO convidados (usuario_id, nome_completo, cpf, email, telefone) VALUES (?, ?, ?, ?, ?)",
      [usuario_id, nome_completo, cpfDigits, email || null, telefone || null],
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
        cpf: cpfDigits,
        motivo: `${userName} cadastrou o acompanhante/retirante: ${nome_completo}.`,
      },
    );

    res.json({ message: "Convidado salvo com sucesso!", id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Você já cadastrou um convidado com este CPF.",
      });
    }
    await logErro("GUEST_CONTROLLER_CREATE_GUEST", error);
    res.status(500).json({ error: "Erro ao salvar convidado." });
  }
};

exports.updateGuest = async (req, res) => {
  const { id } = req.params;
  const { nome_completo, email, telefone } = req.body;
  try {
    await db.execute(
      "UPDATE convidados SET nome_completo = ?, email = ?, telefone = ? WHERE id = ?",
      [nome_completo, email || null, telefone || null, id],
    );
    await gravarAuditoria(null, req.user?.id, "CONVIDADOS", "UPDATE", id, {
      nome_completo,
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

  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const [eventTickets] = await connection.execute(
        `SELECT i.id, i.checkin FROM ingressos i
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

      const target = eventTickets.find(
        (r) => String(r.id) === String(ingressoId),
      );
      if (!target) {
        await connection.rollback();
        connection.release();
        return res
          .status(403)
          .json({ error: "Ingresso inválido ou não pertence a você." });
      }
      if (target.checkin === 1) {
        await connection.rollback();
        connection.release();
        return res.status(403).json({
          error: "Bloqueado! Este ingresso já foi retirado na portaria.",
        });
      }

      if (!convidado_id) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: "Convidado não informado." });
      }

      const [guestOwned] = await connection.execute(
        "SELECT nome_completo FROM convidados WHERE id = ? AND usuario_id = ?",
        [convidado_id, usuario_id],
      );
      if (guestOwned.length === 0) {
        await connection.rollback();
        connection.release();
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
        connection.release();
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
      connection.release();
      connection = null;

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

      return res.json({ message: "Retirante vinculado com sucesso!" });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (_) {
          /* ignore */
        }
        connection.release();
      }
      const isDeadlock =
        error.errno === 1213 ||
        error.code === "ER_LOCK_DEADLOCK" ||
        /Deadlock found/i.test(String(error.message || ""));
      if (isDeadlock && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      await logErro("GUEST_CONTROLLER_ASSIGN_TICKET", error);
      return res.status(500).json({
        error: "Erro interno ao vincular retirante. Verifique os logs.",
      });
    }
  }
};
