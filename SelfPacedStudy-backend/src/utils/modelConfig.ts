import { generateLLMResponse } from "../services/llmService.js";

// 创建一个适配Ollama的模型接口，兼容原有的invoke方法
class OllamaAdapter {
  private modelName: string;
  private supportsImages: boolean = false; // 标记模型是否支持图像处理
  
  constructor(modelName: string = "llama2") {
    this.modelName = modelName;
  }
  
  // 实现兼容invoke方法的接口
  async invoke(messages: any[]): Promise<{ content: string }> {
    try {
      // 提取消息中的文本内容
      let prompt = "";
      let hasImage = false;
      let hasExtractedText = false;
      
      for (const message of messages) {
        if (Array.isArray(message.content)) {
          // 处理包含文本和图像的消息
          for (const content of message.content) {
            if (content.type === "text") {
              // 检查是否包含OCR提取的文本
              if (content.text.includes("[Important: I've extracted the following text from the image you shared.")) {
                hasExtractedText = true;
              }
              prompt += content.text + "\n";
            } else if (content.type === "image_url") {
              // 记录图像存在但无法处理
              hasImage = true;
              console.log("收到图像内容，但当前模型不支持图像处理");
            }
          }
        } else {
          // 处理纯文本消息
          prompt += message.content + "\n";
        }
      }
      
      // 如果有图像但模型不支持，且没有OCR提取文本，添加说明
      if (hasImage && !this.supportsImages && !hasExtractedText) {
        prompt += "\n[注意: 用户提供了图像，但我无法查看图像内容。我将尽力根据文本描述回答问题。]\n";
      }
      
      // 调用Ollama API
      console.log("发送到模型的提示内容:", prompt.substring(0, 200) + "...");
      const responseText = await generateLLMResponse(prompt, this.modelName);
      
      // 返回与OpenAI格式兼容的结果
      return { content: responseText };
    } catch (error) {
      console.error("Ollama模型调用失败:", error);
      throw error;
    }
  }
}

// 导出离线LLM模型实例
export const model = new OllamaAdapter("llama2");
  
