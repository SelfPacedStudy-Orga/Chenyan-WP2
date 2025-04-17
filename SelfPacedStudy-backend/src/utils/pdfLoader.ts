import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Blob } from 'fetch-blob';

/** 
  * Function to get chunked documents from a PDF buffer.
  * 
  * @async
  * @param {Buffer} buffer - The PDF buffer.
  * @returns {Promise<Document[]>} - The chunked documents.
  * @throws Will throw an error if the call chain method fails to execute.
  */
export async function getChunkedDocsFromPDF(buffer: Buffer) {
  try {
    const blob = new Blob([buffer]);
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunkedDocs = await textSplitter.splitDocuments(docs);

    return chunkedDocs;
  } catch (e) {
    console.error(e);
    throw new Error("PDF docs chunking failed !");
  }
}