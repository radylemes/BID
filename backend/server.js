const express = require("express");
const cors = require("cors");
const path = require("path");
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
