const db = require("../config/db");

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
    const [result] = await db.execute(
      "INSERT INTO convidados (usuario_id, nome_completo, cpf, email, telefone) VALUES (?, ?, ?, ?, ?)",
      [usuario_id, nome_completo, cpf, email || null, telefone || null],
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

exports.assignGuestToTicket = async (req, res) => {
  const { apostaId } = req.params; // Agora recebe o ID EXATO do lance/ingresso
  const { convidado_id, usuario_id } = req.body;
  const db = require("../config/db");

  try {
    const [result] = await db.execute(
      "UPDATE apostas SET convidado_id = ? WHERE id = ? AND usuario_id = ? AND status = 'GANHOU'",
      [convidado_id, apostaId, usuario_id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(403)
        .json({ error: "Ingresso inválido ou não pertence a você." });
    }

    res.json({ message: "Retirante vinculado com sucesso!" });
  } catch (error) {
    console.error("Erro assignGuest:", error);
    res.status(500).json({ error: "Erro ao vincular retirante." });
  }
};
