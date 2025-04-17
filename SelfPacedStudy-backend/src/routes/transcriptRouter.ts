import express from 'express';
import multer from 'multer';
import transcriptController from "../controllers/transcriptController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /transcript
router.post(
    '/',
    upload.array('pdfs'),
    transcriptController.handleTranscript
);

export default router;
