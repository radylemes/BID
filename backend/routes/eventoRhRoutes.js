const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const eventoRhController = require("../controllers/eventoRhController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const BANNER_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "banners");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(BANNER_UPLOAD_DIR)) fs.mkdirSync(BANNER_UPLOAD_DIR, { recursive: true });
    cb(null, BANNER_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `banner-${uniqueSuffix}.jpg`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Formato de imagem não suportado."), false);
};

const uploadBanner = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});
const {
  createEventoSchema,
  updateEventoSchema,
  inscreverSchema,
  marcarPresencaSchema,
} = require("../validations/eventoRhSchema");

// Rotas específicas antes de /:id
router.get(
  "/admin/todos",
  authMiddleware,
  authorizeRoles("ADMIN"),
  eventoRhController.listAllForAdmin,
);
router.get(
  "/admin/evento/:id/descricao",
  authMiddleware,
  authorizeRoles("ADMIN"),
  eventoRhController.getEventoAdminDescricao,
);
router.get("/", authMiddleware, eventoRhController.listEventos);
router.get("/historico", authMiddleware, eventoRhController.listHistoricoUsuario);

router.get(
  "/:id/lista-participantes",
  authMiddleware,
  eventoRhController.listParticipantesColaborador,
);

router.get(
  "/:id/inscritos",
  authMiddleware,
  authorizeRoles("ADMIN"),
  eventoRhController.listInscritos,
);

router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadBanner.fields([{ name: "banner_file", maxCount: 1 }]),
  validateRequest(createEventoSchema),
  eventoRhController.createEvento,
);
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadBanner.fields([{ name: "banner_file", maxCount: 1 }]),
  validateRequest(updateEventoSchema),
  eventoRhController.updateEvento,
);
router.delete("/:id", authMiddleware, authorizeRoles("ADMIN"), eventoRhController.deleteEvento);

router.get("/:id", authMiddleware, eventoRhController.getEvento);

router.post(
  "/:id/inscrever",
  authMiddleware,
  validateRequest(inscreverSchema),
  eventoRhController.inscrever,
);
router.delete("/:id/inscrever", authMiddleware, eventoRhController.cancelarInscricao);
router.post(
  "/:id/presenca",
  authMiddleware,
  authorizeRoles("ADMIN"),
  validateRequest(marcarPresencaSchema),
  eventoRhController.marcarPresenca,
);

module.exports = router;
