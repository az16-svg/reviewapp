'use client';

import { AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function ChatMessage({ message, isStreaming, streamingContent }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const content = isStreaming ? streamingContent || '' : message.content;
  const hasError = message.error != null;

  return (
    <div className={`px-3 ${isUser ? 'flex justify-end py-4' : 'pt-2 pb-4'}`}>
      {hasError ? (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{message.error?.message || 'An error occurred'}</span>
        </div>
      ) : isUser ? (
        <div className="text-sm text-gray-900 whitespace-pre-wrap break-words bg-blue-50 rounded-lg px-3 py-2 max-w-[85%]">
          {content}
        </div>
      ) : !content && isStreaming ? (
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : (
        <div className="text-sm text-gray-900 break-words prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded prose-table:text-xs prose-th:border prose-th:border-gray-300 prose-th:px-2 prose-th:py-1 prose-th:bg-gray-50 prose-td:border prose-td:border-gray-300 prose-td:px-2 prose-td:py-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
