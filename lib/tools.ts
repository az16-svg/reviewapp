// lib/tools.ts
// Tool definitions for OpenAI Agents SDK

import { tool, webSearchTool } from '@openai/agents';
import { z } from 'zod';

export const updateContextFileTool = tool({
  name: 'update_context_file',
  description:
    'Replace the entire content of an existing project context file. Only use this for complete rewrites. For small changes, prefer edit_context_file instead. The user will see a diff preview and must approve.',
  parameters: z.object({
    filename: z.string().describe('The exact name of the file to update (must match an existing file)'),
    new_content: z.string().describe('The complete new content for the file'),
  }),
  async execute({ filename, new_content }) {
    // Return structured data - the API route will emit this as a tool_call event
    return JSON.stringify({
      action: 'pending_edit',
      type: 'update',
      filename,
      new_content,
    });
  },
});

export const editContextFileTool = tool({
  name: 'edit_context_file',
  description:
    'Make targeted edits to an existing file using search and replace. More efficient than update_context_file for small changes. Provide the exact text to find and the text to replace it with. The user will see a diff preview and must approve.',
  parameters: z.object({
    filename: z.string().describe('The exact name of the file to edit'),
    old_text: z.string().describe('The exact text to find in the file (must match exactly, including whitespace)'),
    new_text: z.string().describe('The text to replace it with'),
  }),
  async execute({ filename, old_text, new_text }) {
    return JSON.stringify({
      action: 'pending_edit',
      type: 'edit',
      filename,
      old_text,
      new_text,
    });
  },
});

export const createContextFileTool = tool({
  name: 'create_context_file',
  description:
    'Create a new markdown project context file. The user will preview the content and must approve before the file is added. Use this when the user asks you to create a new document, note, or file.',
  parameters: z.object({
    filename: z.string().describe('The name for the new file (should end in .md for markdown files)'),
    content: z.string().describe('The content for the new file'),
  }),
  async execute({ filename, content }) {
    return JSON.stringify({
      action: 'pending_edit',
      type: 'create',
      filename,
      content,
    });
  },
});

// Re-export webSearchTool for convenience
export { webSearchTool };
