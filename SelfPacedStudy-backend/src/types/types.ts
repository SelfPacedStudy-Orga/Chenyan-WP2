// 转录块定义
export interface TranscriptChunk {
  start: number;
  end: number;
  text: string;
}

// 用户状态定义
export interface UserState {
  userId: string;
  currentVideoId?: string;
  lastActivity: Date;
}

// 聊天消息定义
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
} 