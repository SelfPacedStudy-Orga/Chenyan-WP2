import { Request, Response } from 'express';
import lectureTimerService from '../services/lectureTimerService.js';
import { logger } from '../utils/logger.js';

/**
 * 获取所有讲座的可用性状态
 */
export const getLecturesAvailability = (req: Request, res: Response): void => {
  try {
    const lectures = lectureTimerService.getLecturesAvailability();
    res.status(200).json({ 
      success: true, 
      lectures
    });
  } catch (error) {
    logger.error(`获取讲座可用性失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ 
      success: false, 
      message: '获取讲座可用性失败' 
    });
  }
};

/**
 * 检查特定讲座是否可用
 */
export const checkLectureAvailability = (req: Request, res: Response): void => {
  try {
    const { lectureId } = req.params;
    
    if (!lectureId) {
      res.status(400).json({ 
        success: false, 
        message: '未提供讲座ID' 
      });
      return;
    }
    
    const isAvailable = lectureTimerService.isLectureAvailable(lectureId);
    res.status(200).json({ 
      success: true, 
      isAvailable,
      lectureId
    });
  } catch (error) {
    logger.error(`检查讲座可用性失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ 
      success: false, 
      message: '检查讲座可用性失败' 
    });
  }
};

export default {
  getLecturesAvailability,
  checkLectureAvailability
}; 