import { Request, Response } from 'express';
import transcriptService from "../services/transcriptService.js";
import { initializeContext } from "../services/chatService.js";

/**
 * Asynchronously handles transcript processing of the video and slides.
 * 
 * @async
 * @function handleTranscript
 * @param {Request} req - Express.js request object.
 * @param {Response} res - Express.js response object.
 * @returns {Promise<void>} - A Promise that resolves when the function has completed.
 * 
 * @throws Will throw an error if the URL is not included in the request body.
 */
async function handleTranscript(req: Request, res: Response): Promise<void> {
    try {
        let mergedPdfBuffer: Buffer | null = null;

        // Handle file transcript (if files are provided)
        if (req.files?.length !== 0) {
            console.log('Files uploaded successfully', req.files)
            const files = req.files as Express.Multer.File[];
            const pdfBuffers = files.map(file => file.buffer);
            mergedPdfBuffer = await transcriptService.mergeSlides(pdfBuffers); 
        }

        // Extract URL from the request
        const url = req.body.url;

        // Extract userId from the request
        const userId = req.body.userId;

        // Handle URL transcript (if URL is provided)
        if (!url) {
            throw new Error('No URL provided');
        }

        const transcriptDocs = await transcriptService.getVideoTranscript(url);

        // Initialize the context for LLM with the transcript and slides for the specific user
        await initializeContext(mergedPdfBuffer, transcriptDocs, url, userId);

        res.status(200).json({ message: "Transcripts processed successfully" });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            res.status(500).json({ message: "Error processing transcripts", error: error.message });
        } else {
            // If it's not an Error instance, you might not be able to get a message property
            console.error('An unexpected error occurred:', error);
            res.status(500).json({ message: "An unexpected error occurred" });
        }
    }
}

export default {handleTranscript}