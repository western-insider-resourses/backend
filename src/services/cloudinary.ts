import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error("Missing Cloudinary environment variables");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadBuffer = (
  buffer: Buffer,
  folder = "blog",
): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image" }, (err, result) =>
        err || !result
          ? reject(err ?? new Error("Upload failed"))
          : resolve(result),
      )
      .end(buffer);
  });

export const destroyImages = async (
  publicIds: Array<string | null | undefined> = [],
): Promise<void> => {
  await Promise.allSettled(
    publicIds
      .filter((id): id is string => !!id)
      .map((id) => cloudinary.uploader.destroy(id)),
  );
};

// Optional helper for optimized delivery URLs
export const optimizedUrl = (
  publicId: string,
  width?: number,
  height?: number,
) =>
  cloudinary.url(publicId, {
    fetch_format: "auto",
    quality: "auto",
    ...(width && height
      ? { crop: "auto", gravity: "auto", width, height }
      : {}),
  });
