import { Router } from "express";
import * as shareController from "../controllers/shareController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Publicly accessible with valid token (viewing shared map)
router.get("/:token", shareController.getSharedMap);

// Importing copy requires user authentication
router.post("/:token/import", requireAuth, shareController.importSharedMap);

// Revoking share requires owner authentication
router.delete("/:shareId", requireAuth, shareController.revokeShare);

export default router;
