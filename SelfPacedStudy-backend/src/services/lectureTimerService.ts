// FEATURE: Lecture Timer Service
// Provides timer functionality for automatically unlocking new lectures weekly

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

// Lecture interface definition
interface Lecture {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  availableFrom: string;
  isAvailable: boolean;
}

// Lecture unlock time interval (milliseconds)
// One week = 7 * 24 * 60 * 60 * 1000
const UNLOCK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // One week

// Test mode time interval (15 seconds)
const TEST_UNLOCK_INTERVAL = 15 * 1000; // 15 seconds

// Whether in test mode
const TEST_MODE = process.env.LECTURE_TEST_MODE === 'true';

// Lecture data file path
const LECTURES_FILE_PATH = path.join(process.cwd(), 'data', 'lectures.json');

// Get lecture data
const getLecturesData = (): Lecture[] => {
  try {
    if (!fs.existsSync(LECTURES_FILE_PATH)) {
      // If file doesn't exist, create default data
      const defaultLectures: Lecture[] = [
        {
          "id": "1",
          "title": "Introduction to Machine Learning",
          "description": "Basic concepts and foundations of machine learning",
          "videoUrl": "https://example.com/videos/lecture1.mp4",
          "thumbnailUrl": "https://example.com/thumbnails/lecture1.jpg",
          "duration": 2700,
          "availableFrom": new Date().toISOString(),
          "isAvailable": true
        },
        {
          "id": "2",
          "title": "Supervised Learning Algorithms",
          "description": "Overview of supervised learning methods",
          "videoUrl": "https://example.com/videos/lecture2.mp4",
          "thumbnailUrl": "https://example.com/thumbnails/lecture2.jpg",
          "duration": 3000,
          "availableFrom": new Date(Date.now() + (TEST_MODE ? TEST_UNLOCK_INTERVAL : UNLOCK_INTERVAL)).toISOString(),
          "isAvailable": false
        },
        {
          "id": "3",
          "title": "Unsupervised Learning",
          "description": "Clustering and dimensionality reduction techniques",
          "videoUrl": "https://example.com/videos/lecture3.mp4",
          "thumbnailUrl": "https://example.com/thumbnails/lecture3.jpg",
          "duration": 2880,
          "availableFrom": new Date(Date.now() + 2 * (TEST_MODE ? TEST_UNLOCK_INTERVAL : UNLOCK_INTERVAL)).toISOString(),
          "isAvailable": false
        },
        {
          "id": "4",
          "title": "Neural Networks",
          "description": "Deep learning and neural network architectures",
          "videoUrl": "https://example.com/videos/lecture4.mp4",
          "thumbnailUrl": "https://example.com/thumbnails/lecture4.jpg",
          "duration": 3300,
          "availableFrom": new Date(Date.now() + 3 * (TEST_MODE ? TEST_UNLOCK_INTERVAL : UNLOCK_INTERVAL)).toISOString(),
          "isAvailable": false
        },
        {
          "id": "5",
          "title": "Advanced Topics and Applications",
          "description": "Real-world applications and advanced concepts",
          "videoUrl": "https://example.com/videos/lecture5.mp4",
          "thumbnailUrl": "https://example.com/thumbnails/lecture5.jpg",
          "duration": 3600,
          "availableFrom": new Date(Date.now() + 4 * (TEST_MODE ? TEST_UNLOCK_INTERVAL : UNLOCK_INTERVAL)).toISOString(),
          "isAvailable": false
        }
      ];
      fs.writeFileSync(LECTURES_FILE_PATH, JSON.stringify(defaultLectures, null, 2));
      return defaultLectures;
    }

    const lecturesData = fs.readFileSync(LECTURES_FILE_PATH, 'utf-8');
    return JSON.parse(lecturesData);
  } catch (error) {
    logger.error(`Failed to get lecture data: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
};

// Save lecture data
const saveLecturesData = (lectures: Lecture[]): boolean => {
  try {
    fs.writeFileSync(LECTURES_FILE_PATH, JSON.stringify(lectures, null, 2));
    return true;
  } catch (error) {
    logger.error(`Failed to save lecture data: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

// Check and update lecture availability
const checkAndUpdateLectureAvailability = (): Lecture[] => {
  try {
    const lectures = getLecturesData();
    const now = new Date();
    let hasUpdates = false;

    logger.info(`Current system time: ${now.toISOString()}, checking lecture availability...`);
    
    lectures.forEach((lecture: Lecture) => {
      const availableFrom = new Date(lecture.availableFrom);
      if (!lecture.isAvailable && now >= availableFrom) {
        lecture.isAvailable = true;
        hasUpdates = true;
        logger.info(`Lecture ${lecture.id} (${lecture.title}) has been unlocked - Unlock time: ${availableFrom.toISOString()}, Current time: ${now.toISOString()}`);
      }
    });

    if (hasUpdates) {
      saveLecturesData(lectures);
    }

    return lectures;
  } catch (error) {
    logger.error(`Failed to check lecture availability: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
};

// Get availability status of all lectures
export const getLecturesAvailability = () => {
  const lectures = checkAndUpdateLectureAvailability();
  return lectures.map((lecture: Lecture) => ({
    id: lecture.id,
    title: lecture.title,
    isAvailable: lecture.isAvailable,
    availableFrom: lecture.availableFrom
  }));
};

// Check if a specific lecture is available
export const isLectureAvailable = (lectureId: string): boolean => {
  const lectures = checkAndUpdateLectureAvailability();
  const lecture = lectures.find((l: Lecture) => l.id === lectureId);
  return lecture ? lecture.isAvailable : false;
};

// Initialize timer, periodically check lecture availability
export const initLectureTimer = (): void => {
  // Check immediately
  checkAndUpdateLectureAvailability();

  // Set up periodic checks
  const interval = TEST_MODE ? 15 * 1000 : 60 * 60 * 1000; // Check every 15 seconds in test mode, every hour in normal mode
  
  setInterval(() => {
    logger.info(`Periodic check of lecture availability...[${new Date().toISOString()}]`);
    checkAndUpdateLectureAvailability();
  }, interval);
  
  logger.info(`Lecture timer started, interval: ${interval / 1000} seconds, current system time: ${new Date().toISOString()}`);
};

export default {
  getLecturesAvailability,
  isLectureAvailable,
  initLectureTimer
}; 