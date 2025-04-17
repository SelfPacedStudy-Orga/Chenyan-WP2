import { Request, Response, NextFunction } from 'express';
import { isLectureAvailable } from '../services/lectureTimerService.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware - Check if lecture is available
 * Used to protect routes that require unlocked lectures
 */
export const checkLectureAccess = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get lecture ID from request body or URL parameters
    const lectureId = req.body.lectureNumber || req.params.lectureId;
    
    if (!lectureId) {
      res.status(400).json({ 
        success: false, 
        message: 'Lecture ID not provided' 
      });
      return;
    }
    
    // Check if lecture is available
    const available = isLectureAvailable(lectureId);
    
    if (!available) {
      logger.warn(`User attempted to access locked lecture: ${lectureId}`);
      res.status(403).json({ 
        success: false, 
        message: 'This lecture is not unlocked yet, please try again after the unlock time' 
      });
      return;
    }
    
    // Lecture is available, proceed to next step
    next();
  } catch (error) {
    logger.error(`Error validating lecture access: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ 
      success: false, 
      message: 'Error validating lecture access' 
    });
  }
};

export default {
  checkLectureAccess
}; 