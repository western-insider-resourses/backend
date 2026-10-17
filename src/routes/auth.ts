import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/auth/index.js";

const router = Router();
router.post("/login", controller.login);
router.post("/signup", controller.signup);
router.get("/session", requireAdmin, controller.getSession);
router.post("/logout", controller.logout);
router.get("/signup-config", controller.getSignupConfig);

export default router;
