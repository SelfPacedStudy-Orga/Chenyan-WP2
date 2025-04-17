import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { getChunkedDocsFromPDF } from "./pdfLoader.js";
import { BufferMemory } from "langchain/memory";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { SelfQueryRetriever } from "langchain/retrievers/self_query";
import { FunctionalTranslator } from "langchain/retrievers/self_query/functional";
import { AttributeInfo } from "langchain/schema/query_constructor";
import { VectorStore } from "@langchain/core/vectorstores";
import { generateLLMResponse } from "../services/llmService.js";
import { LocalEmbeddings } from "../services/llmService.js";
import { OllamaAdapter } from "./OllamaAdapter.js";

/**
 * 定义可查询的属性
 */
const attributeInfo: AttributeInfo[] = [
  {
    name: "offset",
    description: "The timestamp in milliseconds of the start of the sentence",
    type: "number",
  },
  {
    name: "duration",
    description: "The duration of the sentence in milliseconds",
    type: "number",
  },
];

class BotMemoryManager {
  private static userSessions: Map<string, UserSession> = new Map();

  /**
   * 获取或初始化用户会话
   */
  private static getSessionForUser(userId: string): UserSession {
    if (!this.userSessions.has(userId)) {
      const newUserSession = new UserSession();
      this.userSessions.set(userId, newUserSession);
      return newUserSession;
    }
    return <UserSession>this.userSessions.get(userId);
  }

  /**
   * 删除用户会话
   */
  public static deleteSession(userId: string): boolean {
    if (this.userSessions.has(userId)) {
      this.userSessions.delete(userId);
      console.log(`Session for userId ${userId} has been deleted.`);
      return true;
    } else {
      console.log(`No session found for userId ${userId}.`);
      return false;
    }
  }

  public static async setInstance(userId: string, slides: Buffer | null, transcriptDocs: Document[], url: string): Promise<void> {
    const session = this.getSessionForUser(userId);
    await session.setInstance(slides, transcriptDocs, url);
  }

  public static async addHistory(userId: string, timestamp: number, humanMessage: string, aiMessage: string, imageData?: Buffer): Promise<void> {
    const session = this.getSessionForUser(userId);
    session.addHistory(timestamp, humanMessage, aiMessage, imageData);
  }

  public static async getRetrieverInstance(userId: string): Promise<any | null> {
    const session = this.getSessionForUser(userId);
    return session.getRetrieverInstance();
  }

  public static getMemoryInstance(userId: string): BufferMemory | null {
    const session = this.getSessionForUser(userId);
    return session.getMemoryInstance();
  }

  public static async getTranscriptRetrieverInstance(userId: string): Promise<any | null> {
    const session = this.getSessionForUser(userId);
    return session.getTranscriptRetrieverInstance();
  }

  public static getUrl(userId: string): string {
    const session = this.getSessionForUser(userId);
    return session.getUrl();
  }

  public static async getHistory(userId: string): Promise<{ timestamp: number; humanMessage: string; aiMessage: string, imageData?: Buffer;}[]> {
    const session = this.getSessionForUser(userId);
    return session.getHistory();
  }
}

class UserSession {
  private retriever: any | null = null;
  private memory: BufferMemory | null = null;
  private transcriptRetriever: any | null = null;
  private url: string = "";
  private history: { timestamp: number; humanMessage: string; aiMessage: string; imageData?: Buffer; }[] = [];

  public async setInstance(slides: Buffer | null, transcriptDocs: Document[], url: string ): Promise<void> {
    if (slides !== null) {
      const docs = await getChunkedDocsFromPDF(slides);
      // 使用本地嵌入服务代替OpenAI嵌入
      const localEmbeddings = new LocalEmbeddings("nomic-embed-text");
      try {
        const vectorStoreSlides = await HNSWLib.fromDocuments(docs, localEmbeddings as any);
        this.retriever = vectorStoreSlides.asRetriever();
      } catch (error) {
        console.error("创建向量存储失败:", error);
        this.retriever = null;
      }
    }

    this.url = url;

    this.memory = new BufferMemory({
      memoryKey: "chatHistory",
      inputKey: "question", 
      outputKey: "text", 
      returnMessages: true,
    });

    // 使用标准LangChain Ollama适配器
    const llm = new OllamaAdapter({
      modelName: "llama2",
      baseUrl: "http://localhost:11434"
    });
    
    const documentContents = "Transcript of the lecture video";
    try {
      // 使用本地嵌入服务代替OpenAI嵌入
      const localEmbeddings = new LocalEmbeddings("nomic-embed-text");
      const vectorStoreTranscript = await MemoryVectorStore.fromDocuments(transcriptDocs, localEmbeddings as any);
      
      // 创建检索器
      this.transcriptRetriever = await SelfQueryRetriever.fromLLM({
        llm: llm,
        vectorStore: vectorStoreTranscript as any,
        documentContents,
        attributeInfo,
        structuredQueryTranslator: new FunctionalTranslator(),
      });
    } catch (error) {
      console.error("创建转录检索器失败:", error);
      this.transcriptRetriever = null;
    }
  }

  public async addHistory(timestamp: number, humanMessage: string, aiMessage: string, imageData?: Buffer): Promise<void> {
    if (imageData) {
      this.history.push({ timestamp, humanMessage, aiMessage, imageData});
    }
    else {
      this.history.push({ timestamp, humanMessage, aiMessage });
    }
  }

  public getRetrieverInstance(): any | null {
    return this.retriever;
  }

  public getMemoryInstance(): BufferMemory | null {
    return this.memory;
  }

  public getTranscriptRetrieverInstance(): any | null {
    return this.transcriptRetriever;
  }

  public getUrl(): string {
    return this.url;
  }

  public async getHistory(): Promise<{ timestamp: number; humanMessage: string; aiMessage: string; imageData?: Buffer }[]> {
    return this.history;
  }
}

export default BotMemoryManager;
