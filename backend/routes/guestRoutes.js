const express = require("express");
const router = express.Router();
const guestController = require("../controllers/guestController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/user/:userId", authMiddleware, guestController.getGuests);
router.post("/", authMiddleware, guestController.createGuest);
router.put("/:id", authMiddleware, guestController.updateGuest);
router.delete("/:id", authMiddleware, guestController.deleteGuest);

router.put(
  "/assign-ticket/:apostaId",
  authMiddleware,
  guestController.assignGuestToTicket,
);

module.exports = router;
