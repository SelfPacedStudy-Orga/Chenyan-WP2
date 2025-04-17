import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from '../utils/fileUtils';

const execPromise = promisify(exec);

/**
 * 调用 Whisper CLI 对视频文件进行转录
 * @param videoPath 视频文件路径
 * @param model Whisper 模型，可选参数，默认 "base"
 * @returns Promise 包含转录文件路径和内容
 */
export async function transcribeVideo(
  videoPath: string,
  model: string = 'base'
): Promise<{ transcriptPath: string; transcriptContent: string }> {
  // 构造命令（确保服务器环境中已安装 Whisper CLI）
  const command = `whisper "${videoPath}" --model ${model}`;
  const { stdout, stderr } = await execPromise(command);
  console.log(stdout);
  if (stderr) {
    console.error(stderr);
  }
  // 根据视频文件名构造转录文件路径（扩展名替换为 .txt）
  const transcriptPath = videoPath.replace(/\.[^/.]+$/, '.txt');

  let transcriptContent = '';
  try {
    transcriptContent = readFile(transcriptPath);
  } catch (error) {
    console.error('读取转录文件失败:', error);
  }
  return { transcriptPath, transcriptContent };
}
