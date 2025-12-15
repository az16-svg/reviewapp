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
        try {
          console.log('[Chat API] Starting request:', {
            messageLength: message.length,
            hasPreviousResponseId: !!previousResponseId,
            hasProjectContext: !!projectContext,
            hasSheetContext: !!sheetContext
          });

          // Use previousResponseId for follow-up questions to maintain context
          const runOptions: { stream: true; previousResponseId?: string } = { stream: true };
          if (previousResponseId) {
            runOptions.previousResponseId = previousResponseId;
          }

          console.log('[Chat API] Calling agent.run...');
          const result = await run(agent, message, runOptions);
          console.log('[Chat API] agent.run returned, starting stream iteration');

          let responseId: string | undefined;
          const emittedToolCalls = new Set<string>();
          let eventCount = 0;
          let textDeltaCount = 0;
          let toolCallCount = 0;

          for await (const event of result) {
            eventCount++;

            // Log every event type for debugging
            if (eventCount <= 10 || eventCount % 50 === 0) {
              console.log(`[Chat API] Event #${eventCount}:`, {
                type: event.type,
                hasData: 'data' in event,
                hasItem: 'item' in event,
              });
            }

            // Handle streaming text events
            if (
              event.type === 'raw_model_stream_event' &&
              event.data?.type === 'model' &&
              event.data.event?.type === 'response.output_text.delta'
            ) {
              textDeltaCount++;
              const chunk = event.data.event.delta;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text_delta', content: chunk })}\n\n`
                )
              );
            }

            // Handle tool call events (run_item_stream_event contains tool results)
            if (event.type === 'run_item_stream_event' && event.item) {
              const item = event.item as {
                type?: string;
                rawItem?: {
                  type?: string;
                  call_id?: string;
                  name?: string;
                  arguments?: string;
                };
                output?: string;
              };

              console.log('[Chat API] run_item_stream_event:', {
                itemType: item.type,
                hasRawItem: !!item.rawItem,
                rawItemType: item.rawItem?.type,
                rawItemName: item.rawItem?.name,
                hasOutput: !!item.output,
                outputPreview: item.output?.substring(0, 200),
              });

              // Check if this is a function call output (tool was executed)
              if (item.type === 'function_call_output' && item.rawItem && item.output) {
                const callId = item.rawItem.call_id || crypto.randomUUID();
                const toolName = item.rawItem.name || 'unknown';

                console.log('[Chat API] Tool call detected:', { toolName, callId });

                // Only emit once per tool call
                if (!emittedToolCalls.has(callId)) {
                  emittedToolCalls.add(callId);
                  toolCallCount++;

                  // Parse the tool output to get the arguments
                  try {
                    const toolOutput = JSON.parse(item.output);
                    console.log('[Chat API] Tool output parsed:', toolOutput);

                    if (toolOutput.action === 'pending_edit') {
                      console.log('[Chat API] Emitting pending_edit SSE event');
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: 'tool_call',
                            toolName,
                            toolCallId: callId,
                            arguments: {
                              editType: toolOutput.type, // 'update', 'create', or 'edit'
                              filename: toolOutput.filename,
                              content: toolOutput.content,
                              new_content: toolOutput.new_content,
                              old_text: toolOutput.old_text,
                              new_text: toolOutput.new_text,
                            },
                          })}\n\n`
                        )
                      );
                    } else {
                      console.log('[Chat API] Tool output not a pending_edit:', toolOutput.action);
                    }
                  } catch (parseError) {
                    console.log('[Chat API] Failed to parse tool output:', parseError);
                  }
                }
              }
            }
          }

          console.log('[Chat API] Stream iteration complete:', {
            totalEvents: eventCount,
            textDeltas: textDeltaCount,
            toolCalls: toolCallCount,
          });

          // Get the response ID for follow-up questions
          responseId = result.lastResponseId;

          // Send done event with final output and responseId for follow-ups
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                finalContent: result.finalOutput,
                responseId
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error('Chat API error:', error);
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
