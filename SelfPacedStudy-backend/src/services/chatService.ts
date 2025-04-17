import { formatDocumentsAsString } from "langchain/util/document";
import { HumanMessage } from "langchain/schema";
import { BaseMessage } from "langchain/schema";
import takeScreenshot from "../utils/takeScreenshot.js";
import { model } from "../utils/modelConfig.js";
import BotMemoryManager from "../utils/BotMemoryManager.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';
import { Document } from "@langchain/core/documents";
import { getResponseWithRetry } from "./llmService.js";
import { smartExtractText } from './ocrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_OUTPUT_DIR = '../../screenshots';

/**
 * Function to serialize chat history into a string.
 * 
 * @param {BaseMessage[]} chatHistory - Array of chat messages.
 * @returns {string} - Serialized chat history.
 */
const serializeChatHistory = (chatHistory:BaseMessage[]): string => 
  chatHistory
    .map((chatMessage) => {
      if (chatMessage._getType() === "human") {
        return `Human: ${chatMessage.content}`;
      } else if (chatMessage._getType() === "ai") {
        return `Assistant: ${chatMessage.content}`;
      } else {
        return `${chatMessage.content}`;
      }
    })
    .join("\n");

/**
 * Function to initialize the bot's context.
 * 
 * @async
 * @param {Buffer|null} slides - Slides data.
 * @param {any} transcriptDocs - Transcript documents.
 */
async function initializeContext(slides: Buffer|null, transcriptDocs: any, url: string, userId: string) {
    await BotMemoryManager.setInstance(userId, slides, transcriptDocs, url);
}

// Add Ollama service availability check function
async function isOllamaServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/version", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    return response.ok;
  } catch (error) {
    console.error("Ollama service unavailable:", error);
    return false;
  }
}

/**
 * Function to ask a question to the bot.
 *
 * @async
 * @param {string} question - The question to ask.
 * @param {number} timestamp - The timestamp of the question.
 * @param userId - ID of the current user.
 * @param {Buffer} [imageData] - Optional image data.
 * @returns {Promise<string>} - The bot's response.
 * @throws Will throw an error if the call chain method fails to execute.
 */
async function askQuestion(question: string, timestamp: number, userId: string, imageData?: Buffer) {
    try {
      const sanitizedQuestion = question.trim().replace("\n", " "); // Remove newlines from the question

      const retriever = await BotMemoryManager.getRetrieverInstance(userId);
      const memory = BotMemoryManager.getMemoryInstance(userId);
      const transcriptRetriever = await BotMemoryManager.getTranscriptRetrieverInstance(userId);

      // Check if context is initialized
      if (!memory || !transcriptRetriever) {
        console.log(`User [${userId}] context not initialized, attempting to create basic context`);
        
        // Create simple mock transcript data
        const mockTranscriptDocs: Document[] = [
          new Document({
            pageContent: "This is a sample lecture content.",
            metadata: { offset: 0, duration: 5000 }
          }),
          new Document({
            pageContent: "The system has automatically created temporary context to respond to your question.",
            metadata: { offset: 5000, duration: 5000 }
          })
        ];

        // Initialize basic context
        const dummyUrl = "https://www.youtube.com/watch?v=_uQrJ0TkZlc";
        try {
          await BotMemoryManager.setInstance(userId, null, mockTranscriptDocs, dummyUrl);
          console.log(`Created basic context for user [${userId}]`);
          
          // Get newly initialized instance
          const newMemory = BotMemoryManager.getMemoryInstance(userId);
          const newTranscriptRetriever = await BotMemoryManager.getTranscriptRetrieverInstance(userId);
          
          if (newMemory && newTranscriptRetriever) {
            console.log(`Successfully initialized context, continuing to process question`);
            // Continue processing question with newly initialized context
            return await processQuestionWithContext(
              sanitizedQuestion, 
              timestamp, 
              userId, 
              newTranscriptRetriever, 
              newMemory, 
              null, // No slides retriever
              imageData
            );
          }
        } catch (initError) {
          console.error(`Failed to create basic context for user [${userId}]:`, initError);
        }
        
        // If initialization fails, return friendly message
        return "I'm sorry, I cannot answer your question right now. The system is preparing learning content, please try again later or refresh the page to restart.";
      }

      // Process question with existing context
      return await processQuestionWithContext(
        sanitizedQuestion,
        timestamp,
        userId,
        transcriptRetriever,
        memory,
        retriever,
        imageData
      );
    } catch (error) {
      console.error("Error processing question:", error);
      return "I'm sorry, there was a technical issue processing your question. Please try again later.";
    }
}

/**
 * Function to process question with context, with improved error handling
 */
async function processQuestionWithContext(
  sanitizedQuestion: string, 
  timestamp: number, 
  userId: string,
  transcriptRetriever: any,
  memory: any,
  retriever: any | null,
  imageData?: Buffer
) {
  try {
    // Check if Ollama service is available
    const serviceAvailable = await isOllamaServiceAvailable();
    if (!serviceAvailable) {
      console.warn("Ollama service unavailable, using fallback response");
      return "Sorry, I cannot connect to the language model service at the moment. Please try again later or contact the administrator.";
    }

    let startOffset = 0;
    if (timestamp > 3000) startOffset = timestamp - 3000;
    const stringWithTimestamp = `Before starting my question: Find between offsets ${startOffset} and ${timestamp + 30000}, and my question is: ` + sanitizedQuestion;
    
    // Use try-catch to independently capture transcript retrieval errors
    let relevantDocsTranscript;
    let serializedTranscript = "";
    try {
      console.log(`[DEBUG] Attempting to get video transcript content, userId: ${userId}, timestamp: ${timestamp}`);
      
      if (!transcriptRetriever) {
        throw new Error("Transcript retriever is null or not initialized");
      }
      
      relevantDocsTranscript = await transcriptRetriever.getRelevantDocuments(stringWithTimestamp);
      console.log(`[DEBUG] Successfully retrieved video transcript content, document count: ${relevantDocsTranscript?.length || 0}`);
      
      if (!relevantDocsTranscript || relevantDocsTranscript.length === 0) {
        console.warn(`[DEBUG] Found transcript documents are empty or length is 0`);
        serializedTranscript = "No relevant transcript content found.";
      } else {
        serializedTranscript = formatDocumentsAsString(relevantDocsTranscript);
        console.log(`[DEBUG] Transcript content serialization completed, length: ${serializedTranscript.length} characters`);
      }
    } catch (transcriptError: unknown) {
      console.error("Failed to get relevant transcript content:", transcriptError);
      console.error(`[ERROR] Transcript query failure details: ${(transcriptError as Error).stack || transcriptError}`);
      serializedTranscript = "Cannot access video transcript content. I can try to answer your question based on general knowledge, but cannot provide answers specific to the video content.";
    }

    // Load bot memory variables
    const savedMemory = await memory.loadMemoryVariables({});
    const hasHistory = savedMemory.chatHistory?.length > 0;
    const chatHistory = hasHistory ? savedMemory.chatHistory : null;

    const chatHistoryString = chatHistory
      ? serializeChatHistory(chatHistory)
      : null;

    let prompt = "";

    // Build prompt, including slides content (if available)
    if (retriever !== null) {
      let relevantDocs;
      let serialized = "";
      try {
        console.log(`[DEBUG] Attempting to get slides content, userId: ${userId}`);
        
        if (!retriever) {
          throw new Error("Slides retriever is null or not initialized");
        }
        
        relevantDocs = await retriever.getRelevantDocuments(sanitizedQuestion);
        console.log(`[DEBUG] Successfully retrieved slides content, document count: ${relevantDocs?.length || 0}`);
        
        if (!relevantDocs || relevantDocs.length === 0) {
          console.warn(`[DEBUG] Found slides documents are empty or length is 0`);
          serialized = "No relevant slides content found.";
        } else {
          serialized = formatDocumentsAsString(relevantDocs);
          console.log(`[DEBUG] Slides content serialization completed, length: ${serialized.length} characters`);
        }
      } catch (retrieverError: unknown) {
        console.error("Failed to get relevant slides content:", retrieverError);
        console.error(`[ERROR] Slides query failure details: ${(retrieverError as Error).stack || retrieverError}`);
        serialized = "Cannot access slides content. I can try to answer your question based on video transcript and general knowledge, but cannot provide answers specific to the slides content.";
      }

      prompt = `The user is currently watching a lecture video and will ask you questions about the lecture and the lecture slides. 
        Use the following pieces of context to answer the question at the end. If you don't know the answer based on the context, use your general knowledge to provide a helpful response.
        ----------------
        CONTEXT OF VIDEO TRANSCRIPT: ${serializedTranscript}
        ----------------
        CONTEXT OF LECTURE SLIDES: ${serialized}
        ----------------
        CHAT HISTORY: ${chatHistoryString}
        ----------------
        QUESTION: ${sanitizedQuestion}
        ----------------
        Helpful Answer:`;
    } else {
      prompt = `The user is currently watching a lecture video and will ask you questions about the lecture and the lecture slides. 
        Use the following pieces of context to answer the question at the end. If you don't know the answer based on the context, use your general knowledge to provide a helpful response.
        ----------------
        CONTEXT OF VIDEO TRANSCRIPT: ${serializedTranscript}
        ----------------
        CHAT HISTORY: ${chatHistoryString}
        ----------------
        QUESTION: ${sanitizedQuestion}
        ----------------
        Helpful Answer:`;
    }

    // If there is image data, add image description prompt
    if (imageData) {
      console.log("Detected image data, size:", imageData.length, "bytes");
      
      // Use OCR to extract image text
      try {
        console.log("Starting OCR text extraction from image");
        const extractedText = await smartExtractText(imageData);
        
        if (extractedText && extractedText.trim().length > 0 && !extractedText.includes("Error extracting text")) {
          console.log("OCR extraction successful, text length:", extractedText.length);
          
          // Add the extracted text to the prompt
          prompt += `\nIMAGE TEXT CONTENT: ${extractedText}\n`;
          
          // No longer add "I can't see the image" prompt since we've extracted the text
        } else {
          console.warn("OCR could not extract valid text");
          prompt += "\nIMAGE CONTENT: The image was provided but no text could be extracted from it. I will try to answer based on the other context available.\n";
        }
      } catch (ocrError) {
        console.error("OCR processing failed:", ocrError);
        prompt += "\nIMAGE CONTENT: An image was provided but I encountered an error processing it. I will try to answer based on the other context available.\n";
      }
      
      try {
        // Save image data to a temporary file for logging
        const tempDir = path.join(__dirname, SCREENSHOTS_OUTPUT_DIR);
        fs.mkdirSync(tempDir, { recursive: true });
        const tempImagePath = path.join(tempDir, `${userId}_${Date.now()}.png`);
        fs.writeFileSync(tempImagePath, imageData);
        console.log("Saved temporary image file:", tempImagePath);
      } catch (error) {
        console.error("Failed to save image file:", error);
      }
    } else {
      prompt += "\nNo image was provided with this question.\n";
    }

    if (sanitizedQuestion.includes("slide")) {
      const url = BotMemoryManager.getUrl(userId);
      
      try {
        const filename = `slide-${timestamp}.png`;
        const screenshotPath = path.join(__dirname, SCREENSHOTS_OUTPUT_DIR, filename);

        await takeScreenshot(url, timestamp, screenshotPath);

        prompt += "\n[Note: A screenshot of the current slide has been captured. I'll try to answer based on the video transcript and slide content.]";

        // 清理截图文件
        if (fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
        }
      } catch (error) {
        console.error("Failed to capture screen screenshot:", error);
      }
    }

    // Clean up screenshot files
    const screenshotsDir = path.join(__dirname, SCREENSHOTS_OUTPUT_DIR);
    if (fs.existsSync(screenshotsDir)) {
      try {
        // Delete files older than 1 day
        const files = fs.readdirSync(screenshotsDir);
        const now = Date.now();
        for (const file of files) {
          const filePath = path.join(screenshotsDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.error("Error cleaning up screenshot files:", error);
      }
    }

    // Build message - Local LLM processed through OllamaAdapter
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: prompt,
        },
        // If there's an image, add image URL (although the current model doesn't support it, keep the structure for future expansion)
        ...(imageData ? [
          {
            type: "image_url",
            image_url: {
              url: "data:image/png;base64,IMAGE_DATA_PLACEHOLDER" // The model doesn't actually process this
            }
          }
        ] : [])
      ]
    });

    try {
      // Use LLM model call with retry functionality
      console.log(`[DEBUG] Invoking LLM with message length: ${prompt.length}`);
      
      // Replace original model.invoke call
      let response;
      try {
        response = await model.invoke([message]);
      } catch (error) {
        // Try direct method call as backup
        try {
          const backupResponse = await getResponseWithRetry(prompt);
          response = { content: backupResponse };
        } catch (backupError) {
          console.error("Both model approaches failed:", backupError);
          return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
        }
      }

      // Save answer to context
      if (memory) {
        try {
          await memory.saveContext({
            input: sanitizedQuestion
          }, {
            output: response.content
          });
        } catch (saveError) {
          console.error("Failed to save context:", saveError);
        }
      }

      // Save to history
      if (imageData) {
        await BotMemoryManager.addHistory(userId, timestamp, sanitizedQuestion, response.content.toString(), imageData);
      } else {
        await BotMemoryManager.addHistory(userId, timestamp, sanitizedQuestion, response.content.toString());
      }

      return response.content;
    } catch (error) {
      console.error("Failed to process question core logic:", error);
      return "Sorry, I encountered difficulties processing your question. Please try again later.";
    }
  } catch (error) {
    console.error("Failed to process question core logic:", error);
    return "Sorry, I encountered difficulties processing your question. Please try again later.";
  }
}

async function writeChatHistory(userId: string) {
  try {
    const doc = await createPdfData(userId);
    const pdfPath = path.join(__dirname, 'chat_history.pdf');
    doc.pipe(fs.createWriteStream(pdfPath));
    
    const csvData = await createCsvData(userId);

    if (!csvData) {
      throw new Error("Failed to generate history data");
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: process.env.EMAIL_ADDRESS,
      subject: '1 New Chat!',
      text: 'Here is the chat history.',
      attachments: [
        {
          filename: 'chat_history.pdf',
          path: pdfPath
        },
        {
          filename: 'chat_history.csv',
          content: csvData
        }
      ]
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
          console.log(error);
      } else {
          console.log('Email sent: ' + info.response);
          BotMemoryManager.deleteSession(userId);
      }
    });
    
  } catch (error) {
      console.error(error);
      throw new Error("Failed to retrieve context from memory.");
  }
}

async function createPdfData(userId: string) {
  try {
    const doc = new PDFDocument;
    const chatHistory = await BotMemoryManager.getHistory(userId);
    const videoUrl = BotMemoryManager.getUrl(userId);
    const slideUploaded = await BotMemoryManager.getRetrieverInstance(userId) !== null;

    doc.font('Helvetica-Bold').fontSize(12).text(`Video URL: ${videoUrl}`, {link: videoUrl});
    doc.font('Helvetica-Bold').fontSize(12).text('Slide uploaded: ', { continued: true });
    doc.font('Helvetica').text(slideUploaded ? "Yes" : "No");

    for (const message of chatHistory) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(11).text(`Timestamp: ${message.timestamp}`, { width: 450 });

      doc.font('Helvetica-Bold').fontSize(11).text('Human message: ', { continued: true, width: 450});
      doc.font('Helvetica').fontSize(11).text(`${message.humanMessage}` , { width: 450 });
      const remainingPageHeight = doc.page.height - doc.y - doc.page.margins.bottom;

      if (message.imageData) {
        if (250 > remainingPageHeight) {
            doc.addPage();
        }
        doc.image(message.imageData, {
          height: 250,
          width: 500,
        });
        doc.y = doc.y + 250;
      }

      doc.font('Helvetica-Bold').fontSize(11).text('AI message: ', { continued: true, width: 450});
      doc.font('Helvetica').fontSize(11).text(`${message.aiMessage}`, { width: 450 });
    }

    doc.end();

    return doc;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to retrieve context from memory.");
  }
}

 async function createCsvData(userId: string) : Promise<string | null> {
  const chatHistory = await BotMemoryManager.getHistory(userId);
  const writer = createObjectCsvStringifier({
        header: [
            {id: 'timestamp', title: 'TIMESTAMP'},
            {id: 'humanMessage', title: 'HUMAN MESSAGE'},
            {id: 'aiMessage', title: 'AI MESSAGE'},
        ]
    });

    let csvData = writer.getHeaderString();
    csvData += writer.stringifyRecords(chatHistory);

    return csvData;
 }

export { askQuestion, initializeContext, writeChatHistory, createPdfData};