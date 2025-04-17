import express from 'express';
import lectureController from '../controllers/lectureController.js';

const router = express.Router();

// 获取所有讲座的可用性状态
router.get('/availability', lectureController.getLecturesAvailability);

// 检查特定讲座是否可用
router.get('/availability/:lectureId', lectureController.checkLectureAvailability);

export default router; 