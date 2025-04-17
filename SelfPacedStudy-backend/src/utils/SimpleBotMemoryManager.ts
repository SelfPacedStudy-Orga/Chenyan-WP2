import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { getChunkedDocsFromPDF } from "./pdfLoader.js";
import { BufferMemory } from "langchain/memory";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { LocalEmbeddings } from "../services/llmService.js";
import { model } from "./modelConfig.js";
import { HumanMessage } from "langchain/schema";

/**
 * 简化版BotMemoryManager，使用基本向量检索而非SelfQueryRetriever
 */
class SimpleBotMemoryManager {
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

  public static async getTranscriptDocs(userId: string): Promise<Document[] | null> {
    const session = this.getSessionForUser(userId);
    return session.getTranscriptDocs();
  }

  public static async getHistory(userId: string): Promise<{ timestamp: number; humanMessage: string; aiMessage: string, imageData?: Buffer;}[]> {
    const session = this.getSessionForUser(userId);
    return session.getHistory();
  }
  
  /**
   * 简化版问答函数，直接将转录文本作为上下文
   */
  public static async askQuestion(question: string, userId: string, timestamp: number = 0): Promise<string> {
    try {
      console.log(`[DEBUG] SimpleBotMemoryManager.askQuestion 被调用，用户ID: ${userId}, 时间戳: ${timestamp}`);
      // 获取转录文档
      const transcriptDocs = await this.getTranscriptDocs(userId);

      // 即使没有转录内容，也尝试回答
      if (!transcriptDocs || transcriptDocs.length === 0) {
        console.log(`[DEBUG] 用户 ${userId} 没有可用的转录文本，将使用通用知识回答`);
        
        // 构建一个通用提示
        const generalPrompt = `
请回答以下问题：${question}

注意：我目前无法访问相关视频的转录内容，但我会尝试基于一般知识回答您的问题。
`;

        // 创建消息
        const message = new HumanMessage({
          content: generalPrompt
        });
        
        try {
          // 调用模型
          const response = await model.invoke([message]);
          
          // 保存到历史记录
          await this.addHistory(userId, timestamp, question, response.content.toString());
          
          return response.content.toString();
        } catch (modelError) {
          console.error("[ERROR] 模型调用失败，尝试直接回答:", modelError);
          return "我目前无法访问视频内容，但我可以回答其他一般性问题。请问有什么我可以帮助您的？";
        }
      }
      
      // 从转录中找到与时间戳相关的部分
      const relevantDocs = transcriptDocs.filter(doc => {
        const docOffset = doc.metadata.offset || 0;
        const docDuration = doc.metadata.duration || 5000;
        // 扩大时间戳的匹配范围，提高相关性
        const startWindow = Math.max(0, timestamp - 60000); // 前一分钟
        const endWindow = timestamp + 120000; // 后两分钟
        return (docOffset >= startWindow && docOffset <= endWindow) || 
               (timestamp >= docOffset && timestamp <= (docOffset + docDuration));
      });
      
      // 如果没有找到相关部分，使用更多的转录内容作为上下文
      let contextDocs = relevantDocs.length > 0 ? relevantDocs : [];
      
      if (contextDocs.length === 0) {
        // 获取时间戳之前和之后的部分内容，确保有足够的上下文
        const sortedDocs = [...transcriptDocs].sort((a, b) => 
          (a.metadata.offset || 0) - (b.metadata.offset || 0)
        );
        
        // 查找最接近当前时间戳的文档
        let closestIndex = 0;
        let minDiff = Number.MAX_SAFE_INTEGER;
        
        for (let i = 0; i < sortedDocs.length; i++) {
          const diff = Math.abs((sortedDocs[i].metadata.offset || 0) - timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
        
        // 获取周围的内容（前5个和后10个文档）
        const startIndex = Math.max(0, closestIndex - 5);
        const endIndex = Math.min(sortedDocs.length - 1, closestIndex + 10);
        contextDocs = sortedDocs.slice(startIndex, endIndex + 1);
      }
      
      // 如果仍然没有上下文，使用前20个文档
      if (contextDocs.length === 0 && transcriptDocs.length > 0) {
        contextDocs = transcriptDocs.slice(0, Math.min(20, transcriptDocs.length));
      }
      
      // 转换为文本
      const transcriptContext = contextDocs.map(doc => doc.pageContent).join("\n");
      console.log(`[DEBUG] 生成的转录上下文 (${contextDocs.length} 段落): ${transcriptContext.substring(0, 200)}...`);
      
      // 构建提示
      const prompt = `
以下是视频转录的内容:
---
${transcriptContext}
---

请根据上面的视频转录内容回答问题: ${question}

如果你无法从转录内容中找到答案，请直接说你不知道具体内容，但你会尝试基于一般知识回答这个问题。如果问题与视频内容无关，你可以直接回答。
`;

      // 创建消息
      const message = new HumanMessage({
        content: prompt
      });
      
      try {
        // 调用模型
        const response = await model.invoke([message]);
        
        // 保存到历史记录
        await this.addHistory(userId, timestamp, question, response.content.toString());
        
        return response.content.toString();
      } catch (modelError) {
        console.error("[ERROR] 模型调用失败，尝试简单回答:", modelError);
        return "虽然我能看到视频的部分内容，但我目前无法生成完整回答。我可以尝试回答其他问题。";
      }
    } catch (error: any) {
      console.error("处理问题时出错:", error);
      return `很抱歉，处理您的问题时遇到技术问题: ${error.message || "未知错误"}。请稍后再试。如果问题与转录内容相关，可能是因为系统无法访问相关视频部分的转录。`;
    }
  }
}

class UserSession {
  private retriever: any | null = null;
  private memory: BufferMemory | null = null;
  private transcriptRetriever: any | null = null;
  private transcriptDocs: Document[] | null = null;
  private url: string = "";
  private history: { timestamp: number; humanMessage: string; aiMessage: string; imageData?: Buffer; }[] = [];

  public async setInstance(slides: Buffer | null, transcriptDocs: Document[], url: string ): Promise<void> {
    // 保存原始转录文档
    this.transcriptDocs = transcriptDocs;
    
    if (slides !== null) {
      const docs = await getChunkedDocsFromPDF(slides);
      // 使用本地嵌入服务
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

    try {
      // 使用本地嵌入服务
      const localEmbeddings = new LocalEmbeddings("nomic-embed-text");
      // 创建简单向量存储
      const vectorStoreTranscript = await MemoryVectorStore.fromDocuments(transcriptDocs, localEmbeddings as any);
      
      // 使用基本检索器替代SelfQueryRetriever
      this.transcriptRetriever = vectorStoreTranscript.asRetriever();
      console.log("成功创建基本转录检索器");
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
  
  public getTranscriptDocs(): Document[] | null {
    return this.transcriptDocs;
  }

  public getUrl(): string {
    return this.url;
  }

  public async getHistory(): Promise<{ timestamp: number; humanMessage: string; aiMessage: string; imageData?: Buffer }[]> {
    return this.history;
  }
}

export default SimpleBotMemoryManager; 