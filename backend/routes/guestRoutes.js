const express = require("express");
const router = express.Router();
const guestController = require("../controllers/guestController");

router.get("/user/:userId", guestController.getGuests);
router.post("/", guestController.createGuest);
router.put("/:id", guestController.updateGuest);
router.delete("/:id", guestController.deleteGuest);

router.put("/assign-ticket/:apostaId", guestController.assignGuestToTicket);

module.exports = router;
