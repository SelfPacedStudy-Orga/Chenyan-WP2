import { Document } from "@langchain/core/documents";
import { initializeContext, askQuestion } from './services/chatService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { dirname } from 'path';

/**
 * 直接使用whisper命令并处理输出
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
 * 手动创建转录文本（如果whisper失败）
 */
function createManualTranscript(): string {
  return `Hi, I'm Wu Xingsu from University of Shanghai for Science and Technology.
I would like to introduce our work titled Source 3 Domentitation with Frozen Body Model, Foundation Model.
First, I would like to introduce Unsupervised Domain Adaptation, UDA.
UDA until brings the gap between the source and target domain, which may have different data distribution.
Both labeled source data and unlabeled target data available during the adaptation.
But it's unrealistic for some real-world scenarios involving privacy, because the source domain data cannot be assessed.
Thus, more recent method focusing on Source 3 Domain Adaptation.
Therefore, the goal of the setting is transferring per change.`;
}

/**
 * 从本地视频生成转录并测试LLM问答
 */
async function testLocalVideo() {
  try {
    // 步骤1: 配置参数
    const testUserId = 'test-user-' + Date.now();
    const testVideoPath = process.argv[2]; // 从命令行参数获取视频路径
    
    if (!testVideoPath) {
      console.error('请提供视频文件路径作为参数，例如: npm run test-video /path/to/video.mp4');
      process.exit(1);
    }

    console.log(`=== 开始本地视频测试流程 ===`);
    console.log(`用户ID: ${testUserId}`);
    console.log(`视频路径: ${testVideoPath}`);
    
    // 步骤2: 使用Whisper生成转录
    console.log('\n[1/4] 开始转录视频...');
    let transcriptContent = '';
    try {
      transcriptContent = await transcribeVideoDirectly(testVideoPath);
    } catch (error) {
      console.log('使用whisper命令转录失败，使用手动创建的转录文本');
      transcriptContent = createManualTranscript();
    }
    
    console.log(`转录文本内容预览: ${transcriptContent.substring(0, 100)}...`);
    
    // 步骤3: 将转录文本转换为Langchain文档
    console.log('\n[2/4] 处理转录文本...');
    const segments = transcriptContent.split(/\n+/).filter(segment => segment.trim() !== '');
    
    // 创建文档，每个片段的metadata包含时间信息
    const transcriptDocs = segments.map((segment, index) => {
      return new Document({
        pageContent: segment,
        metadata: { offset: index * 5000, duration: 5000 } // 简单假设每个片段5秒
      });
    });
    console.log(`创建了 ${transcriptDocs.length} 个转录片段文档`);
    
    // 步骤4: 初始化AI上下文
    console.log('\n[3/4] 初始化AI上下文...');
    const videoUrl = `file://${testVideoPath}`; // 使用本地文件URL
    await initializeContext(null, transcriptDocs, videoUrl, testUserId);
    console.log('上下文初始化完成');
    
    // 步骤5: 测试问题
    console.log('\n[4/4] 测试问答功能...');
    const testQuestions = [
      '这个视频讲的是什么内容？',
      '请总结一下视频的主要观点',
      '视频中提到了哪些关键概念？'
    ];
    
    for (const [index, question] of testQuestions.entries()) {
      console.log(`\n问题 ${index + 1}: ${question}`);
      const answer = await askQuestion(question, 10000, testUserId); // 假设在10秒处提问
      console.log(`回答: ${answer}`);
    }
    
    // 自定义问题
    if (process.argv[3]) {
      const customQuestion = process.argv[3];
      console.log(`\n自定义问题: ${customQuestion}`);
      const answer = await askQuestion(customQuestion, 15000, testUserId);
      console.log(`回答: ${answer}`);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 执行测试
testLocalVideo(); 