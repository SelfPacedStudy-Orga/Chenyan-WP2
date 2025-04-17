import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import pdfParse from 'pdf-parse';

// 处理幻灯片文件
export const processSlides = async (slidesId: string, slidesPath: string, fileExt: string): Promise<Record<string, any>> => {
  try {
    logger.info(`Processing slides: ${slidesId} at path: ${slidesPath}`);
    
    let extractedText = '';
    let slideCount = 0;
    
    // 根据文件类型进行不同处理
    if (fileExt === '.pdf') {
      // 处理PDF文件
      const dataBuffer = fs.readFileSync(slidesPath);
      const pdfData = await pdfParse(dataBuffer);
      
      extractedText = pdfData.text;
      slideCount = pdfData.numpages;
      
      // 保存提取的文本
      const textFilePath = path.join(path.dirname(slidesPath), `${path.basename(slidesPath, fileExt)}.txt`);
      fs.writeFileSync(textFilePath, extractedText);
      
    } else if (fileExt === '.pptx' || fileExt === '.ppt') {
      // 对于PPT文件，当前版本只记录文件信息
      // 未来可以添加PPT解析库，如 pptx-parser
      logger.info(`PowerPoint processing for ${slidesId} - This is a placeholder. Add PPT parsing logic in the future.`);
      
      extractedText = "PowerPoint processing is pending. This is a placeholder.";
      slideCount = 0;
    }
    
    // 创建处理结果
    const result = {
      slidesId,
      slideCount,
      textLength: extractedText.length,
      fileType: fileExt.replace('.', ''),
      textPreview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
      processedAt: new Date().toISOString()
    };
    
    return result;
    
  } catch (error: any) {
    logger.error(`Error processing slides ${slidesId}: ${error.message}`);
    throw error;
  }
}; 