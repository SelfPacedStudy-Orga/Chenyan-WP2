import express from 'express';
import multer from 'multer';
import transController from '../controllers/transcriptController.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /transcript，上传字段名称为 "video"
router.post(
  '/',
  upload.single('video'),
  transController.handleTranscript
);

export default router;
