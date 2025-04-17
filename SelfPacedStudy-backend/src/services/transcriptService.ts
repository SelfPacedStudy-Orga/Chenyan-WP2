import {PDFDocument} from 'pdf-lib';
import { Document } from "@langchain/core/documents";
import {YoutubeGrabTool} from "../utils/GetYoutubeTranscript.js";

// Define the maximum time gap allowed between sentences in the same paragraph
const MAX_TIME_GAP = 30000; // In milliseconds

/**
 * Function to form paragraphs from the transcript.
 * 
 * @param {Object[]} transcript - Array of transcript items.
 * @returns {Document[]} - Array of Document objects representing paragraphs.
 */
const formParagraphs = (transcript: {text: string, duration: number, offset: number}[]) => {
    const paragraphs: Document[] = [];
    let currentParagraph: string[] = [];
    let lastOffset: number = 0;
    let firstOffset: number = 0;
    transcript.forEach((item) => {
        if (lastOffset - firstOffset > MAX_TIME_GAP) {
            // If the gap is too large, start a new paragraph
            //currentParagraph.unshift(`From ${firstOffset} milliseconds to ${lastOffset} milliseconds, the speaker says: `);
            paragraphs.push(new Document({
                pageContent: currentParagraph.join(' '),
                metadata: {offset: firstOffset, duration: lastOffset - firstOffset}
                })
            );
            currentParagraph = [];
            firstOffset = lastOffset;
        }
        currentParagraph.push(item.text);
        lastOffset = item.offset;
    });
    // Add the last paragraph if it's not empty
    if (currentParagraph.length > 0) {
        paragraphs.push(new Document({
            pageContent: currentParagraph.join(' '),
            metadata: {offset: firstOffset, duration: lastOffset - firstOffset}
            })
        );
    }
    
    return paragraphs;
}

/**
 * Asynchronous function to get the video transcript. It uses Youtube's API to fetch the transcript.
 * 
 * @async
 * @param {string} url - The URL of the video.
 * @returns {Promise<Document[]>} - A Promise that resolves to an array of Document objects representing paragraphs.
 * @throws Will throw an error if the transcript cannot be fetched or written.
 */
async function getVideoTranscript(url: string): Promise<Document[]> {

    try {
        const transcript = await  YoutubeGrabTool.fetchTranscript(url);
        
        return formParagraphs(transcript);

    } catch(error) {
        console.error('Error fetching or writing youtube video transcript!');
        throw error;
    }
}

/**
 * Asynchronous function to merge slides.
 * 
 * @async
 * @param {Buffer[]} pdfBuffers - Array of Buffer objects representing PDFs.
 * @returns {Promise<Buffer>} - A Promise that resolves to a Buffer object representing the merged PDF.
 */
async function mergeSlides(pdfBuffers: Buffer[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
}

export default {
    getVideoTranscript,
    mergeSlides
}
