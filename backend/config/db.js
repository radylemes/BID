const mysql = require("mysql2");
require("dotenv").config();

const connectionLimit = Number(process.env.DB_POOL_LIMIT) || 10;
let maxIdle;
if (
  process.env.DB_POOL_MAX_IDLE !== undefined &&
  process.env.DB_POOL_MAX_IDLE !== ""
) {
  maxIdle = Number(process.env.DB_POOL_MAX_IDLE);
} else if (connectionLimit >= 2) {
  maxIdle = Math.min(8, connectionLimit - 1);
} else {
  maxIdle = connectionLimit;
}

const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 30000;
const idleTimeout = Number(process.env.DB_POOL_IDLE_MS) || 120000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  maxIdle,
  idleTimeout,
  queueLimit: 0,
  dateStrings: true,
  connectTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

module.exports = pool.promise();
