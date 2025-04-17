import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple implementation of OCR function to extract text from images - Based on system command line tools
 * 
 * @param {Buffer} imageBuffer - Image data buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    console.log(`Starting OCR image processing, size: ${imageBuffer.length} bytes`);
    
    // Save temporary image file for processing
    const tempImagePath = path.join(__dirname, '../../temp', `ocr-temp-${Date.now()}.png`);
    const outputTextPath = path.join(__dirname, '../../temp', `ocr-text-${Date.now()}.txt`);
    fs.mkdirSync(path.dirname(tempImagePath), { recursive: true });
    fs.writeFileSync(tempImagePath, imageBuffer);
    
    // Use system installed tesseract command line tool
    const start = Date.now();
    
    try {
      // Check if tesseract is installed
      await execAsync('which tesseract');
      
      // Run OCR command
      await execAsync(`tesseract ${tempImagePath} ${outputTextPath.replace('.txt', '')}`);
      
      // Read results
      let extractedText = '';
      if (fs.existsSync(outputTextPath)) {
        extractedText = fs.readFileSync(outputTextPath, 'utf8');
        
        // Clean up temporary files
        fs.unlinkSync(outputTextPath);
      }
      
      const duration = Date.now() - start;
      console.log(`OCR processing completed, duration: ${duration}ms, extracted text length: ${extractedText.length} characters`);
      
      // Clean up temporary image file
      try {
        fs.unlinkSync(tempImagePath);
      } catch (error) {
        console.error('Failed to delete OCR temporary file:', error);
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn('OCR failed to extract any text content');
        return 'No text detected in the image.';
      }
      
      return extractedText;
    } catch (cmdError) {
      console.error('System OCR command execution failed:', cmdError);
      
      // Write a simple prompt as a backup solution
      return 'Unable to perform OCR. Please ensure the tesseract command line tool is installed, or describe the image content in your question.';
    }
  } catch (error) {
    console.error('OCR text extraction failed:', error);
    return `Error extracting text: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Smart text extraction (simplified version)
 * 
 * @param {Buffer} imageBuffer - Image data buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function smartExtractText(imageBuffer: Buffer): Promise<string> {
  return await extractTextFromImage(imageBuffer);
} 