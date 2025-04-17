import express from 'express';
import multer from 'multer';
import chatController from '../controllers/chatController.js';

const router = express.Router();
const storage = multer.memoryStorage(); // Stores files in memory
const upload = multer({ storage: storage });

// POST /chats
router.post(
    '/',
    upload.single('imageData'),
    chatController.handleIncomingMessage,
);

router.post(
    '/save',
    upload.none(),
    chatController.handleSave,
);

router.post(
    '/history',
    chatController.handleReturnHistory
);

export default router;