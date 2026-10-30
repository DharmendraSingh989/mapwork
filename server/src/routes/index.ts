import { Router } from "express";
import authRoutes from "./authRoutes.js";
import mapRoutes from "./mapRoutes.js";
import shareRoutes from "./shareRoutes.js";
import roomRoutes from "./roomRoutes.js";
import geocodingRoutes from "./geocodingRoutes.js";
import { getHealth, getReadiness } from "../controllers/healthController.js";

const router = Router();

router.get("/health", getHealth);
router.get("/ready", getReadiness);

router.use("/auth", authRoutes);
router.use("/maps", mapRoutes);
router.use("/shares", shareRoutes);
router.use("/rooms", roomRoutes);
router.use("/geocoding", geocodingRoutes);

export default router;
