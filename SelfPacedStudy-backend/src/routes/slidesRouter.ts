import express from 'express';
import multer from 'multer';
import path from 'path';
import slidesController from "../controllers/slidesController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 上传幻灯片
router.post(
  '/upload',
  upload.single('slides'),
  slidesController.uploadSlides
);

// 获取幻灯片处理状态
router.get(
  '/status/:slidesId',
  slidesController.getSlidesStatus
);

// 获取幻灯片文件
router.get(
  '/files/:userId/:filename',
  (req, res) => {
    const { userId, filename } = req.params;
    const slidesPath = path.join(process.cwd(), 'uploads', userId, 'slides', filename);
    res.sendFile(slidesPath);
  }
);

export default router; 