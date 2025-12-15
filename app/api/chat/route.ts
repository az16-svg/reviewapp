// app/api/chat/route.ts
// Chat API endpoint with streaming SSE response

import { Agent, run, webSearchTool } from '@openai/agents';
import { NextRequest } from 'next/server';
import { buildContextPrompt } from '@/lib/agent';
import { updateContextFileTool, editContextFileTool, createContextFileTool } from '@/lib/tools';
import type { ProjectContext } from '@/types/context';
import type { SheetsData } from '@/types/change';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Use OPENAI_API_KEY_PROJECT if set (from .env.local), otherwise fall back to OPENAI_API_KEY
if (process.env.OPENAI_API_KEY_PROJECT) {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY_PROJECT;
}

interface ChatRequestBody {
  message: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  projectContext: ProjectContext | null;
  sheetContext: SheetsData | null;
  previousResponseId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, projectContext, sheetContext, previousResponseId } = body;

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'Message is required' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build context for the agent
    const contextPrompt = buildContextPrompt(
      projectContext as ProjectContext | null,
      sheetContext as SheetsData | null
    );

    // Create agent with context-specific instructions and tools
    const agent = new Agent({
      name: 'Construction Drawing Assistant',
      model: 'gpt-5-mini',
      tools: [editContextFileTool, updateContextFileTool, createContextFileTool, webSearchTool()],
      instructions: `You are an expert construction manager and superintendent, experienced in reading construction drawings, identifying discrepancies and changes between multiple drawings of different disciplines and versions.

Your knowledge is based on:
1. project_context (location, stage, overlay analysis)
2. sheet_context (legends, general notes, revisions) of the current sheet the user is working on
3. Conversation history

Rules:
- Answer based on the provided context
- Reference specific legends, notes, or changes when relevant
- Be concise but thorough
- Use construction industry terminology appropriately

You have access to these tools:
- edit_context_file: Use this for small, targeted edits to existing files (search and replace). Preferred for most edits.
- update_context_file: Use this only when you need to completely rewrite a file's content
- create_context_file: Use this to create new markdown files when the user asks you to write new documentation or notes
- web_search: Use this to search the web for current information about construction codes, standards, or other relevant topics

When modifying or creating files, explain what changes you're making and why.

Respond in clearly, well organized and formatted markdown for readability.

${contextPrompt}`,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;
        let eventCount = 0;
        let lastEventTime = Date.now();
        const collectedContent: string[] = [];

        // Helper to safely enqueue data
        const safeEnqueue = (data: string) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(data));
              lastEventTime = Date.now();
            } catch (e) {
              console.error('[Chat API] Controller closed after', eventCount, 'events');
              console.error('[Chat API] Time since last event:', Date.now() - lastEventTime, 'ms');
              console.error('[Chat API] Collected content so far:', collectedContent.join('').substring(0, 500));
              isControllerClosed = true;
            }
          }
        };

        try {
          // Use previousResponseId for follow-up questions to maintain context
          const runOptions: { stream: true; previousResponseId?: string } = { stream: true };
          if (previousResponseId) {
            runOptions.previousResponseId = previousResponseId;
          }

          const result = await run(agent, message, runOptions);

          let responseId: string | undefined;
          const emittedToolCalls = new Set<string>();
          const emittedToolStarts = new Set<string>();

          for await (const event of result) {
            eventCount++;

            // Log raw_model_stream_event details
            if (event.type === 'raw_model_stream_event') {
              const eventType = event.data?.event?.type;
              // Log first 30 events, then every 200th
              if (eventCount <= 30 || eventCount % 200 === 0) {
                const delta = event.data?.event?.delta;
                const rawEventStr = event.data?.event ? JSON.stringify(event.data.event) : JSON.stringify(event.data);
                console.log(`[Chat API] Event #${eventCount}: raw_model_stream_event`, {
                  dataType: event.data?.type,
                  eventType: eventType || 'none',
                  // For text deltas, show the content
                  ...(eventType === 'response.output_text.delta' && delta && { delta: delta.substring(0, 50) }),
                  // For other events, show what we have
                  ...(eventType !== 'response.output_text.delta' && { rawEvent: rawEventStr?.substring(0, 200) }),
                });
              }
            }

            // Log run_item_stream_event
            if (event.type === 'run_item_stream_event') {
              const itemType = (event.item as { type?: string })?.type;
              console.log(`[Chat API] Event #${eventCount}: run_item_stream_event`, itemType);
            }

            // Handle streaming text events
            if (
              event.type === 'raw_model_stream_event' &&
              event.data?.type === 'model' &&
              event.data.event?.type === 'response.output_text.delta'
            ) {
              const chunk = event.data.event.delta;
              collectedContent.push(chunk);
              safeEnqueue(`data: ${JSON.stringify({ type: 'text_delta', content: chunk })}\n\n`);
            }

            // Handle run_item_stream_event for reasoning, tool calls, and tool outputs
            if (event.type === 'run_item_stream_event' && event.item) {
              const item = event.item as {
                type?: string;
                rawItem?: {
                  type?: string;
                  call_id?: string;
                  name?: string;
                  arguments?: string;
                  summary?: Array<{ type: string; text: string }>;
                };
                output?: string;
              };

              // Stream reasoning/thinking content to frontend
              if (item.type === 'reasoning_item') {
                console.log('[Chat API] reasoning_item:', JSON.stringify(item.rawItem).substring(0, 300));
                if (item.rawItem?.summary) {
                  const thinkingText = item.rawItem.summary
                    .filter((s) => s.type === 'summary_text')
                    .map((s) => s.text)
                    .join('');
                  if (thinkingText) {
                    console.log('[Chat API] Emitting thinking:', thinkingText.substring(0, 100));
                    safeEnqueue(`data: ${JSON.stringify({ type: 'thinking', content: thinkingText })}\n\n`);
                  }
                }
              }

              // Stream tool call start (when tool is being invoked)
              if (item.type === 'tool_call_item' && item.rawItem?.name && item.rawItem?.call_id) {
                const callId = item.rawItem.call_id;
                if (!emittedToolStarts.has(callId)) {
                  emittedToolStarts.add(callId);
                  safeEnqueue(`data: ${JSON.stringify({
                    type: 'tool_start',
                    toolName: item.rawItem.name,
                    toolCallId: callId,
                  })}\n\n`);
                }
              }

              // Handle tool call output (tool was executed)
              const isToolOutput = (
                (item.type === 'function_call_output' || item.type === 'tool_call_output_item') &&
                item.rawItem &&
                item.output
              );

              if (isToolOutput) {
                const callId = item.rawItem!.call_id || crypto.randomUUID();
                const toolName = item.rawItem!.name || 'unknown';

                // Only emit once per tool call
                if (!emittedToolCalls.has(callId)) {
                  emittedToolCalls.add(callId);

                  // Parse the tool output to get the arguments
                  try {
                    const toolOutput = JSON.parse(item.output!);

                    if (toolOutput.action === 'pending_edit') {
                      safeEnqueue(`data: ${JSON.stringify({
                        type: 'tool_call',
                        toolName,
                        toolCallId: callId,
                        arguments: {
                          editType: toolOutput.type,
                          filename: toolOutput.filename,
                          content: toolOutput.content,
                          new_content: toolOutput.new_content,
                          old_text: toolOutput.old_text,
                          new_text: toolOutput.new_text,
                        },
                      })}\n\n`);
                    }
                  } catch {
                    // Tool output wasn't JSON, ignore
                  }
                }
              }
            }
          }

          // Get the response ID for follow-up questions
          responseId = result.lastResponseId;

          // Send done event with final output and responseId for follow-ups
          safeEnqueue(`data: ${JSON.stringify({
            type: 'done',
            finalContent: result.finalOutput,
            responseId
          })}\n\n`);

          if (!isControllerClosed) {
            controller.close();
          }
        } catch (error) {
          console.error('Chat API error:', error);
          if (!isControllerClosed) {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: {
                      code: 'AGENT_ERROR',
                      message: error instanceof Error ? error.message : 'Unknown error occurred',
                    },
                  })}\n\n`
                )
              );
              controller.close();
            } catch {
              // Controller already closed, ignore
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Chat API request error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process request',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
