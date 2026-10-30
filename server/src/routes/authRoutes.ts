import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { RegisterSchema, LoginSchema } from "@mapforge/shared";

const router = Router();

router.post("/register", validateBody(RegisterSchema), authController.register);
router.post("/login", validateBody(LoginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.getMe);

export default router;
