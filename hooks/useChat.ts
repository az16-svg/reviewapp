'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, Conversation, ChatStreamEvent, ChatRequest } from '@/types/chat';
import type { ProjectContext } from '@/types/context';
import type { SheetsData } from '@/types/change';

interface ToolCallEvent {
  type: 'tool_call';
  toolName: string;
  toolCallId: string;
  arguments: Record<string, string>;
}

interface UseChatOptions {
  projectContext: ProjectContext | null;
  sheetContext: SheetsData | null;
  onToolCall?: (event: ToolCallEvent) => void;
}

interface AgentStatus {
  thinking: string | null;
  activeTool: string | null;
  toolProgress: string | null; // Accumulated tool argument content
}

interface UseChatReturn {
  conversation: Conversation | null;
  isLoading: boolean;
  streamingContent: string;
  agentStatus: AgentStatus;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
  retryLastMessage: () => Promise<void>;
}

export function useChat({ projectContext, sheetContext, onToolCall }: UseChatOptions): UseChatReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ thinking: null, activeTool: null, toolProgress: null });
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousResponseIdRef = useRef<string | null>(null);

  const initConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messages: [],
      status: 'active',
    };
    setConversation(newConversation);
    return newConversation;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      lastMessageRef.current = content;
      setError(null);
      setIsLoading(true);
      setStreamingContent('');
      setAgentStatus({ thinking: null, activeTool: null, toolProgress: null });

      // Initialize conversation if needed
      let currentConversation = conversation;
      if (!currentConversation) {
        currentConversation = initConversation();
      }

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setConversation((prev) => {
        const conv = prev || currentConversation!;
        return {
          ...conv,
          lastMessageAt: new Date(),
          messages: [...conv.messages, userMessage],
        };
      });

      // Create assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, assistantMessage],
        };
      });

      try {
        // Abort any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Set up timeout - reset on each event received
        const resetTimeout = () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          // 2 minute timeout between events (tool calls can take a while)
          timeoutRef.current = setTimeout(() => {
            console.warn('[useChat] Request timed out - no events received for 2 minutes');
            abortControllerRef.current?.abort();
          }, 120000);
        };
        resetTimeout();

        // Build request with previousResponseId for follow-ups
        const request = {
          message: content.trim(),
          conversationHistory: [],
          projectContext,
          sheetContext,
          previousResponseId: previousResponseIdRef.current,
        };

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to send message');
        }

        // Process SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream');
        }

        const decoder = new TextDecoder();
        let fullContent = '';
        let lineBuffer = ''; // Buffer for incomplete lines
        let completedToolName: string | null = null;
        let completedToolProgress: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Reset timeout on each chunk received
          resetTimeout();

          const chunk = decoder.decode(value, { stream: true });
          // Prepend any incomplete line from previous chunk
          const combined = lineBuffer + chunk;
          const lines = combined.split('\n');

          // Last element might be incomplete, save it for next iteration
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (!data.trim()) continue;

              try {
                const event: ChatStreamEvent = JSON.parse(data);

                if (event.type === 'text_delta') {
                  fullContent += event.content;
                  setStreamingContent(fullContent);
                  // Clear thinking when text starts streaming
                  setAgentStatus((prev) => ({ ...prev, thinking: null }));
                } else if (event.type === 'thinking') {
                  setAgentStatus((prev) => ({ ...prev, thinking: event.content }));
                } else if (event.type === 'tool_start') {
                  setAgentStatus((prev) => ({ ...prev, activeTool: event.toolName }));
                } else if (event.type === 'tool_progress') {
                  // Accumulate tool argument deltas - set activeTool to generic if not already set
                  setAgentStatus((prev) => ({
                    ...prev,
                    activeTool: prev.activeTool || 'preparing tool call',
                    toolProgress: (prev.toolProgress || '') + event.delta,
                  }));
                } else if (event.type === 'tool_call') {
                  // Notify parent of tool call for artifact panel
                  onToolCall?.(event as ToolCallEvent);
                  // Save tool info for persistence, then mark as completed
                  setAgentStatus((prev) => {
                    completedToolName = prev.activeTool || event.toolName;
                    completedToolProgress = prev.toolProgress;
                    return { ...prev, activeTool: 'completed' };
                  });
                } else if (event.type === 'done') {
                  fullContent = event.finalContent;
                  // Store responseId for follow-up questions
                  if ('responseId' in event && event.responseId) {
                    previousResponseIdRef.current = event.responseId as string;
                  }
                  setAgentStatus({ thinking: null, activeTool: null, toolProgress: null });
                } else if (event.type === 'error') {
                  throw new Error(event.error.message);
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                if (!(parseError instanceof SyntaxError)) {
                  throw parseError;
                }
              }
            }
          }
        }

        // Update assistant message with final content and tool progress
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: fullContent,
                    isStreaming: false,
                    toolProgress: completedToolName && completedToolProgress
                      ? {
                          toolName: completedToolName,
                          tokenCount: Math.ceil(completedToolProgress.length / 4),
                        }
                      : undefined,
                  }
                : m
            ),
          };
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, ignore
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);

        // Update assistant message with error
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'error',
            messages: prev.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: '',
                    isStreaming: false,
                    error: { code: 'SEND_ERROR', message: errorMessage },
                  }
                : m
            ),
          };
        });
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsLoading(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [conversation, initConversation, isLoading, projectContext, sheetContext, onToolCall]
  );

  const clearConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setConversation(null);
    setStreamingContent('');
    setError(null);
    setIsLoading(false);
    previousResponseIdRef.current = null;
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current || isLoading) return;

    // Remove the last failed message pair
    setConversation((prev) => {
      if (!prev || prev.messages.length < 2) return prev;
      return {
        ...prev,
        status: 'active',
        messages: prev.messages.slice(0, -2),
      };
    });

    setError(null);
    await sendMessage(lastMessageRef.current);
  }, [isLoading, sendMessage]);

  return {
    conversation,
    isLoading,
    streamingContent,
    agentStatus,
    error,
    sendMessage,
    clearConversation,
    retryLastMessage,
  };
}
