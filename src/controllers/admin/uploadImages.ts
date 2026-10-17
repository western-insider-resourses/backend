import { uploadBuffer } from "../../services/cloudinary.js";
import { bad, wrap } from "../../shared/utils.js";

export const uploadImages = wrap(async (req, res) => {
  if (!Array.isArray(req.files) || !req.files.length)
    throw bad("Choose at least one image.");
  const results = await Promise.all(
    (req.files as Express.Multer.File[]).map((f) => uploadBuffer(f.buffer)),
  );
  res.json(results.map((r) => ({ url: r.secure_url, public_id: r.public_id })));
});
