#!/usr/bin/env node
/**
 * Executa setupDatabase (CREATE + migrações incrementais).
 * Uso no deploy: npm run migrate  (antes de subir/reiniciar o servidor)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const initializeDatabase = require("../config/setupDatabase");

initializeDatabase()
  .then(() => {
    console.log("✅ Migrações concluídas com sucesso.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Falha nas migrações:", err);
    process.exit(1);
  });
