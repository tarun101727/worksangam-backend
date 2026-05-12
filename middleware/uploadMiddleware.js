import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const allowedImageExt = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
];

const allowedVideoExt = [
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
];

const fileFilter = (req, file, cb) => {

  const mime = file.mimetype || "";

  const ext = path.extname(file.originalname).toLowerCase();

  const isImage =
    mime.startsWith("image/") ||
    allowedImageExt.includes(ext);

  const isVideo =
    mime.startsWith("video/") ||
    allowedVideoExt.includes(ext);

  console.log("UPLOAD FILE:");
  console.log("Mime:", mime);
  console.log("Ext:", ext);
  console.log("Original:", file.originalname);

  if (isImage || isVideo) {

    cb(null, true);

  } else {

    cb(
      new Error(
        `Only images and videos allowed. Received: ${mime}`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});
