const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { placeBetSchema, finishMatchSchema, redistribuirSchema, acrescentarIngressosSchema } = require("../validations/matchSchema");

const BANNER_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "banners");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(BANNER_UPLOAD_DIR)) fs.mkdirSync(BANNER_UPLOAD_DIR, { recursive: true });
    cb(null, BANNER_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === "link_extra_file" ? "link-extra" : "banner";
    cb(null, `${prefix}-${uniqueSuffix}.jpg`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Formato de imagem não suportado."), false);
};

const uploadBidImages = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// Listagem e histórico público exigem usuário autenticado (app interno)
router.get("/", authMiddleware, matchController.getMatches);
router.get("/my-bets/:userId", authMiddleware, matchController.getMyBets);
router.get("/public/history", authMiddleware, matchController.getPublicHistory);
router.get("/:id/banner", matchController.getBanner);

// Gestão de eventos (ADMIN) — upload de imagens banner / link extra
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadBidImages.fields([
    { name: "banner_file", maxCount: 1 },
    { name: "link_extra_file", maxCount: 1 },
  ]),
  matchController.createMatch,
);
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadBidImages.fields([
    { name: "banner_file", maxCount: 1 },
    { name: "link_extra_file", maxCount: 1 },
  ]),
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
router.get(
  "/:id/bets-report",
  authMiddleware,
  authorizeRoles("ADMIN"),
  matchController.getMatchBetsReport,
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
