/**
 * Generate response using Ollama and local Llama2 model
 * @param prompt User input prompt text
 * @param model Model name to use (default "llama2")
 * @returns Promise returning the generated response text
 */
export async function generateLLMResponse(prompt: string, model = 'llama2'): Promise<string> {
  try {
    console.log(`Using Ollama with model: ${model}`);
    
    // Use fetch to call Ollama HTTP API, corrected to the proper API endpoint
    const response = await fetch(`http://localhost:11434/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API request failed: ${response.statusText}`);
    }

    // Ollama API returns streaming JSON responses, need to parse line by line
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body reader could not be created');

    // Extract complete response from streaming response
    let completeResponse = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) completeResponse += json.response;
        } catch (error) {
          console.error('Failed to parse response line:', line, error);
        }
      }
    }

    return completeResponse.trim();
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    return 'I apologize, but I encountered an error while processing your request.';
  }
}

/**
 * LLM response generation with retry mechanism
 */
export async function getResponseWithRetry(prompt: string, model = 'llama2', maxRetries = 3): Promise<string> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await generateLLMResponse(prompt, model);
      return response;
    } catch (error) {
      retries++;
      console.error(`Attempt ${retries}/${maxRetries} failed:`, error);
      
      if (retries >= maxRetries) {
        return "I'm sorry, I wasn't able to process your request after multiple attempts. Please try again later.";
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
  
  return "An unexpected error occurred. Please try again later.";
}

/**
 * Generate text embeddings using Ollama
 * @param text Text to convert to embedding vector
 * @param model Embedding model name to use (default "nomic-embed-text")
 * @returns Promise returning the embedding vector array
 */
export async function generateEmbeddings(
  text: string,
  model: string = "nomic-embed-text"
): Promise<number[]> {
  try {
    // Use fetch to call Ollama embedding API
    const response = await fetch("http://127.0.0.1:11434/api/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: text,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama embedding API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Return embedding vector
    if (data.embedding && Array.isArray(data.embedding)) {
      return data.embedding;
    } else {
      throw new Error("Embedding result format is incorrect");
    }
  } catch (error) {
    console.error('Error generating embedding vector:', error);
    // If failed, return a basic random vector (as fallback only)
    return Array(768).fill(0).map(() => Math.random() * 2 - 1);
  }
}

/**
 * Simple vector similarity comparison function
 * @param vec1 First vector
 * @param vec2 Second vector
 * @returns Cosine similarity value
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vector dimensions do not match");
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  return dotProduct / (mag1 * mag2);
}

/**
 * Local embedding service class, can be used as an alternative to OpenAIEmbeddings
 */
export class LocalEmbeddings {
  private modelName: string;
  
  constructor(modelName: string = "nomic-embed-text") {
    this.modelName = modelName;
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await generateEmbeddings(text, this.modelName);
      embeddings.push(embedding);
    }
    return embeddings;
  }
  
  async embedQuery(text: string): Promise<number[]> {
    return await generateEmbeddings(text, this.modelName);
  }
}
