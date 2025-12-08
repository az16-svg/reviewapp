'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageData, SheetsData, SheetBlock } from '@/types/change';
import { styles } from '@/lib/theme';

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384; // w-96 = 24rem = 384px
const STORAGE_KEY = 'legendPanelWidth';

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
  const [panelWidth, setPanelWidth] = useState(() => {
    // Load saved width from localStorage
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(panelWidth));
  }, [panelWidth]);

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

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const parentRect = panelRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      // Calculate new width based on mouse position from the right edge
      const newWidth = parentRect.right - e.clientX;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
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
                    ? styles.tabActiveWithBg
                    : styles.tabInactiveWithHover
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
                    ? styles.tabActiveWithBg
                    : styles.tabInactiveWithHover
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
