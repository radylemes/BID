const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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

router.get("/", matchController.getMatches);

router.post("/", upload.single("banner_file"), matchController.createMatch);
router.put("/:id", upload.single("banner_file"), matchController.updateMatch);

router.post("/bet", matchController.placeBet);
router.post("/finish", matchController.finishMatch);
router.delete("/:id", matchController.deleteMatch);
router.get("/balance/:userId", matchController.getBalance);
router.get("/:id/winners-report", matchController.getMatchWinnersReport);

module.exports = router;
