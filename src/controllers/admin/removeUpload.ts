import { destroyImages } from "../../services/cloudinary.js";
import { wrap } from "../../shared/utils.js";

export const removeUpload = wrap(async (req, res) => {
  await destroyImages([req.body.public_id]);
  res.status(204).end();
});
