const db = require("../config/db");

async function logErro(modulo, erro) {
  try {
    const mensagem = erro.message != null ? String(erro.message) : String(erro);
    const stackTrace = erro.stack != null ? String(erro.stack) : "Sem stack trace disponível";

    await db.execute(
      `INSERT INTO logs_erros (modulo, mensagem, stack_trace) VALUES (?, ?, ?)`,
      [modulo, mensagem, stackTrace],
    );

    // Continua a imprimir no terminal para quem estiver a programar ver na hora
    console.error(
      `🚨 [ERRO SALVO NO BANCO] Módulo: ${modulo} | Erro: ${mensagem}`,
    );
  } catch (e) {
    console.error(
      "❌ Falha crítica: O sistema tentou gravar um erro e não conseguiu!",
      e.message,
    );
  }
}

module.exports = logErro;
