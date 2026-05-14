const express = require("express");
const router = express.Router();
const eventoRhController = require("../controllers/eventoRhController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
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
  validateRequest(createEventoSchema),
  eventoRhController.createEvento,
);
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
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
