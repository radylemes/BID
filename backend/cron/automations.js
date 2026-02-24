const cron = require("node-cron");
const db = require("../config/db");

function initAutomations() {
  console.log("⏰ Motor de Regras de Pontuação iniciado.");

  cron.schedule("* * * * *", async () => {
    try {
      const [regras] = await db.query(
        `SELECT * FROM regras_pontuacao WHERE ativo = TRUE AND proxima_execucao <= NOW()`,
      );
      if (regras.length === 0) return;

      for (const regra of regras) {
        console.log(`⚙️ Executando: ${regra.descricao}`);

        let userFilter = "WHERE ativo = 1"; // Só pontua ativos
        let queryParamsHist = [regra.pontos, `Automático: ${regra.descricao}`];
        let queryParamsUpd = [regra.pontos];

        // Filtro Mágico Relacional
        if (regra.setor_id) {
          userFilter += " AND setor_id = ?";
          queryParamsHist.push(regra.setor_id);
          queryParamsUpd.push(regra.setor_id);
        } else if (regra.empresa_id) {
          userFilter += " AND empresa_id = ?";
          queryParamsHist.push(regra.empresa_id);
          queryParamsUpd.push(regra.empresa_id);
        }

        await db.query(
          `
          INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo)
          SELECT id, 1, pontos, pontos + ?, ? FROM usuarios ${userFilter}
        `,
          queryParamsHist,
        );

        await db.query(
          `UPDATE usuarios SET pontos = pontos + ? ${userFilter}`,
          queryParamsUpd,
        );

        let intSQL = "MINUTE";
        if (regra.frequencia_tipo === "horas") intSQL = "HOUR";
        if (regra.frequencia_tipo === "dias") intSQL = "DAY";
        if (regra.frequencia_tipo === "meses") intSQL = "MONTH";

        await db.query(
          `
          UPDATE regras_pontuacao 
          SET ultima_execucao = NOW(), proxima_execucao = DATE_ADD(NOW(), INTERVAL ? ${intSQL}) 
          WHERE id = ?
        `,
          [regra.frequencia_valor, regra.id],
        );
      }
    } catch (error) {
      console.error("❌ Erro no Cron:", error);
    }
  });
}

module.exports = initAutomations;
