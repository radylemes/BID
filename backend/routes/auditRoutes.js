const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, authorizeRoles("ADMIN"), auditController.getLogs);

module.exports = router;
