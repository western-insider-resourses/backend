import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/admin/index.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed.")),
});

const router = Router();
router.use(requireAdmin);

router.post("/upload", upload.array("images", 3), controller.uploadImages);
router.post("/upload/remove", controller.removeUpload);
router.get("/posts", controller.listPosts);
router.get("/posts/:id", controller.getPost);
router.post("/posts", controller.createPost);
router.put("/posts/:id", controller.updatePost);
router.delete("/posts/:id", controller.deletePost);
router.get("/categories", controller.listCategories);
router.post("/categories", controller.createCategory);
router.put("/categories/:id", controller.updateCategory);
router.delete("/categories/:id", controller.deleteCategory);
router.get("/comments", controller.listComments);
router.patch("/comments/:id", controller.updateComment);
router.delete("/comments/:id", controller.deleteComment);
router.get("/ads", controller.listAds);
router.post("/ads", controller.createAd);
router.put("/ads/:id", controller.updateAd);
router.patch("/ads/:id", controller.patchAd);
router.delete("/ads/:id", controller.deleteAd);
router.get("/social", controller.listSocialLinks);
router.post("/social", controller.createSocialLink);
router.patch("/social/:id", controller.patchSocialLink);
router.delete("/social/:id", controller.deleteSocialLink);
router.get("/analytics", controller.getAnalytics);
router.get("/adsense", controller.getAdsenseReport);

export default router;
