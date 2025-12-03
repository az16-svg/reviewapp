'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadModal } from '@/components/UploadModal';
import { ImageViewer } from '@/components/ImageViewer';
import { ChangeList } from '@/components/ChangeList';
import { ChangeEditor } from '@/components/ChangeEditor';
import { ExportButton } from '@/components/ExportButton';
import { PageTabs } from '@/components/PageTabs';
import { usePages } from '@/hooks/usePages';
import type { AnalysisResult, Change, BoundingBox, DrawingState } from '@/types/change';
import { rawChangeToChange, generateId, changeToRawChange } from '@/types/change';

export default function Home() {
  const { pages, currentPage, currentPageIndex, addPage, deletePage, setCurrentPage, updatePageChanges } = usePages();
  const [hoveredChangeId, setHoveredChangeId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [pendingNewChange, setPendingNewChange] = useState<Change | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0.2);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showChangeTooltips, setShowChangeTooltips] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<{ pageId: string; changes: Change[] }>>([]);
  const imageViewerContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when editing or adding new change
      if (editingChangeId || pendingNewChange) return;

      // Escape to cancel drawing mode
      if (e.key === 'Escape') {
        if (isDrawingMode) {
          setIsDrawingMode(false);
          setDrawingState(null);
        }
      }

      // 'A' key to toggle add change mode (only when a page is loaded)
      if ((e.key === 'a' || e.key === 'A') && currentPage) {
        e.preventDefault();
        setIsDrawingMode((prev) => !prev);
      }

      // 'E' key to edit hovered change
      if ((e.key === 'e' || e.key === 'E') && hoveredChangeId) {
        e.preventDefault();
        setEditingChangeId(hoveredChangeId);
      }

      // 'C' key to center on hovered change
      if ((e.key === 'c' || e.key === 'C') && hoveredChangeId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleCenter(hoveredChangeId);
      }

      // 'D' key to delete hovered change
      if ((e.key === 'd' || e.key === 'D') && hoveredChangeId && currentPage && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Save to undo stack before deleting
        setUndoStack((prev) => [...prev.slice(-19), { pageId: currentPage.id, changes: [...currentPage.changes] }]);
        const updatedChanges = currentPage.changes.filter((c) => c.id !== hoveredChangeId);
        updatePageChanges(currentPage.id, updatedChanges);
        setHoveredChangeId(null);
      }

      // 'R' key to reset zoom to 20% and center the whole image
      if ((e.key === 'r' || e.key === 'R') && currentPage && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setZoomLevel(0.2);
        // Scroll to top-left to show the whole image
        setTimeout(() => {
          if (imageViewerContainerRef.current) {
            imageViewerContainerRef.current.scrollTo({
              left: 0,
              top: 0,
              behavior: 'smooth',
            });
          }
        }, 10);
      }

      // Ctrl/Cmd + Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }

      // Zoom shortcuts (Ctrl/Cmd + Plus/Minus)
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoomLevel((prev) => Math.min(prev + 0.1, 4));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoomLevel((prev) => Math.max(prev - 0.1, 0.2));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoomLevel(1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode, editingChangeId, pendingNewChange, currentPage, hoveredChangeId, updatePageChanges]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    updatePageChanges(lastState.pageId, lastState.changes);
  }, [undoStack, updatePageChanges]);

  const handleUpload = useCallback(
    (
      jsonData: AnalysisResult,
      imageData: string,
      imageName: string,
      imageWidth: number,
      imageHeight: number
    ) => {
      const changes = jsonData.changes.map(rawChangeToChange);
      addPage({
        id: generateId(),
        name: imageName,
        imageData,
        imageWidth,
        imageHeight,
        changes,
        createdAt: new Date(),
      });
    },
    [addPage]
  );

  const handleHover = useCallback((changeId: string | null) => {
    setHoveredChangeId(changeId);
  }, []);

  const handleApprove = useCallback(
    (changeId: string) => {
      if (!currentPage) return;

      const updatedChanges = currentPage.changes.map((c) =>
        c.id === changeId ? { ...c, approved: !c.approved } : c
      );
      updatePageChanges(currentPage.id, updatedChanges);
    },
    [currentPage, updatePageChanges]
  );

  const handleApproveAll = useCallback(() => {
    if (!currentPage) return;

    const anyApproved = currentPage.changes.some((c) => c.approved ?? false);
    const updatedChanges = currentPage.changes.map((c) => ({
      ...c,
      approved: !anyApproved,
    }));
    updatePageChanges(currentPage.id, updatedChanges);
  }, [currentPage, updatePageChanges]);

  const handleEdit = useCallback((changeId: string) => {
    setEditingChangeId(changeId);
  }, []);

  const handleSaveEdit = useCallback(
    (updates: Partial<Omit<Change, 'id' | 'location'>>) => {
      if (!currentPage || !editingChangeId) return;

      const updatedChanges = currentPage.changes.map((c) =>
        c.id === editingChangeId ? { ...c, ...updates } : c
      );
      updatePageChanges(currentPage.id, updatedChanges);
      setEditingChangeId(null);
    },
    [currentPage, editingChangeId, updatePageChanges]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingChangeId(null);
  }, []);

  const handleDelete = useCallback(
    (changeId: string) => {
      if (!currentPage) return;

      const updatedChanges = currentPage.changes.filter((c) => c.id !== changeId);
      updatePageChanges(currentPage.id, updatedChanges);
    },
    [currentPage, updatePageChanges]
  );

  const handleCenter = useCallback(
    (changeId: string) => {
      if (!currentPage || !imageViewerContainerRef.current) return;

      const change = currentPage.changes.find((c) => c.id === changeId);
      if (!change) return;

      const container = imageViewerContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate bounding box dimensions
      const boxWidth = change.location.xmax - change.location.xmin;
      const boxHeight = change.location.ymax - change.location.ymin;

      // Calculate zoom to fit 80% of container (use larger dimension)
      const zoomForWidth = (containerWidth * 0.8) / boxWidth;
      const zoomForHeight = (containerHeight * 0.8) / boxHeight;
      const newZoom = Math.min(zoomForWidth, zoomForHeight, 1); // Cap at 100%

      // Set the new zoom level
      setZoomLevel(newZoom);

      // Calculate center of bounding box in image coordinates
      const boxCenterX = (change.location.xmin + change.location.xmax) / 2;
      const boxCenterY = (change.location.ymin + change.location.ymax) / 2;

      // After zoom, scroll to center on the bounding box
      // Use setTimeout to allow the zoom to apply first
      setTimeout(() => {
        const scrollX = boxCenterX * newZoom - containerWidth / 2;
        const scrollY = boxCenterY * newZoom - containerHeight / 2;
        container.scrollTo({
          left: Math.max(0, scrollX),
          top: Math.max(0, scrollY),
          behavior: 'smooth',
        });
      }, 10);
    },
    [currentPage]
  );

  const handleDrawComplete = useCallback(
    (box: BoundingBox) => {
      if (!currentPage) return;

      // Create new change with the drawn bounding box and open modal for details
      const newChange: Change = {
        id: generateId(),
        action: 'Other',
        elements: ['Element'],
        direction: null,
        fromValue: null,
        toValue: null,
        description: null,
        location: box,
        approved: true,
      };

      // Set pending change and open modal
      setPendingNewChange(newChange);
      setIsDrawingMode(false);
    },
    [currentPage]
  );

  const handleSaveNewChange = useCallback(
    (updates: Partial<Omit<Change, 'id' | 'location'>>) => {
      if (!currentPage || !pendingNewChange) return;

      const finalChange: Change = {
        ...pendingNewChange,
        ...updates,
      };

      const updatedChanges = [...currentPage.changes, finalChange];
      updatePageChanges(currentPage.id, updatedChanges);
      setPendingNewChange(null);
      // Return to drawing mode for quick successive additions
      setIsDrawingMode(true);
    },
    [currentPage, pendingNewChange, updatePageChanges]
  );

  const handleCancelNewChange = useCallback(() => {
    setPendingNewChange(null);
    // Return to drawing mode
    setIsDrawingMode(true);
  }, []);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      deletePage(pageId);
      setHoveredChangeId(null);
    },
    [deletePage]
  );

  const handleSelectPage = useCallback(
    (index: number) => {
      setCurrentPage(index);
      setHoveredChangeId(null);
    },
    [setCurrentPage]
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleExportJson = useCallback(() => {
    if (!currentPage) return;

    // Export all changes regardless of confirmation status
    const exportData = {
      changes: currentPage.changes.map(changeToRawChange),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPage.name.replace(/\.[^/.]+$/, '')}_changes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentPage]);

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Change Review</h1>
        </div>
        <div className="flex items-center gap-2">
          {currentPage && (
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Export JSON
            </button>
          )}
          {pages.length > 0 && <ExportButton pages={pages} />}
        </div>
      </header>

      {/* Page tabs for multi-page navigation */}
      <div className="flex-shrink-0 px-4 py-2 border-b bg-gray-50">
        <PageTabs
          pages={pages}
          currentPageIndex={currentPageIndex}
          onSelectPage={handleSelectPage}
          onDeletePage={handleDeletePage}
          onAddPage={() => setIsUploadModalOpen(true)}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Change list (narrower) */}
        <div className="w-80 flex-shrink-0 border-r bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-gray-900">
                  Changes ({currentPage?.changes.length ?? 0})
                </h2>
                <button
                  onClick={() => setShowChangeTooltips((prev) => !prev)}
                  className={`p-1 rounded transition-colors ${showChangeTooltips ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
                  title={showChangeTooltips ? 'Hide tooltips' : 'Show tooltips'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showChangeTooltips ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className={`p-1 rounded transition-colors ${undoStack.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-1">
                {currentPage && currentPage.changes.length > 0 && (
                  <button
                    onClick={handleApproveAll}
                    className="h-7 px-2 text-xs rounded transition-colors bg-blue-500 text-white hover:bg-blue-600"
                    title={currentPage.changes.some((c) => c.approved ?? false) ? 'Unconfirm all changes' : 'Confirm all changes'}
                  >
                    {currentPage.changes.some((c) => c.approved ?? false) ? 'Unconfirm All' : 'Confirm All'}
                  </button>
                )}
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  disabled={!currentPage}
                  className={`
                    w-7 h-7 rounded flex items-center justify-center text-lg font-medium transition-colors
                    ${isDrawingMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'}
                  `}
                  title={isDrawingMode ? 'Cancel drawing (A or Esc)' : 'Add new change (A)'}
                >
                  {isDrawingMode ? '×' : '+'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {currentPage ? (
              <ChangeList
                changes={currentPage.changes}
                hoveredChangeId={hoveredChangeId}
                showTooltips={showChangeTooltips}
                onHover={handleHover}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCenter={handleCenter}
              />
            ) : (
              <div className="flex items-center justify-center h-full p-4 text-gray-500">
                No page loaded
              </div>
            )}
          </div>
        </div>

        {/* Right side: Image viewer (takes remaining space) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-4 py-2 bg-white border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-medium text-gray-900">{currentPage?.name ?? 'No page selected'}</h2>
              {currentPage && (
                <span className="text-sm text-gray-500">
                  {currentPage.imageWidth} × {currentPage.imageHeight}
                </span>
              )}
            </div>
            {currentPage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.2}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom out (Ctrl -)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(0.2);
                    setTimeout(() => {
                      if (imageViewerContainerRef.current) {
                        imageViewerContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
                      }
                    }, 10);
                  }}
                  className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded min-w-[60px]"
                  title="Reset zoom (R)"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 4}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom in (Ctrl +)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(0.2);
                    setTimeout(() => {
                      if (imageViewerContainerRef.current) {
                        imageViewerContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
                      }
                    }, 10);
                  }}
                  className="p-1.5 rounded hover:bg-gray-100"
                  title="Recenter view (R)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {isDrawingMode && currentPage && (
            <div className="flex-shrink-0 mx-4 mt-2 p-2 bg-blue-50 text-blue-800 text-sm rounded">
              Click and drag on the image to draw a bounding box. Press Escape to cancel.
            </div>
          )}

          {/* Image viewer with scroll */}
          <div ref={imageViewerContainerRef} className="flex-1 overflow-auto p-4">
            {currentPage ? (
              <ImageViewer
                imageData={currentPage.imageData}
                imageWidth={currentPage.imageWidth}
                imageHeight={currentPage.imageHeight}
                changes={currentPage.changes}
                hoveredChangeId={hoveredChangeId}
                isDrawingMode={isDrawingMode}
                drawingState={drawingState}
                onDrawComplete={handleDrawComplete}
                onDrawingStateChange={setDrawingState}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Add Page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Editor Modal - for editing existing changes */}
      {editingChangeId && currentPage && (() => {
        const editingChange = currentPage.changes.find((c) => c.id === editingChangeId);
        return editingChange ? (
          <ChangeEditor
            change={editingChange}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        ) : null;
      })()}

      {/* Change Editor Modal - for adding new changes */}
      {pendingNewChange && (
        <ChangeEditor
          change={pendingNewChange}
          onSave={handleSaveNewChange}
          onCancel={handleCancelNewChange}
        />
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal
          onUpload={(jsonData, imageData, imageName, imageWidth, imageHeight) => {
            handleUpload(jsonData, imageData, imageName, imageWidth, imageHeight);
            setIsUploadModalOpen(false);
          }}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </main>
  );
}
