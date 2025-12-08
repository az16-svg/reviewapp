'use client';

import { useState, useEffect } from 'react';
import type { ImageData, SheetsData, SheetBlock } from '@/types/change';

interface LegendPanelProps {
  legendImage?: ImageData;
  sheetsData?: SheetsData;
  onClose: () => void;
}

type TabType = 'legend' | 'contents';

interface TextBlock {
  blockType: string;
  content: string;
  index: number;
}

function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getTextBlocks(blocks: SheetBlock[]): TextBlock[] {
  return blocks
    .map((block, index) => ({
      blockType: block.block_type,
      content: block.text_content || '',
      index,
    }))
    .filter(block => block.content);
}

interface AccordionItemProps {
  label: string;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function AccordionItem({ label, content, isExpanded, onToggle }: AccordionItemProps) {
  return (
    <div className="border border-gray-200 rounded-md mb-2">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 rounded-t-md transition-colors"
      >
        <span className="font-medium text-sm text-gray-900">{label}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 border-t border-gray-200 bg-white">
          <div
            className="text-sm text-gray-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}
    </div>
  );
}

export function LegendPanel({ legendImage, sheetsData, onClose }: LegendPanelProps) {
  const hasLegend = !!legendImage;
  const hasContents = !!sheetsData?.blocks?.some(b => b.storage_type === 'text' && b.text_content);

  // Default to 'legend' if available, otherwise 'contents'
  const defaultTab: TabType = hasLegend ? 'legend' : 'contents';
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const textBlocks = sheetsData ? getTextBlocks(sheetsData.blocks.filter(b => b.storage_type === 'text')) : [];

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l shadow-lg flex flex-col z-20">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b bg-gray-50 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">Sheet Info</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      {(hasLegend || hasContents) && (
        <div className="flex-shrink-0 border-b">
          <div className="flex">
            {hasLegend && (
              <button
                onClick={() => setActiveTab('legend')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'legend'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Legend
              </button>
            )}
            {hasContents && (
              <button
                onClick={() => setActiveTab('contents')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'contents'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Contents
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'legend' && hasLegend && legendImage && (
          <div className="p-4">
            <img
              src={legendImage.data}
              alt="Legend"
              className="w-full h-auto"
              style={{ maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        {activeTab === 'contents' && hasContents && (
          <div className="p-4">
            {textBlocks.map((block) => (
              <AccordionItem
                key={block.index}
                label={toTitleCase(block.blockType)}
                content={block.content}
                isExpanded={expandedItems.has(block.index)}
                onToggle={() => toggleItem(block.index)}
              />
            ))}
          </div>
        )}

        {!hasLegend && !hasContents && (
          <div className="flex items-center justify-center h-full text-gray-500 p-4">
            No legend or sheet data available for this page.
          </div>
        )}
      </div>
    </div>
  );
}

function renderMarkdown(markdown: string): string {
  // Simple markdown renderer for basic formatting
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Tables (basic support)
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map((c: string) => c.trim());
      const isHeader = cells.some((c: string) => c.startsWith(':') || c.endsWith(':') || c === '---' || c.match(/^-+$/));
      if (isHeader) return '';
      const cellsHtml = cells.map((c: string) => `<td class="px-2 py-1 border border-gray-200">${c}</td>`).join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<p')) {
    html = `<p class="mb-2">${html}</p>`;
  }

  return html;
}
