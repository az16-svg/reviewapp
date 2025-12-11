'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, Trash2, AlertTriangle, MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import type { ProjectContext } from '@/types/context';
import type { SheetsData } from '@/types/change';

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;
const STORAGE_KEY = 'chatPanelWidth';

interface ChatPanelProps {
  projectContext: ProjectContext | null;
  sheetContext: SheetsData | null;
  onClose: () => void;
}

export function ChatPanel({ projectContext, sheetContext, onClose }: ChatPanelProps) {
  const {
    conversation,
    isLoading,
    streamingContent,
    error,
    sendMessage,
    clearConversation,
    retryLastMessage,
  } = useChat({ projectContext, sheetContext });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed;
        }
      }
    }
    return DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages, streamingContent]);

  // Save panel width to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(panelWidth));
    }
  }, [panelWidth]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const parentRect = panelRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      // Calculate new width based on mouse position from the right edge
      const newWidth = parentRect.right - e.clientX;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const hasNoContext = !projectContext;
  const messages = conversation?.messages || [];

  return (
    <div
      ref={panelRef}
      className="absolute top-0 right-0 bottom-0 bg-white border-l shadow-lg flex flex-col z-20"
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-slate-300 transition-colors ${
          isResizing ? 'bg-slate-400' : 'bg-transparent'
        }`}
        title="Drag to resize"
      />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-600" />
          <h2 className="font-medium text-gray-900">Chat</h2>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            title="Close chat panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* No context warning */}
      {hasNoContext && (
        <div className="flex-shrink-0 px-4 py-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              Upload a project context file to enable chat
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">
              {hasNoContext
                ? 'Upload a project context to start chatting'
                : 'Ask questions about the construction drawings'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((message, index) => {
              const isLastAssistant =
                message.role === 'assistant' && index === messages.length - 1;
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLastAssistant && isLoading}
                  streamingContent={isLastAssistant ? streamingContent : undefined}
                />
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error with retry */}
      {error && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={retryLastMessage}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 rounded"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={hasNoContext || isLoading}
        placeholder={
          hasNoContext
            ? 'Upload project context first...'
            : isLoading
            ? 'Waiting for response...'
            : 'Ask about the drawings...'
        }
      />
    </div>
  );
}
