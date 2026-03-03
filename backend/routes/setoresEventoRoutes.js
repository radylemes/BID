const express = require("express");
const router = express.Router();
const setoresEventoController = require("../controllers/setoresEventoController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, setoresEventoController.getAll);
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  setoresEventoController.create,
);
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  setoresEventoController.deleteOne,
);

module.exports = router;
