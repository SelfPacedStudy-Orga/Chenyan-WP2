import { Request, Response } from 'express';
import transcriptService from "../services/transcriptService.js";
import { initializeContext } from "../services/chatService.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Document } from "@langchain/core/documents";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 处理用户研究讲座请求，根据讲座编号返回相应的视频URL
 *
 * @async
 * @function handleUserStudyTranscript
 * @param {Request} req - Express.js请求对象
 * @param {Response} res - Express.js响应对象
 * @returns {Promise<void>} - 完成时解析的Promise
 */
async function handleUserStudyTranscript(req: Request, res: Response): Promise<void> {
    try {
        // 获取用户ID
        const userId = req.body.userId;
        // 获取讲座编号
        const lectureNumber = req.body.lectureNumber;

        if (!lectureNumber) {
            throw new Error('讲座编号未提供');
        }

        console.log(`处理讲座请求: 用户ID=${userId}, 讲座编号=${lectureNumber}`);

        // 使用本地测试视频URL和转录文本
        // 这些URL可以是实际可访问的视频URL
        const lectureMap: Record<string, string> = {
            '1': 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', // Python教程视频 - 实际可访问
            '2': 'https://www.youtube.com/watch?v=rfscVS0vtbw', // 另一个Python教程
            '3': 'https://www.youtube.com/watch?v=8jLOx1hD3_o', // JavaScript教程
            '4': 'https://www.youtube.com/watch?v=W6NZfCO5SIk', // JavaScript基础
            '5': 'https://www.youtube.com/watch?v=PkZNo7MFNFg'  // JavaScript教程
        };

        const videoUrl = lectureMap[lectureNumber];
        
        if (!videoUrl) {
            throw new Error(`未找到讲座${lectureNumber}的视频URL`);
        }

        // 测试转录文本 - 使用简单的固定数据而不是尝试获取
        // 创建mock转录数据
        const mockTranscriptDocs: Document[] = [
            new Document({
                pageContent: "欢迎来到这个教学视频。今天我们将学习编程基础。",
                metadata: { offset: 0, duration: 5000 }
            }),
            new Document({
                pageContent: "编程是解决问题的过程，通过编写计算机可以执行的指令。",
                metadata: { offset: 5000, duration: 5000 }
            }),
            new Document({
                pageContent: "我们将学习变量、条件语句、循环和函数等基本概念。",
                metadata: { offset: 10000, duration: 5000 }
            }),
        ];

        // 不从YouTube获取，而是使用本地测试数据
        // const transcriptDocs = await transcriptService.getVideoTranscript(videoUrl);
        const transcriptDocs = mockTranscriptDocs;

        // 为特定用户初始化LLM上下文，包含转录文本和幻灯片
        const mergedPdfBuffer: Buffer | null = null; // 不使用PDF
        await initializeContext(mergedPdfBuffer, transcriptDocs, videoUrl, userId);

        // 返回成功响应，包括视频URL
        res.status(200).json({ 
            message: "用户研究讲座处理成功", 
            videoUrl: videoUrl,
            lectureNumber: lectureNumber
        });
        
        console.log(`讲座请求处理成功: videoUrl=${videoUrl}`);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('错误信息:', error.message);
            res.status(500).json({ message: "处理用户研究讲座时出错", error: error.message });
        } else {
            console.error('发生意外错误:', error);
            res.status(500).json({ message: "发生意外错误" });
        }
    }
}

export default { handleUserStudyTranscript } 