const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const senha = "123456";
  const hash = await bcrypt.hash(senha, 10);

  // Força o admin a ser local (is_ad_user = 0) e define a senha
  await connection.execute(
    "UPDATE usuarios SET senha_hash = ?, is_ad_user = 0, ativo = 1 WHERE username = 'admin'",
    [hash],
  );

  console.log("✅ Admin corrigido! Tente logar com admin / 123456");
  process.exit();
}
fix();
