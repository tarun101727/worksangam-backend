import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/avatars';

// ✅ Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (req, file, cb) => {

  console.log("FILE MIME =>", file.mimetype);
  console.log("FILE NAME =>", file.originalname);

  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/octet-stream",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images allowed"), false);
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
});
