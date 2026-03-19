import express from "express";
import {
  searchLocation,
  reverseLocation,
} from "../controllers/mapController.js";

const router = express.Router();

router.get("/search", searchLocation);
router.get("/reverse", reverseLocation);

export default router;
