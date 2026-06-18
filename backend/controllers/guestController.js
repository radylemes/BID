const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");
const { normalizarCpfDigits, validarCpf } = require("../utils/cpf");
const {
  calcularLimiteIndicacao,
  getLimiteIndicacaoConvidadosConfig,
} = require("../utils/convidadosLimiteIndicacao");

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

function formatarDataHoraPtBr(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

/**
 * Garante um registo em convidados para o titular (mesmo CPF/nome da conta), para aparecer na lista
 * e poder ser escolhido ao vincular ingressos. Sincroniza nome/e-mail/CPF com usuarios.
 * Só cria se usuarios.cpf for válido.
 */
async function ensureTitularGuestRow(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return;
  try {
    const [userRows] = await db.execute(
      "SELECT id, nome_completo, email, cpf FROM usuarios WHERE id = ? LIMIT 1",
      [uid],
    );
    if (userRows.length === 0) return;
    const u = userRows[0];
    const cpfDigits = normalizarCpfDigits(u.cpf);
    if (!validarCpf(cpfDigits)) return;

    const [titRows] = await db.execute(
      "SELECT id FROM convidados WHERE usuario_id = ? AND vinculo_titular = 1 LIMIT 1",
      [uid],
    );
    if (titRows.length > 0) {
      await db.execute(
        "UPDATE convidados SET nome_completo = ?, cpf = ?, email = ? WHERE id = ?",
        [u.nome_completo, cpfDigits, u.email || null, titRows[0].id],
      );
      return;
    }

    const [sameCpf] = await db.execute(
      "SELECT id FROM convidados WHERE usuario_id = ? AND cpf = ? LIMIT 1",
      [uid, cpfDigits],
    );
    if (sameCpf.length > 0) {
      await db.execute("UPDATE convidados SET vinculo_titular = 1, nome_completo = ?, email = ? WHERE id = ?", [
        u.nome_completo,
        u.email || null,
        sameCpf[0].id,
      ]);
      return;
    }

    await db.execute(
      "INSERT INTO convidados (usuario_id, nome_completo, cpf, email, telefone, vinculo_titular) VALUES (?, ?, ?, ?, NULL, 1)",
      [uid, u.nome_completo, cpfDigits, u.email || null],
    );
  } catch (e) {
    await logErro("GUEST_CONTROLLER_ENSURE_TITULAR", e);
  }
}

exports.getGuests = async (req, res) => {
  const { userId } = req.params;
  const uid = Number(userId);
  const requester = Number(req.user?.id);
  const role = String(req.user?.role || "").toUpperCase();
  if (!Number.isFinite(uid) || uid <= 0) {
    return res.status(400).json({ error: "ID inválido." });
  }
  if (role !== "ADMIN" && requester !== uid) {
    return res.status(403).json({ error: "Acesso negado." });
  }
  try {
    await ensureTitularGuestRow(uid);
    const query = `
      SELECT c.*,
        (SELECT GROUP_CONCAT(DISTINCT p.titulo SEPARATOR ', ') FROM ingressos i JOIN apostas a ON i.aposta_id = a.id JOIN partidas p ON a.partida_id = p.id WHERE i.convidado_id = c.id AND a.status = 'GANHOU') as eventos_participados
      FROM convidados c WHERE c.usuario_id = ? ORDER BY c.vinculo_titular DESC, c.nome_completo ASC
    `;
    const [rows] = await db.execute(query, [uid]);
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
      "INSERT INTO convidados (usuario_id, nome_completo, cpf, email, telefone, vinculo_titular) VALUES (?, ?, ?, ?, ?, 0)",
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
    const [rows] = await db.execute(
      "SELECT id, nome_completo, vinculo_titular FROM convidados WHERE id = ?",
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Convidado não encontrado." });
    }
    if (Number(rows[0].vinculo_titular) === 1) {
      return res.status(403).json({
        error: "O retirante vinculado à sua conta (titular) não pode ser excluído.",
      });
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
        `SELECT i.id, i.checkin, p.data_jogo FROM ingressos i
         INNER JOIN apostas a ON i.aposta_id = a.id
         INNER JOIN partidas p ON a.partida_id = p.id
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

      const limiteConfig = await getLimiteIndicacaoConvidadosConfig(connection);
      const limiteIndicacao = calcularLimiteIndicacao(
        target.data_jogo,
        limiteConfig.convidados_limite_indicacao_horas,
        limiteConfig.convidados_limite_indicacao_direcao,
      );
      if (!limiteIndicacao) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          error: "Não foi possível determinar o prazo de indicação deste evento.",
        });
      }
      if (new Date() > limiteIndicacao) {
        await connection.rollback();
        connection.release();
        return res.status(403).json({
          error: `O prazo para indicar convidados encerrou em ${formatarDataHoraPtBr(limiteIndicacao)}.`,
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
