// lib/agent.ts
// OpenAI Agent configuration for construction drawing chat

import type { ProjectContext } from '@/types/context';
import type { SheetsData, SheetBlock } from '@/types/change';

// Helper to convert block_type to a readable title
function formatBlockType(blockType: string): string {
  return blockType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildContextPrompt(
  project: ProjectContext | null,
  sheet: SheetsData | null
): string {
  let context = '<project_context>\n\n';

  // Add project context files
  if (project && project.files.length > 0) {
    context += '### Project Context Files\n\n';
    project.files.forEach(file => {
      context += `**${file.name}:**\n`;
      context += `${file.content}\n\n`;
    });
  }
  context += '</project_context>\n\n';

  // Add sheet context
  if (sheet) {
    context += '<sheet_context>\n\n';
    context += `\n### Current Sheet: ${sheet.sheet_number}\n`;

    // Filter for text blocks only and group by block_type
    const textBlocks = sheet.blocks.filter(
      (block): block is SheetBlock & { text_content: string } =>
        block.storage_type === 'text' && block.text_content != null
    );

    if (textBlocks.length > 0) {
      // Group blocks by type
      const blocksByType = new Map<string, SheetBlock[]>();
      textBlocks.forEach(block => {
        const existing = blocksByType.get(block.block_type) || [];
        existing.push(block);
        blocksByType.set(block.block_type, existing);
      });

      // Output each block type
      blocksByType.forEach((blocks, blockType) => {
        context += `\n**${formatBlockType(blockType)}:**\n`;
        blocks.forEach(block => {
          if (block.description) {
            context += `_${block.description}_\n`;
          }
          context += `${block.text_content}\n\n`;
        });
      });

      // Extract title block info if available
      const titleBlock = textBlocks.find(b => b.block_type === 'title_block' && b.title_block_info);
      if (titleBlock?.title_block_info) {
        const info = titleBlock.title_block_info as Record<string, unknown>;
        context += `\n**Title Block Info:**\n`;
        if (info.sheet_title) context += `- Sheet Title: ${String(info.sheet_title)}\n`;
        if (info.project_name) context += `- Project: ${String(info.project_name)}\n`;
        if (info.scale) context += `- Scale: ${String(info.scale)}\n`;
        if (info.revision) context += `- Revision: ${String(info.revision)}\n`;
        if (info.date) context += `- Date: ${String(info.date)}\n`;
      }
    }
  }
  context += '</sheet_context>\n\n';

  if ((!project || project.files.length === 0) && !sheet) {
    context += 'No context loaded. Please upload context files first.\n';
  }

  return context;
}
