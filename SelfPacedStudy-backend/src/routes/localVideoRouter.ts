import express from 'express';
import multer from 'multer';
import localVideoController from "../controllers/localVideoController.js";
import path from 'path';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 上传本地视频
router.post(
  '/upload',
  upload.single('video'),
  localVideoController.uploadVideo
);

// 获取视频处理状态
router.get(
  '/status/:videoId',
  localVideoController.getVideoStatus
);

// 静态视频文件服务
router.get(
  '/videos/:userId/:filename',
  (req, res) => {
    const { userId, filename } = req.params;
    const videoPath = path.join(process.cwd(), 'uploads', userId, filename);
    res.sendFile(videoPath);
  }
);

export default router; 