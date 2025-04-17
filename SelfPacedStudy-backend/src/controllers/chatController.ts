import { Request, Response } from 'express';
import {askQuestion, createPdfData, writeChatHistory} from '../services/chatService.js';
import { logger } from '../utils/logger.js';

/**
 * Asynchronously handles incoming chat messages.
 * 
 * @async
 * @function handleIncomingMessage
 * @param {Request} req - Express.js request object.
 * @param {Response} res - Express.js response object.
 * @returns {Promise<void>} - A Promise that resolves when the function has completed.
 * 
 * @throws Will throw an error if the message is not included in the request body.
 */
async function handleIncomingMessage(req: Request, res: Response): Promise<void> {
    try {
        const { message, videoPosition, userId } = req.body;
        const imageData = req.file ? req.file.buffer : undefined;

        if (!message) {
            res.status(400).json({ error: 'No message in the request' });
            return;
        }
        
        // Log request information
        console.log(`Received chat request: message=${message.substring(0, 30)}..., videoPosition=${videoPosition}, userId=${userId}`);
        
        const timestamp = videoPosition * 1000;
        const result = await askQuestion(message, timestamp, userId, imageData);
        
        // Check if the result exists
        if (!result) {
            console.warn(`User [${userId}]'s question returned empty result`);
            res.status(200).send({ 
                result: "Sorry, the AI assistant is temporarily unable to process your question. Please try again later." 
            });
            return;
        }
        
        // Return normal result
        console.log(`Successfully processed user [${userId}]'s question, returned result: ${result.substring(0, 50)}...`);
        res.status(200).send({ result });

    } catch (error) {
        // Log detailed error
        console.error("Error processing chat message:", error);
        
        // Return friendly message even if error occurs
        res.status(200).send({ 
            result: "There was a problem processing your request. Please try again later." 
        });
        
        // Record to log system
        logger.error(error);
    }
}

async function handleSave(req: Request, res: Response) {
    try {
        const userId = req.body.userId;
        await writeChatHistory(userId);
        res.status(200).json({ message: 'Chat history written successfully' });
    } catch (error) {
        res.status(500).json({ error });
        logger.error(error);
    }
}

async function handleReturnHistory(req: Request, res: Response) {
    try {
        const userId = req.body.userId;
        const pdfData = await createPdfData(userId);
        // Set the Content-Type header
        res.setHeader('Content-Type', 'application/pdf');
        pdfData.pipe(res);
    } catch (error) {
        res.status(500).json({ error });
        logger.error(error);
    }
}

export default {
    handleIncomingMessage,
    handleSave,
    handleReturnHistory
};