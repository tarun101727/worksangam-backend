import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {

  console.log("FILE MIME:", file.mimetype);
  console.log("FILE NAME:", file.originalname);

  // Allow proper image/video mime types
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    return cb(null, true);
  }

  // Fallback using file extension
  const name = file.originalname.toLowerCase();

  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".avi") ||
    name.endsWith(".mkv")
  ) {
    return cb(null, true);
  }

  cb(new Error("Only images and videos allowed"), false);
};

export const upload = multer({
  storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter,
});
