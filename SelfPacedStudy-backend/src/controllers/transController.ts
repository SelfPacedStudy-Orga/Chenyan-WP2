import { Request, Response } from 'express';
import path from 'path';
import { ensureDir, writeFile, getUploadsDir } from '../utils/fileUtils';
import { transcribeVideo } from '../services/whisperService';

const transController = {
  handleTranscript: async (req: Request, res: Response) => {
    try {
      // 检查是否上传了视频文件
      if (!req.file) {
        return res.status(400).json({ error: '未提供视频文件' });
      }

      // 确保 uploads 目录存在
      const uploadsDir = getUploadsDir();
      ensureDir(uploadsDir);

      // 构造上传文件的完整路径
      const videoPath = path.join(uploadsDir, req.file.originalname);
      // 保存上传的文件
      writeFile(videoPath, req.file.buffer);

      // 调用 Whisper 服务执行转录
      const { transcriptPath, transcriptContent } = await transcribeVideo(videoPath);

      res.json({ transcriptPath, transcriptContent });
    } catch (error) {
      console.error('转录出错：', error);
      res.status(500).json({ error: '转录失败' });
    }
  }
};

export default transController;
