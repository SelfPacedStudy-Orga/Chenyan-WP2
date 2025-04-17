import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * 对指定的视频文件调用 Whisper CLI 进行转录。
 * @param videoPath 视频文件的路径（如 "lecture.mp4"）
 * @param model Whisper 模型版本（默认 "base"）
 * @returns 转录后生成的 txt 文件路径
 */
export async function transcribeVideo(videoPath: string, model: string = 'base'): Promise<string> {
  // 构造 Whisper 命令，CLI 会根据视频生成同名的 .txt 文件
  const command = `whisper "${videoPath}" --model ${model}`;
  try {
    const { stdout, stderr } = await execPromise(command);
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
    // 根据视频文件名称构造输出文件路径（将扩展名替换为 .txt）
    const outputTxt = videoPath.replace(/\.[^/.]+$/, '.txt');
    return outputTxt;
  } catch (error) {
    console.error('转录出错：', error);
    throw error;
  }
}
