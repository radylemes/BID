const express = require("express");
const router = express.Router();
const ruleController = require("../controllers/pointsRuleController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// Regras de pontuação - somente ADMIN
router.get("/", authMiddleware, authorizeRoles("ADMIN"), ruleController.getRules);
router.post("/", authMiddleware, authorizeRoles("ADMIN"), ruleController.createRule);
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  ruleController.updateRule,
);
router.put(
  "/:id/toggle",
  authMiddleware,
  authorizeRoles("ADMIN"),
  ruleController.toggleRule,
);
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  ruleController.deleteRule,
);

module.exports = router;