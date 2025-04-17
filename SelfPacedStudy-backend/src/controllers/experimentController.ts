import { Request, Response } from 'express';
import transcriptService from "../services/transcriptService.js";
import { initializeContext } from "../services/chatService.js";

/**
 * Handles the experiment transcript request and returns the appropriate video URL
 *
 * @async
 * @function handleExperimentTranscript
 * @param {Request} req - Express.js request object
 * @param {Response} res - Express.js response object
 * @returns {Promise<void>} - Promise that resolves when completed
 */
async function handleExperimentTranscript(req: Request, res: Response): Promise<void> {
    try {
        // Get user ID
        const userId = req.body.userId;
        // Get lecture number
        const lectureNumber = req.body.lectureNumber || '15'; // Default to lecture 15
        // Get isTest parameter
        const isTest = req.body.isTest || 'false';

        // Map of lecture videos
        const lectureMap: Record<string, string> = {
            '10': 'https://www.youtube.com/watch?v=example10',
            '11': 'https://www.youtube.com/watch?v=example11',
            '12': 'https://www.youtube.com/watch?v=example12',
            '15': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // Example video URL for lecture 15
        };

        const videoUrl = lectureMap[lectureNumber];
        
        if (!videoUrl) {
            throw new Error(`Video URL not found for lecture ${lectureNumber}`);
        }

        // No PDF for experiment
        let mergedPdfBuffer: Buffer | null = null;

        // Get video transcript
        const transcriptDocs = await transcriptService.getVideoTranscript(videoUrl);

        // Initialize LLM context with transcript and slides for the specific user
        await initializeContext(mergedPdfBuffer, transcriptDocs, videoUrl, userId);

        // Return success response with video URL
        res.status(200).json({ 
            message: "Experiment lecture processed successfully", 
            videoUrl: videoUrl,
            lectureNumber: lectureNumber
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            res.status(500).json({ message: "Error processing experiment lecture", error: error.message });
        } else {
            console.error('An unexpected error occurred:', error);
            res.status(500).json({ message: "An unexpected error occurred" });
        }
    }
}

export default { handleExperimentTranscript } 