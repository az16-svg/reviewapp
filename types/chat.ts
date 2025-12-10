// types/chat.ts
// Chat and conversation types for LLM chat agent

export interface Conversation {
  /** Unique conversation identifier */
  id: string;

  /** When the conversation started */
  createdAt: Date;

  /** When the last message was sent */
  lastMessageAt: Date;

  /** Reference to project context (if loaded) */
  projectContextId?: string;

  /** Current sheet being viewed */
  currentSheetNumber?: string;

  /** All messages in the conversation */
  messages: Message[];

  /** Conversation state */
  status: 'active' | 'error' | 'closed';
}

export interface Message {
  /** Unique message identifier */
  id: string;

  /** Who sent the message */
  role: 'user' | 'assistant' | 'system';

  /** Message content (text) */
  content: string;

  /** When the message was created */
  timestamp: Date;

  /** Whether the message is still being streamed */
  isStreaming?: boolean;

  /** Error information if message failed */
  error?: MessageError;

  /** References to context used for this response */
  contextRefs?: ContextReference[];
}

export interface MessageError {
  code: string;
  message: string;
}

export interface ContextReference {
  /** Type of context referenced */
  type: 'project' | 'sheet' | 'legend' | 'note';

  /** Identifier within that context */
  reference: string;
}

// API Request/Response Types

export interface ChatRequest {
  /** User's message */
  message: string;

  /** Previous messages for context */
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;

  /** Project-level context */
  projectContext: import('./context').ProjectContext | null;

  /** Current sheet context */
  sheetContext: import('./context').SheetContext | null;
}

// Streaming response event types
export type ChatStreamEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'done'; finalContent: string; responseId?: string }
  | { type: 'error'; error: { code: string; message: string } };
