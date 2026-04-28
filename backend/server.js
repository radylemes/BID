const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
require("dotenv").config();
const initializeDatabase = require("./config/setupDatabase");
const initAutomations = require("./cron/automations");
const passport = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const matchRoutes = require("./routes/matchRoutes");
const guestRoutes = require("./routes/guestRoutes");
const receptionRoutes = require("./routes/receptionRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const pointsRuleRoutes = require("./routes/pointsRuleRoutes");
const sectorRoutes = require("./routes/sectorRoutes");
const auditRoutes = require("./routes/auditRoutes");
const systemMonitorRoutes = require("./routes/systemMonitorRoutes");
const setoresEventoRoutes = require("./routes/setoresEventoRoutes");
const emailRoutes = require("./routes/emailRoutes");
const logErro = require("./utils/errorLogger");

const app = express();
const PORT = process.env.PORT || 3005;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/reception", receptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/points-rules", pointsRuleRoutes);
app.use("/api/sectors", sectorRoutes);
app.use("/api/audits", auditRoutes);
app.use("/api/system-errors", systemMonitorRoutes);
app.use("/api/setores-evento", setoresEventoRoutes);
app.use("/api/email", emailRoutes);

app.use("/api/*", async (req, res) => {
  await logErro("API_404_NOT_FOUND", {
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    stack: `API_404 ${req.method} ${req.originalUrl}`,
  });
  res.status(404).json({ error: "Rota não encontrada." });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "API Apostas - Online" });
});

initAutomations();
// Inicializa Banco e depois sobe o servidor
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
});
