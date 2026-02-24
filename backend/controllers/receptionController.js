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
    console.log(
      `✅ [AUDITORIA] Portaria: Acesso liberado registrado com sucesso!`,
    );
  } catch (e) {
    console.error("❌ Falha ao gravar auditoria na Portaria:", e.message);
  }
}

// 1. Carrega os eventos
exports.getTodayEvents = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, titulo, data_jogo as data_evento 
      FROM partidas 
      ORDER BY data_jogo ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

// 2. Busca a lista INDIVIDUAL de ingressos
exports.getEventGuests = async (req, res) => {
  const { eventId } = req.params;
  try {
    const query = `
      SELECT 
        i.id as ingresso_id,
        i.aposta_id,
        i.checkin,
        i.assinatura,
        i.recebedor_nome as aposta_recebedor_nome,
        i.recebedor_cpf as aposta_recebedor_cpf,
        u.nome_completo as titular_nome,
        e.nome as empresa,
        c.nome_completo as retirante_nome,
        c.cpf as retirante_cpf
      FROM ingressos i
      JOIN apostas a ON i.aposta_id = a.id
      JOIN usuarios u ON i.usuario_id = u.id
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN convidados c ON i.convidado_id = c.id
      WHERE a.partida_id = ? AND a.status = 'GANHOU'
      ORDER BY u.nome_completo ASC
    `;
    const [rows] = await db.execute(query, [eventId]);

    const formatedRows = rows.map((r) => ({
      ingresso_id: r.ingresso_id,
      aposta_id: r.aposta_id,
      checkin: r.checkin === 1,
      assinatura: r.assinatura,
      titular_nome: r.titular_nome,
      empresa: r.empresa || "Geral",
      recebedor_nome: r.aposta_recebedor_nome || r.retirante_nome || "Pendente",
      recebedor_cpf: r.aposta_recebedor_cpf || r.retirante_cpf || "---",
      retirante_nome: r.retirante_nome || "Não indicado",
      retirante_cpf: r.retirante_cpf || "---",
    }));

    res.json(formatedRows);
  } catch (error) {
    console.error("Erro getEventGuests:", error);
    res.status(500).json({ error: "Erro ao buscar lista de acesso." });
  }
};

// 3. Processa o Check-in POR INGRESSO
exports.checkin = async (req, res) => {
  // Pega tanto ingressoId (novo) quanto apostaId (fallback de segurança)
  const idFinal = req.body.ingressoId || req.body.apostaId;
  const { assinaturaBase64, recebedorNome, recebedorCpf, adminId } = req.body;

  if (!idFinal || !assinaturaBase64 || !recebedorNome || !recebedorCpf) {
    return res
      .status(400)
      .json({ error: "Dados incompletos para o check-in." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Atualiza a tabela INGRESSOS
    await connection.execute(
      `UPDATE ingressos SET checkin = 1, assinatura = ?, recebedor_nome = ?, recebedor_cpf = ?, data_checkin = NOW() WHERE id = ?`,
      [assinaturaBase64, recebedorNome, recebedorCpf, idFinal],
    );

    const [dados] = await connection.execute(
      `SELECT p.titulo, u.nome_completo as titular 
       FROM ingressos i
       JOIN apostas a ON i.aposta_id = a.id 
       JOIN partidas p ON a.partida_id = p.id 
       JOIN usuarios u ON i.usuario_id = u.id 
       WHERE i.id = ?`,
      [idFinal],
    );

    const eventoTitulo =
      dados.length > 0 ? dados[0].titulo : "Evento Desconhecido";
    const titularNome =
      dados.length > 0 ? dados[0].titular : "Titular Desconhecido";

    const [adminDados] = await connection.execute(
      `SELECT nome_completo FROM usuarios WHERE id = ?`,
      [adminId || 1],
    );
    const nomePorteiro =
      adminDados.length > 0 ? adminDados[0].nome_completo : "Portaria";

    await gravarAuditoria(
      connection,
      adminId || 1,
      "PORTARIA",
      "CHECKIN_INGRESSO",
      idFinal,
      {
        evento: eventoTitulo,
        titular: titularNome,
        recebedor: recebedorNome,
        cpf_recebedor: recebedorCpf,
        motivo: `O(a) funcionário(a) ${nomePorteiro} liberou a entrada de ${recebedorNome} usando o ingresso #${idFinal} de ${titularNome} no evento: ${eventoTitulo}`,
      },
    );

    await connection.commit();
    res.json({ message: "Entrada liberada com sucesso." });
  } catch (error) {
    await connection.rollback();
    console.error("Erro interno no checkin:", error);
    res.status(500).json({ error: "Falha interna ao processar o check-in." });
  } finally {
    connection.release();
  }
};

exports.processCheckin = exports.checkin;
