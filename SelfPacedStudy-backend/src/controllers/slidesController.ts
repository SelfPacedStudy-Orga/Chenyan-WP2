import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import pdfParse from 'pdf-parse';
import { processSlides } from '../services/slidesService.js';

// 状态跟踪对象
const slidesProcessingStatus: Record<string, any> = {};

const uploadSlides = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No slides file uploaded' });
    }

    // 生成唯一ID
    const slidesId = uuidv4();
    const userId = req.body.userId || 'anonymous';
    
    // 确保上传目录存在
    const userUploadDir = path.join(process.cwd(), 'uploads', userId, 'slides');
    fs.mkdirSync(userUploadDir, { recursive: true });
    
    // 确定文件扩展名和存储路径
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const slidesFilename = `${slidesId}${fileExt}`;
    const slidesPath = path.join(userUploadDir, slidesFilename);
    
    // 检查文件类型
    const allowedExtensions = ['.pdf', '.pptx', '.ppt'];
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload PDF or PowerPoint files.'
      });
    }
    
    // 保存文件
    fs.writeFileSync(slidesPath, req.file.buffer);
    
    // 记录状态
    slidesProcessingStatus[slidesId] = {
      status: 'processing',
      progress: 0,
      message: 'Starting slides processing',
      userId,
      slidesPath,
      slidesUrl: `/slides/files/${userId}/${slidesFilename}`
    };
    
    // 启动异步处理
    processSlides(slidesId, slidesPath, fileExt)
      .then(result => {
        slidesProcessingStatus[slidesId] = {
          ...slidesProcessingStatus[slidesId],
          status: 'completed',
          progress: 100,
          message: 'Slides processing completed',
          result
        };
      })
      .catch(error => {
        logger.error(`Slides processing error: ${error.message}`);
        slidesProcessingStatus[slidesId] = {
          ...slidesProcessingStatus[slidesId],
          status: 'error',
          message: `Processing failed: ${error.message}`,
          error: error.message
        };
      });
    
    // 立即返回响应
    return res.status(200).json({
      message: 'Slides upload successful. Processing started.',
      slidesId,
      userId,
      status: 'processing'
    });
    
  } catch (error: any) {
    logger.error(`Slides upload error: ${error.message}`);
    return res.status(500).json({ error: `Slides upload failed: ${error.message}` });
  }
};

const getSlidesStatus = (req: Request, res: Response) => {
  const { slidesId } = req.params;
  
  if (!slidesId || !slidesProcessingStatus[slidesId]) {
    return res.status(404).json({ error: 'Slides ID not found' });
  }
  
  return res.status(200).json(slidesProcessingStatus[slidesId]);
};

export default {
  uploadSlides,
  getSlidesStatus
}; 