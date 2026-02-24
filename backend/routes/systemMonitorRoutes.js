const express = require("express");
const router = express.Router();
const systemMonitorController = require("../controllers/systemMonitorController");

router.get("/", systemMonitorController.getErrors);
router.put("/:id/resolve", systemMonitorController.resolveError);

module.exports = router;
