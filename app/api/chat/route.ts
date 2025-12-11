// app/api/chat/route.ts
// Chat API endpoint with streaming SSE response

import { Agent, run } from '@openai/agents';
import { NextRequest } from 'next/server';
import { buildContextPrompt } from '@/lib/agent';
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

    // Create agent with context-specific instructions
    const agent = new Agent({
      name: 'Construction Drawing Assistant',
      model: 'gpt-5.1',
      instructions: `You are an expert assistant for analyzing construction drawings and building plans.

Your knowledge comes from:
1. Project context provided (location, stage, overlay analysis)
2. Sheet context (legends, general notes, revisions)
3. Conversation history

Rules:
- Only answer based on the provided context
- If information is not in the context, say "I don't have that information in the current context"
- Reference specific legends, notes, or changes when relevant
- Be concise but thorough
- Use construction industry terminology appropriately

Respond in clearly, well organized and formatted markdown for readability.

${contextPrompt}`,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use previousResponseId for follow-up questions to maintain context
          const runOptions: { stream: true; previousResponseId?: string } = { stream: true };
          if (previousResponseId) {
            runOptions.previousResponseId = previousResponseId;
          }

          const result = await run(agent, message, runOptions);

          let responseId: string | undefined;

          for await (const event of result) {
            // Handle streaming text events
            if (
              event.type === 'raw_model_stream_event' &&
              event.data?.type === 'model' &&
              event.data.event?.type === 'response.output_text.delta'
            ) {
              const chunk = event.data.event.delta;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text_delta', content: chunk })}\n\n`
                )
              );
            }
          }

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
