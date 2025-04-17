import express from 'express';
import multer from 'multer';
import experimentController from "../controllers/experimentController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /transcriptExperiment
router.post(
    '/transcript',
    experimentController.handleExperimentTranscript
);

export default router; 