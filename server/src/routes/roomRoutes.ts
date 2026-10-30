import { Router } from "express";
import * as roomController from "../controllers/roomController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { RoomCreateSchema, RoomJoinSchema } from "@mapforge/shared";

const router = Router();

router.post("/", requireAuth, validateBody(RoomCreateSchema), roomController.createRoom);
router.post("/join", requireAuth, validateBody(RoomJoinSchema), roomController.joinRoom);
router.get("/:roomId", requireAuth, roomController.getRoom);
router.get("/:roomId/snapshot", requireAuth, roomController.getRoomSnapshot);
router.get("/:roomId/operations", requireAuth, roomController.getRoomOperations);

export default router;
