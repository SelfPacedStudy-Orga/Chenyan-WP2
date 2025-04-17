declare module 'tesseract.js' {
  interface TesseractRecognizeResult {
    data: {
      text: string;
      lines: any[];
      words: any[];
      symbols: any[];
      blocks: any[];
      confidence: number;
      [key: string]: any;
    };
    [key: string]: any;
  }

  namespace Tesseract {
    function recognize(
      image: string | Buffer | File | HTMLImageElement | HTMLCanvasElement,
      lang?: string,
      options?: {
        logger?: (status: { status: string; progress: number }) => void;
        [key: string]: any;
      }
    ): Promise<TesseractRecognizeResult>;

    function detect(
      image: string | Buffer | File | HTMLImageElement | HTMLCanvasElement
    ): Promise<{ data: { script: string; confidence: number } }>;
  }

  export = Tesseract;
} 