import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/public/index.js";

const router = Router();
router.get("/categories", controller.listCategories);
router.get("/posts", controller.listPosts);
router.get("/posts/trending", controller.listTrendingPosts);
router.get("/posts/:slug", controller.getPost);
router.get("/posts/:slug/like", controller.getLike);
router.post("/posts/:slug/like", rateLimit({ windowMs: 60_000, max: 30 }), controller.toggleLike);
router.get("/posts/:slug/comments", controller.listComments);
router.post("/posts/:slug/comments", rateLimit({ windowMs: 10 * 60_000, max: 15 }), controller.createComment);
router.get("/ads", controller.listPublicAds);
router.get("/social", controller.listPublicSocialLinks);
router.post("/track", rateLimit({ windowMs: 60_000, max: 120 }), controller.trackEvent);

export default router;
