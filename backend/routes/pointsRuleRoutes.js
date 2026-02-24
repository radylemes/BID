const express = require("express");
const router = express.Router();
const ruleController = require("../controllers/pointsRuleController");

router.get("/", ruleController.getRules);
router.post("/", ruleController.createRule);
router.put("/:id/toggle", ruleController.toggleRule);
router.delete("/:id", ruleController.deleteRule);

module.exports = router;