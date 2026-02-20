const db = require("../config/db");

// 1. Busca os eventos recentes prontos para a Portaria
exports.getTodayEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, titulo, local, data_jogo AS data_evento, banner 
      FROM partidas 
      WHERE status = 'FINALIZADA' OR status = 'ENCERRADA'
      ORDER BY data_jogo DESC
      LIMIT 15
    `);
    res.json(rows);
  } catch (error) {
    console.error("❌ [Portaria] Erro no getTodayEvents:", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

// 2. Busca a lista de convidados (AGORA TRAZ OS DADOS DO RECEBEDOR)
exports.getEventGuests = async (req, res) => {
  const { eventId } = req.params;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        a.id AS aposta_id,
        c.nome_completo AS retirante_nome,
        c.cpf AS retirante_cpf,
        u.nome_completo AS titular_nome,
        COALESCE(g.nome, 'Geral') AS empresa,
        a.checkin,
        a.assinatura,
        a.recebedor_nome,
        a.recebedor_cpf
      FROM apostas a
      JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN grupos g ON u.grupo_id = g.id
      JOIN convidados c ON a.convidado_id = c.id
      WHERE a.partida_id = ? AND a.status = 'GANHOU'
      ORDER BY empresa ASC, c.nome_completo ASC
    `,
      [eventId],
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ [Portaria] Erro no getEventGuests:", error);
    res.status(500).json({ error: "Erro ao buscar convidados." });
  }
};

// 3. Realiza o Check-in salvando a assinatura e os dados do acompanhante
exports.confirmCheckin = async (req, res) => {
  const { apostaId, assinaturaBase64, recebedorNome, recebedorCpf } = req.body;
  try {
    await db.query(
      "UPDATE apostas SET checkin = TRUE, assinatura = ?, recebedor_nome = ?, recebedor_cpf = ? WHERE id = ?",
      [assinaturaBase64, recebedorNome, recebedorCpf, apostaId],
    );
    res.json({ message: "Check-in realizado com sucesso!" });
  } catch (error) {
    console.error("❌ [Portaria] Erro no confirmCheckin:", error);
    res.status(500).json({ error: "Erro ao confirmar check-in." });
  }
};

// 4. Rota de RAIO-X (Debug)
exports.debugEvents = async (req, res) => {
  try {
    const [dbDate] = await db.query(
      "SELECT CURDATE() as data_hoje, NOW() as data_hora_agora",
    );
    const [partidas] = await db.query(
      "SELECT id, titulo, data_jogo, status FROM partidas",
    );
    res.json({ relogio: dbDate[0], total: partidas.length, eventos: partidas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
