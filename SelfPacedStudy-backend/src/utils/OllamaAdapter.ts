import { BaseChatModel } from "langchain/chat_models/base";
import { BaseLanguageModelCallOptions } from "langchain/dist/base_language";
import { BaseMessage, AIMessage, ChatMessage } from "langchain/schema";
import { CallbackManagerForLLMRun } from "langchain/callbacks";

/**
 * 基于LangChain标准接口的Ollama适配器
 * 实现了BaseChatModel要求的接口
 */
export class OllamaAdapter extends BaseChatModel {
  modelName: string;
  baseUrl: string;

  constructor(
    fields?: {
      modelName?: string;
      baseUrl?: string;
    } & BaseLanguageModelCallOptions
  ) {
    super(fields ?? {});
    this.modelName = fields?.modelName ?? "llama2";
    this.baseUrl = fields?.baseUrl ?? "http://127.0.0.1:11434";
  }

  _llmType(): string {
    return "ollama";
  }

  /** @ignore */
  _combineLLMOutput() {
    return {};
  }

  /**
   * 调用Ollama API来生成回复
   */
  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<{
    generations: Array<{
      text: string;
      message: AIMessage;
    }>;
    llmOutput?: Record<string, any>;
  }> {
    // 将消息格式化为单个提示
    const prompt = this._convertMessagesToPrompt(messages);

    try {
      // 调用Ollama API
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }

      // 处理流式响应
      const text = await response.text();
      const lines = text.trim().split('\n');

      // 从流式响应中提取完整回复
      let fullResponse = '';
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            fullResponse += data.response;
          }
        } catch (error) {
          console.error('解析响应行失败:', line, error);
        }
      }

      // 将响应转换为AIMessage
      const message = new AIMessage({
        content: fullResponse,
      });

      return {
        generations: [
          {
            text: fullResponse,
            message,
          },
        ],
      };
    } catch (error) {
      console.error("Ollama生成出错:", error);
      throw error;
    }
  }

  /**
   * 将消息数组转换为提示字符串
   */
  _convertMessagesToPrompt(messages: BaseMessage[]): string {
    const messageString = messages
      .map((message) => {
        if (message._getType() === "human") {
          return `Human: ${message.content}`;
        } else if (message._getType() === "ai") {
          return `Assistant: ${message.content}`;
        } else if (message._getType() === "system") {
          return `System: ${message.content}`;
        } else {
          return `${message.content}`;
        }
      })
      .join("\n");
    return messageString;
  }
} 