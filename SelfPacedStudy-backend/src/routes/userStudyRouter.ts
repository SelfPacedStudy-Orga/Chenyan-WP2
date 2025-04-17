import express from 'express';
import multer from 'multer';
import userStudyController from "../controllers/userStudyController.js";
import { checkLectureAccess } from '../middleware/lectureAccessMiddleware.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /userStudy/transcript - 支持JSON和FormData格式
// 添加讲座访问中间件验证用户是否可以访问该讲座
router.post(
    '/transcript',
    upload.none(), // 使用none()使multer只处理FormData但不期望文件
    checkLectureAccess, // 添加讲座访问验证
    userStudyController.handleUserStudyTranscript
);

export default router; 