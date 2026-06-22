const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
require("dotenv").config();
const initializeDatabase = require("./config/setupDatabase");
const initAutomations = require("./cron/automations");
const { initEventoRhAutoClose } = require("./cron/eventoRhAutoClose");
const passport = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const matchRoutes = require("./routes/matchRoutes");
const guestRoutes = require("./routes/guestRoutes");
const receptionRoutes = require("./routes/receptionRoutes");
const receptionSupervisorRoutes = require("./routes/receptionSupervisorRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const pointsRuleRoutes = require("./routes/pointsRuleRoutes");
const sectorRoutes = require("./routes/sectorRoutes");
const auditRoutes = require("./routes/auditRoutes");
const systemMonitorRoutes = require("./routes/systemMonitorRoutes");
const setoresEventoRoutes = require("./routes/setoresEventoRoutes");
const emailRoutes = require("./routes/emailRoutes");
const eventoRhRoutes = require("./routes/eventoRhRoutes");
const integracaoRoutes = require("./routes/integracaoRoutes");
const logErro = require("./utils/errorLogger");

const app = express();
const PORT = process.env.PORT || 3005;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// POST só em /api ou /api/ (sem recurso) — resposta explícita em vez de 404 genérico
const apiRootIncomplete = (req, res) => {
  res.status(400).json({
    error: "Caminho da API incompleto.",
    detalhe:
      "Indique o recurso completo. Ex.: POST /api/users/upload-avatar para foto de perfil; POST /api/auth/login para login.",
  });
};
app.post("/api", apiRootIncomplete);
app.post("/api/", apiRootIncomplete);

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/reception", receptionRoutes);
app.use("/api/reception/supervisor", receptionSupervisorRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/points-rules", pointsRuleRoutes);
app.use("/api/sectors", sectorRoutes);
app.use("/api/audits", auditRoutes);
app.use("/api/system-errors", systemMonitorRoutes);
app.use("/api/setores-evento", setoresEventoRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/eventos-rh", eventoRhRoutes);
app.use("/api/integracao", integracaoRoutes);

// Ficheiros estáticos sob /api/uploads → o proxy Nginx em /api/ encaminha ao Node
app.use("/api/uploads", express.static(path.join(__dirname, "uploads"), { index: false }));

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
initEventoRhAutoClose();

async function bootstrap() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Falha ao inicializar o banco. Servidor não iniciado.", error);
    process.exit(1);
  }
}

bootstrap();
