// 创建测试PDF文件
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// 获取当前目录
const currentDir = process.cwd();
// 创建目录路径
const targetDir = path.join(currentDir, 'test', 'data');

// 确保目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`创建目录: ${targetDir}`);
}

// 创建一个新的PDF文档
const doc = new PDFDocument();
// 设置输出路径
const outputPath = path.join(targetDir, '05-versions-space.pdf');
const output = fs.createWriteStream(outputPath);
// 将PDF流到文件
doc.pipe(output);

// 添加一些基本内容
doc.fontSize(25).text('Test PDF Document', 100, 100);
doc.fontSize(12).text('This is a test file for pdf-parse library', 100, 150);

// 完成PDF
doc.end();

console.log(`测试PDF文件创建成功: ${outputPath}`); 