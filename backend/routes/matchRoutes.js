const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { placeBetSchema, finishMatchSchema, redistribuirSchema, acrescentarIngressosSchema } = require("../validations/matchSchema");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/banners/";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "banner-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Listagem e histórico público exigem usuário autenticado (app interno)
router.get("/", authMiddleware, matchController.getMatches);
router.get("/my-bets/:userId", authMiddleware, matchController.getMyBets);
router.get("/public/history", authMiddleware, matchController.getPublicHistory);
router.get("/:id/banner", matchController.getBanner);

// Gestão de eventos (ADMIN) — banner por URL; sem upload de ficheiro
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  multer().none(),
  matchController.createMatch,
);
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  multer().none(),
  matchController.updateMatch,
);
router.post(
  "/finish",
  authMiddleware,
  authorizeRoles("ADMIN"),
  validateRequest(finishMatchSchema),
  matchController.finishMatch,
);
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  matchController.deleteMatch,
);
router.get(
  "/:id/winners-report",
  authMiddleware,
  authorizeRoles("ADMIN"),
  matchController.getMatchWinnersReport,
);
router.post(
  "/:id/redistribuir",
  authMiddleware,
  authorizeRoles("ADMIN"),
  validateRequest(redistribuirSchema),
  matchController.redistribuirIngressos,
);
router.post(
  "/:id/acrescentar-ingressos",
  authMiddleware,
  authorizeRoles("ADMIN"),
  validateRequest(acrescentarIngressosSchema),
  matchController.acrescentarIngressos,
);

// Ações do usuário final
router.post("/bet", authMiddleware, validateRequest(placeBetSchema), matchController.placeBet);
router.get("/balance/:userId", authMiddleware, matchController.getBalance);

module.exports = router;
