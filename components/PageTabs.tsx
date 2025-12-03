'use client';

import type { Page } from '@/types/change';

interface PageTabsProps {
  pages: Page[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onDeletePage: (pageId: string) => void;
  onAddPage: () => void;
}

export function PageTabs({
  pages,
  currentPageIndex,
  onSelectPage,
  onDeletePage,
  onAddPage,
}: PageTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {pages.length} {pages.length === 1 ? 'page' : 'pages'}
      </span>

      <div className="flex flex-wrap gap-2">
        {pages.map((page, index) => {
          const isActive = index === currentPageIndex;

          return (
            <div key={page.id} className="relative group">
              <button
                onClick={() => onSelectPage(index)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
              >
                {page.name}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePage(page.id);
                }}
                className={`
                  absolute -top-1 -right-1 w-5 h-5 rounded-full
                  flex items-center justify-center
                  text-xs font-bold
                  opacity-0 group-hover:opacity-100 transition-opacity
                  ${isActive
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-400 text-white hover:bg-red-500'}
                `}
                aria-label={`Delete ${page.name}`}
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          onClick={onAddPage}
          className="w-9 h-9 rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center justify-center text-xl font-medium transition-colors"
          title="Add page"
        >
          +
        </button>
      </div>
    </div>
  );
}
