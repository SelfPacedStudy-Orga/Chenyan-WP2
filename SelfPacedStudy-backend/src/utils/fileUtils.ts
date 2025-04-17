import fs from "fs";
import path from "path";

/**
 * 确保目录存在，不存在则创建
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`目录已创建: ${dirPath}`);
  }
}

/**
 * 将 buffer 内容写入指定文件
 */
export function writeFile(filePath: string, buffer: Buffer): void {
  fs.writeFileSync(filePath, buffer);
}

/**
 * 读取文本文件内容
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * 根据原始文件名，将扩展名替换为 .txt
 */
export function getTranscriptFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, ".txt");
}

/**
 * 确保uploads目录存在，并返回路径
 */
export function getUploadsDir(relativePath: string = ''): string {
  const baseDir = process.env.UPLOADS_DIR || 'uploads';
  const fullPath = path.join(process.cwd(), baseDir, relativePath);
  ensureDir(path.dirname(fullPath));
  return fullPath;
}

/**
 * 获取静态资源的URL
 */
export function getStaticUrl(filePath: string): string {
  const baseUrl = process.env.STATIC_URL || '';
  return `${baseUrl}/${filePath.replace(/^\//, '')}`;
}

/**
 * 安全删除文件（如果存在）
 */
export function safeDeleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`删除文件失败: ${filePath}`, error);
    return false;
  }
}

// **确保所有工具函数都正确导出**
export default {
  ensureDir,
  writeFile,
  readFile,
  getTranscriptFileName,
  getUploadsDir,
  getStaticUrl,
  safeDeleteFile,
};
