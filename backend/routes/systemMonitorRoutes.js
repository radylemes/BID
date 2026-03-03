const express = require("express");
const router = express.Router();
const systemMonitorController = require("../controllers/systemMonitorController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  systemMonitorController.getErrors,
);
router.put(
  "/:id/resolve",
  authMiddleware,
  authorizeRoles("ADMIN"),
  systemMonitorController.resolveError,
);

module.exports = router;
