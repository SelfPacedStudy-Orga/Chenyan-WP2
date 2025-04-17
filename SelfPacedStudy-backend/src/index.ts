import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import transcriptRouter from './routes/transcriptRouter.js';
import chatRouter from './routes/chatRouter.js';
import transRoute from './routes/transRoute.js';
import llmRouter from './routes/llmRoute.js'; // Import LLM router
import userStudyRouter from './routes/userStudyRouter.js'; // Import user study router
import experimentRouter from './routes/experimentRouter.js'; // Import experiment router
import localVideoRouter from './routes/localVideoRouter.js'; // Import local video router
import slidesRouter from './routes/slidesRouter.js'; // Import slides router
import lectureRouter from './routes/lectureRouter.js'; // Import lecture router
import { initLectureTimer } from './services/lectureTimerService.js'; // Import lecture timer service


const app = express();
// Increase request body size limit to handle large requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const port = process.env.PORT || 3000;

// Register routes
app.use('/transcript', transcriptRouter);
app.use('/yuanyuan', transRoute);
app.use('/chats', chatRouter);
app.use('/llm', llmRouter); // Ensure LLM router is registered here
app.use('/userStudy', userStudyRouter); // Register user study router
app.use('/transcriptExperiment', experimentRouter); // Register experiment router
app.use('/localVideo', localVideoRouter); // Register local video router
app.use('/slides', slidesRouter); // Register slides router
app.use('/lectures', lectureRouter); // Register lecture router

// Static file service - Used to provide uploaded video files
app.use('/uploads', express.static('uploads'));

// Homepage test route
app.get('/', (req, res) => {
  res.send('Hello, Express');
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// Initialize lecture timer
initLectureTimer();
logger.info('Lecture timer has been initialized');

// Start server
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
