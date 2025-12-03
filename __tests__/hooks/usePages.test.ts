import { renderHook, act } from '@testing-library/react';
import { usePages } from '@/hooks/usePages';
import type { Page, Change } from '@/types/change';

const createMockPage = (id: string, name: string = `Page ${id}`): Page => ({
  id,
  name,
  imageData: 'data:image/png;base64,abc123',
  imageWidth: 800,
  imageHeight: 600,
  changes: [],
  createdAt: new Date(),
});

const createMockChange = (id: string): Change => ({
  id,
  action: 'Move',
  elements: ['Wall'],
  direction: 'left',
  value: null,
  location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
});

describe('usePages', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePages());
    expect(result.current.pages).toEqual([]);
    expect(result.current.currentPage).toBeNull();
    expect(result.current.currentPageIndex).toBe(-1);
  });

  it('should add a page and auto-select it', () => {
    const { result } = renderHook(() => usePages());
    const page = createMockPage('1');

    act(() => {
      result.current.addPage(page);
    });

    expect(result.current.pages).toHaveLength(1);
    expect(result.current.currentPage).toEqual(page);
    expect(result.current.currentPageIndex).toBe(0);
  });

  it('should add multiple pages and select the latest', () => {
    const { result } = renderHook(() => usePages());

    act(() => {
      result.current.addPage(createMockPage('1'));
      result.current.addPage(createMockPage('2'));
    });

    expect(result.current.pages).toHaveLength(2);
    expect(result.current.currentPageIndex).toBe(1);
    expect(result.current.currentPage?.id).toBe('2');
  });

  it('should switch between pages', () => {
    const { result } = renderHook(() => usePages());

    act(() => {
      result.current.addPage(createMockPage('1'));
      result.current.addPage(createMockPage('2'));
    });

    act(() => {
      result.current.setCurrentPage(0);
    });

    expect(result.current.currentPageIndex).toBe(0);
    expect(result.current.currentPage?.id).toBe('1');
  });

  it('should delete a page and adjust index', () => {
    const { result } = renderHook(() => usePages());

    act(() => {
      result.current.addPage(createMockPage('1'));
      result.current.addPage(createMockPage('2'));
      result.current.addPage(createMockPage('3'));
    });

    // Currently on page 2 (index 2)
    act(() => {
      result.current.deletePage('2');
    });

    expect(result.current.pages).toHaveLength(2);
    expect(result.current.pages.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('should set currentPageIndex to -1 when last page is deleted', () => {
    const { result } = renderHook(() => usePages());

    act(() => {
      result.current.addPage(createMockPage('1'));
    });

    act(() => {
      result.current.deletePage('1');
    });

    expect(result.current.pages).toHaveLength(0);
    expect(result.current.currentPageIndex).toBe(-1);
    expect(result.current.currentPage).toBeNull();
  });

  it('should update page changes', () => {
    const { result } = renderHook(() => usePages());
    const page = createMockPage('1');

    act(() => {
      result.current.addPage(page);
    });

    const newChanges = [createMockChange('c1'), createMockChange('c2')];

    act(() => {
      result.current.updatePageChanges('1', newChanges);
    });

    expect(result.current.pages[0].changes).toEqual(newChanges);
    expect(result.current.currentPage?.changes).toEqual(newChanges);
  });

  it('should not affect other pages when updating one', () => {
    const { result } = renderHook(() => usePages());

    act(() => {
      result.current.addPage(createMockPage('1'));
      result.current.addPage(createMockPage('2'));
    });

    const changes = [createMockChange('c1')];

    act(() => {
      result.current.updatePageChanges('1', changes);
    });

    expect(result.current.pages[0].changes).toEqual(changes);
    expect(result.current.pages[1].changes).toEqual([]);
  });
});
