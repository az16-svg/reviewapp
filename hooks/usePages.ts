'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Page, Change } from '@/types/change';

export interface UsePagesReturn {
  pages: Page[];
  currentPage: Page | null;
  currentPageIndex: number;
  addPage: (page: Page) => void;
  deletePage: (pageId: string) => void;
  setCurrentPage: (index: number) => void;
  updatePageChanges: (pageId: string, changes: Change[]) => void;
}

export function usePages(): UsePagesReturn {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(-1);

  const currentPage = useMemo(() => {
    if (currentPageIndex >= 0 && currentPageIndex < pages.length) {
      return pages[currentPageIndex];
    }
    return null;
  }, [pages, currentPageIndex]);

  const addPage = useCallback((page: Page) => {
    setPages((prev) => {
      const newPages = [...prev, page];
      // Auto-select the new page
      setCurrentPageIndex(newPages.length - 1);
      return newPages;
    });
  }, []);

  const deletePage = useCallback((pageId: string) => {
    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === pageId);
      if (index === -1) return prev;

      const newPages = prev.filter((p) => p.id !== pageId);

      // Adjust current page index
      if (newPages.length === 0) {
        setCurrentPageIndex(-1);
      } else if (currentPageIndex >= newPages.length) {
        setCurrentPageIndex(newPages.length - 1);
      } else if (index < currentPageIndex) {
        setCurrentPageIndex((prev) => prev - 1);
      }

      return newPages;
    });
  }, [currentPageIndex]);

  const setCurrentPage = useCallback((index: number) => {
    setCurrentPageIndex(index);
  }, []);

  const updatePageChanges = useCallback((pageId: string, changes: Change[]) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, changes } : page
      )
    );
  }, []);

  return {
    pages,
    currentPage,
    currentPageIndex,
    addPage,
    deletePage,
    setCurrentPage,
    updatePageChanges,
  };
}
