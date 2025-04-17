import { Request, Response } from 'express';
import { Document } from "@langchain/core/documents";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import SimpleBotMemoryManager from '../utils/SimpleBotMemoryManager.js';
import { ensureDir } from '../utils/fileUtils.js';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { TranscriptChunk } from '../types/types';
import BotMemoryManager from '../utils/BotMemoryManager.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 存储视频处理状态
interface ProcessingStatus {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  videoId: string;
  userId: string;
  videoUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 内存中的进度状态
const processingStatusMap: Map<string, ProcessingStatus> = new Map();

/**
 * 直接调用Whisper转录视频
 */
async function transcribeVideoDirectly(videoPath: string): Promise<string> {
  try {
    console.log(`执行whisper命令: whisper "${videoPath}" --model base`);
    const { stdout, stderr } = await execPromise(`whisper "${videoPath}" --model base`);
    console.log('Whisper输出:', stdout);
    
    // 从stdout中提取转录内容
    const transcriptLines = stdout.split('\n')
      .filter(line => line.match(/\[\d+:\d+\.\d+ --> \d+:\d+\.\d+\]/))
      .map(line => {
        // 提取时间段和文本内容
        const match = line.match(/\[(\d+:\d+\.\d+ --> \d+:\d+\.\d+)\]\s*(.*)/);
        if (match) {
          return match[2].trim(); // 只返回文本内容
        }
        return '';
      })
      .filter(Boolean);
    
    return transcriptLines.join('\n');
  } catch (error) {
    console.error('执行whisper命令失败:', error);
    throw error;
  }
}

/**
 * 上传视频并处理
 */
export const uploadVideo = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }

  const userId = req.body.userId || uuidv4();
  const videoId = uuidv4();
  
  // 创建用户上传目录
  const userDir = path.join(__dirname, '../../uploads', userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  // 保存视频文件
  const videoFileName = `${videoId}${path.extname(req.file.originalname)}`;
  const videoPath = path.join(userDir, videoFileName);
  
  try {
    fs.writeFileSync(videoPath, req.file.buffer);
    
    // 记录处理状态
    const status: ProcessingStatus = {
      status: 'uploading',
      progress: 0,
      videoId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    processingStatusMap.set(videoId, status);
    
    // 开始处理视频
    processVideo(videoPath, videoId, userId);
    
    return res.status(200).json({
      message: '视频上传成功，开始处理',
      videoId,
      userId
    });
  } catch (error) {
    console.error('视频上传失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 获取视频处理状态
 */
export const getVideoStatus = (req: Request, res: Response) => {
  const { videoId } = req.params;
  
  if (!videoId) {
    return res.status(400).json({ error: '视频ID不能为空' });
  }
  
  const status = processingStatusMap.get(videoId);
  
  if (!status) {
    return res.status(404).json({ error: '找不到视频处理状态' });
  }
  
  return res.status(200).json(status);
};

/**
 * 使用简化版的问答功能
 */
export const simpleAskQuestion = async (question: string, userId: string, timestamp: number = 0) => {
  try {
    console.log(`[DEBUG] localVideoController.simpleAskQuestion 被调用: userId=${userId}, timestamp=${timestamp}`);
    console.log(`[DEBUG] 问题内容: "${question}"`);
    
    // 检查是否有可用的转录
    const transcriptDocs = await SimpleBotMemoryManager.getTranscriptDocs(userId);
    if (!transcriptDocs || transcriptDocs.length === 0) {
      console.log(`[WARNING] 用户 ${userId} 没有可用的转录文档，将尝试使用通用知识回答`);
    } else {
      console.log(`[DEBUG] 找到 ${transcriptDocs.length} 个转录文档段落`);
    }
    
    // 使用SimpleBotMemoryManager处理问答
    const answer = await SimpleBotMemoryManager.askQuestion(question, userId, timestamp);
    console.log(`[DEBUG] 生成的回答长度: ${answer.length} 字符`);
    return answer;
  } catch (error) {
    console.error("[ERROR] simpleAskQuestion 发生错误:", error);
    return "很抱歉，处理您的问题时遇到了技术问题。如果您在询问视频内容，可能是因为系统无法访问视频转录。我可以尝试回答其他问题。";
  }
};

/**
 * 处理视频
 */
const processVideo = async (videoPath: string, videoId: string, userId: string) => {
  try {
    // 更新状态为处理中
    updateStatus(videoId, { status: 'processing', progress: 10 });
    console.log(`[DEBUG] 开始处理视频，用户ID: ${userId}, 视频ID: ${videoId}, 路径: ${videoPath}`);
    
    // 提取视频文件名（不含扩展名）
    const videoFilename = path.basename(videoPath, path.extname(videoPath));
    const videoDir = path.dirname(videoPath);
    
    // 转写视频
    updateStatus(videoId, { progress: 20 });
    console.log(`[DEBUG] 开始转写视频，使用Whisper模型`);
    const transcriptContent = await transcribeVideoDirectly(videoPath);
    console.log(`[DEBUG] 视频转写完成，转写内容长度: ${transcriptContent.length} 字符`);
    updateStatus(videoId, { progress: 50 });
    
    // 处理转录文本，分割成文档
    const segments = transcriptContent.split(/\n+/).filter(segment => segment.trim() !== '');
    console.log(`[DEBUG] 转写文本分割成 ${segments.length} 个段落`);
    
    // 确保每个段落都有适当的时间戳信息
    const transcriptDocs = segments.map((segment, index) => {
      // 每个段落估计时长为5秒
      const estimatedDuration = 5000;
      // 起始偏移根据索引计算
      const estimatedOffset = index * estimatedDuration;
      
      return new Document({
        pageContent: segment,
        metadata: { 
          offset: estimatedOffset, 
          duration: estimatedDuration,
          segmentId: index,
          videoId: videoId
        }
      });
    });
    
    updateStatus(videoId, { progress: 70 });
    
    // 初始化AI上下文
    try {
      // 创建相对URL路径，指向视频文件
      const videoUrl = `/localVideo/videos/${userId}/${path.basename(videoPath)}`;
      console.log(`[DEBUG] 创建的视频URL: ${videoUrl}`);
      
      // 使用SimpleBotMemoryManager存储文档和处理问答
      console.log(`[DEBUG] 为用户初始化AI上下文，转录段落数: ${transcriptDocs.length}`);
      await SimpleBotMemoryManager.setInstance(userId, null, transcriptDocs, videoUrl);
      
      // 存储一份转录文本到文件中以便于查看调试
      try {
        const transcriptDir = path.join(__dirname, '../../uploads', userId);
        if (!fs.existsSync(transcriptDir)) {
          fs.mkdirSync(transcriptDir, { recursive: true });
        }
        const transcriptFilePath = path.join(transcriptDir, `${videoFilename}_transcript.txt`);
        fs.writeFileSync(transcriptFilePath, transcriptContent);
        console.log(`[DEBUG] 已保存转录文本到: ${transcriptFilePath}`);
      } catch (error) {
        console.error('保存转录文本文件失败:', error);
        // 不中断处理流程
      }
      
      // 更新状态为完成
      updateStatus(videoId, { 
        status: 'completed', 
        progress: 100,
        videoUrl
      });
      
      console.log(`[DEBUG] 视频 ${videoId} 处理完成，可通过 ${videoUrl} 访问`);
    } catch (error) {
      console.error('Failed to initialize AI context:', error);
      updateStatus(videoId, { 
        status: 'error', 
        error: 'Failed to initialize AI context', 
        progress: 0 
      });
    }
  } catch (error: any) {
    console.error('Video processing failed:', error);
    updateStatus(videoId, { 
      status: 'error', 
      error: error.message || 'Video processing failed', 
      progress: 0 
    });
  }
};

/**
 * 更新处理状态
 */
const updateStatus = (videoId: string, update: Partial<ProcessingStatus>) => {
  const status = processingStatusMap.get(videoId);
  
  if (status) {
    const updatedStatus = {
      ...status,
      ...update,
      updatedAt: new Date()
    };
    
    processingStatusMap.set(videoId, updatedStatus);
  }
};

// 定期清理过期的处理状态
setInterval(() => {
  const now = new Date();
  
  for (const [videoId, status] of processingStatusMap.entries()) {
    // 24小时后清理
    if (now.getTime() - status.updatedAt.getTime() > 24 * 60 * 60 * 1000) {
      processingStatusMap.delete(videoId);
    }
  }
}, 60 * 60 * 1000); // 每小时检查一次

export default {
  uploadVideo,
  getVideoStatus,
  simpleAskQuestion
}; 