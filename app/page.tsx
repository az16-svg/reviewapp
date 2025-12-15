'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadModal } from '@/components/UploadModal';
import { ImageViewer } from '@/components/ImageViewer';
import { ChangeList } from '@/components/ChangeList';
import { ChangeEditor } from '@/components/ChangeEditor';
import { ExportButton } from '@/components/ExportButton';
import { PageTabs } from '@/components/PageTabs';
import { LegendPanel } from '@/components/LegendPanel';
import { ProjectContextButton } from '@/components/ProjectContextButton';
import { ChatPanel } from '@/components/ChatPanel';
import { ArtifactPanel } from '@/components/ArtifactPanel';
import { usePages } from '@/hooks/usePages';
import { useToast } from '@/components/Toast';
import { styles, theme } from '@/lib/theme';
import type { AnalysisResult, Change, BoundingBox, DrawingState, ImageData, ViewMode, BeforeAfterImage, SheetsData } from '@/types/change';
import type { ProjectContext } from '@/types/context';
import type { PendingEdit } from '@/types/artifact';
import { rawChangeToChange, generateId, changeToRawChange } from '@/types/change';

export default function Home() {
  const { pages, currentPage, currentPageIndex, addPage, deletePage, setCurrentPage, updatePageChanges } = usePages();
  const { showToast } = useToast();
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [hoveredChangeId, setHoveredChangeId] = useState<string | null>(null);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [pendingNewChange, setPendingNewChange] = useState<Change | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0.2);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showChangeTooltips, setShowChangeTooltips] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<{ pageId: string; changes: Change[] }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [beforeAfterImage, setBeforeAfterImage] = useState<BeforeAfterImage>('previous');
  const [showLegendPanel, setShowLegendPanel] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMagnifierMode, setIsMagnifierMode] = useState(false);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const [chatPanelWidth, setChatPanelWidth] = useState(400);
  const [isChangesPanelCollapsed, setIsChangesPanelCollapsed] = useState(false);
  const imageViewerContainerRef = useRef<HTMLDivElement>(null);

  // Check if before/after mode is available (both previous and new images exist)
  const canUseBeforeAfter = currentPage?.previousImage && currentPage?.newImage;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when focused on input elements (chat, forms, etc.)
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      // Only allow Escape when input is focused (to close panels)
      if (isInputFocused && e.key !== 'Escape') return;

      // Don't handle shortcuts when editing or adding new change
      if (editingChangeId || pendingNewChange) return;

      // Spacebar to toggle between previous/new in before/after mode
      if (e.key === ' ' && viewMode === 'before-after' && canUseBeforeAfter) {
        e.preventDefault();
        setBeforeAfterImage((prev) => (prev === 'previous' ? 'new' : 'previous'));
        return;
      }

      // 'B' key to toggle between Overlay and Before/After modes
      if ((e.key === 'b' || e.key === 'B') && canUseBeforeAfter) {
        e.preventDefault();
        setViewMode((prev) => (prev === 'overlay' ? 'before-after' : 'overlay'));
        return;
      }

      // Escape to cancel drawing mode or close panels
      if (e.key === 'Escape') {
        if (isDrawingMode) {
          setIsDrawingMode(false);
          setDrawingState(null);
        } else if (isChatOpen) {
          setIsChatOpen(false);
        } else if (isArtifactPanelOpen) {
          setIsArtifactPanelOpen(false);
        }
      }

      // 'P' key to toggle artifact panel
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsArtifactPanelOpen((prev) => !prev);
      }

      // 'Q' key to toggle chat panel
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }

      // 'A' key to toggle add change mode (only when a page is loaded)
      if ((e.key === 'a' || e.key === 'A') && currentPage) {
        e.preventDefault();
        setIsDrawingMode((prev) => !prev);
        setIsMagnifierMode(false);
      }

      // 'M' key to toggle magnifier mode (only when a page is loaded)
      if ((e.key === 'm' || e.key === 'M') && currentPage) {
        e.preventDefault();
        setIsMagnifierMode((prev) => !prev);
        setIsDrawingMode(false);
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

      // 'I' key to toggle sheet info panel
      if ((e.key === 'i' || e.key === 'I') && currentPage && (currentPage.legendImage || currentPage.sheetsData)) {
        e.preventDefault();
        setShowLegendPanel((prev) => !prev);
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
  }, [isDrawingMode, editingChangeId, pendingNewChange, currentPage, hoveredChangeId, updatePageChanges, viewMode, canUseBeforeAfter, isChatOpen, isArtifactPanelOpen]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    updatePageChanges(lastState.pageId, lastState.changes);
  }, [undoStack, updatePageChanges]);

  const handleUpload = useCallback(
    (
      jsonData: AnalysisResult | null,
      overlayImage: ImageData,
      imageName: string,
      previousImage: ImageData | null,
      newImage: ImageData | null,
      legendImage: ImageData | null,
      sheetsData: SheetsData | null
    ) => {
      const rawChanges = jsonData ? jsonData.changes.map(rawChangeToChange) : [];
      // Sort changes only on initial load: top-to-bottom (y-axis priority), then left-to-right (x-axis)
      const changes = [...rawChanges].sort((a, b) => {
        // Primary: sort by ymin (top to bottom)
        const yDiff = a.location.ymin - b.location.ymin;
        if (Math.abs(yDiff) > 50) return yDiff; // Use threshold to group similar y positions
        // Secondary: sort by xmin (left to right)
        return a.location.xmin - b.location.xmin;
      });
      addPage({
        id: generateId(),
        name: imageName,
        imageData: overlayImage.data,
        imageWidth: overlayImage.width,
        imageHeight: overlayImage.height,
        previousImage: previousImage || undefined,
        newImage: newImage || undefined,
        legendImage: legendImage || undefined,
        sheetsData: sheetsData || undefined,
        changes,
        createdAt: new Date(),
      });
      // Reset view mode when adding a new page
      setViewMode('overlay');
    },
    [addPage]
  );

  const handleHover = useCallback((changeId: string | null) => {
    setHoveredChangeId(changeId);
  }, []);

  const handleBoxClick = useCallback((changeId: string) => {
    // Set both selected and hovered for visual consistency
    setSelectedChangeId(changeId);
    setHoveredChangeId(changeId);
    // Clear selection after a short delay to allow the highlight animation
    setTimeout(() => {
      setSelectedChangeId(null);
    }, 1500);
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

  const handleChangeLocationUpdate = useCallback(
    (changeId: string, newLocation: BoundingBox) => {
      if (!currentPage) return;

      // Save to undo stack before updating
      setUndoStack((prev) => [...prev.slice(-19), { pageId: currentPage.id, changes: [...currentPage.changes] }]);

      const updatedChanges = currentPage.changes.map((c) =>
        c.id === changeId ? { ...c, location: newLocation } : c
      );
      updatePageChanges(currentPage.id, updatedChanges);
    },
    [currentPage, updatePageChanges]
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      deletePage(pageId);
      setHoveredChangeId(null);
      setSelectedChangeId(null);
    },
    [deletePage]
  );

  const handleSelectPage = useCallback(
    (index: number) => {
      setCurrentPage(index);
      setHoveredChangeId(null);
      setSelectedChangeId(null);
      setViewMode('overlay'); // Reset to overlay when switching pages
      setShowLegendPanel(false); // Close legend panel when switching pages
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
    a.download = `page_${currentPageIndex + 1}_changes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentPage, currentPageIndex]);

  const handleProjectContextUpload = useCallback((context: ProjectContext) => {
    setProjectContext(context);
  }, []);

  const handleProjectContextError = useCallback((error: string) => {
    console.error('Failed to load context:', error);
  }, []);

  // Handle tool calls from AI agent (for artifact panel)
  const handleToolCall = useCallback((event: { type: 'tool_call'; toolName: string; toolCallId: string; arguments: Record<string, string> }) => {
    const validTools = ['update_context_file', 'create_context_file', 'edit_context_file'];
    if (!validTools.includes(event.toolName)) return;

    const filename = event.arguments.filename;
    const editType = event.arguments.editType as 'update' | 'create' | 'edit';
    const oldContent = projectContext?.files.find((f) => f.name === filename)?.content;

    let newContent: string;
    let oldText: string | undefined;
    let newText: string | undefined;

    if (editType === 'edit') {
      // Search/replace edit - compute the new content
      oldText = event.arguments.old_text;
      newText = event.arguments.new_text;
      if (oldContent && oldText) {
        if (!oldContent.includes(oldText)) {
          // Text not found - still show the edit but it will fail
          console.warn(`Text not found in file: "${oldText.substring(0, 50)}..."`);
        }
        newContent = oldContent.replace(oldText, newText || '');
      } else {
        newContent = oldContent || '';
      }
    } else if (editType === 'create') {
      newContent = event.arguments.content || '';
    } else {
      // update - full replacement
      newContent = event.arguments.new_content || '';
    }

    const edit: PendingEdit = {
      id: event.toolCallId,
      type: editType,
      filename,
      newContent,
      oldContent: editType === 'create' ? undefined : oldContent,
      oldText,
      newText,
      status: 'pending',
    };

    console.log('[handleToolCall] Creating pending edit:', {
      id: edit.id,
      type: edit.type,
      filename: edit.filename,
      hasNewContent: !!edit.newContent,
      newContentLength: edit.newContent?.length,
      hasOldContent: !!edit.oldContent,
    });

    setPendingEdits((prev) => {
      const updated = [...prev, edit];
      console.log('[handleToolCall] Updated pendingEdits count:', updated.length);
      return updated;
    });
    setIsArtifactPanelOpen(true); // Auto-open panel to show pending edit
  }, [projectContext]);

  // Apply a pending edit (update projectContext)
  const handleApplyEdit = useCallback((editId: string) => {
    const edit = pendingEdits.find((e) => e.id === editId);
    if (!edit) return;

    if (edit.type === 'create') {
      // Add new file
      const newFile = { name: edit.filename, content: edit.newContent };
      setProjectContext((prev) => ({
        files: [...(prev?.files || []), newFile],
        loadedAt: prev?.loadedAt,
      }));
    } else {
      // Update existing file
      setProjectContext((prev) => ({
        files: (prev?.files || []).map((f) =>
          f.name === edit.filename ? { ...f, content: edit.newContent } : f
        ),
        loadedAt: prev?.loadedAt,
      }));
    }

    // Mark as applied
    setPendingEdits((prev) =>
      prev.map((e) => (e.id === editId ? { ...e, status: 'applied' as const } : e))
    );
  }, [pendingEdits]);

  // Reject a pending edit
  const handleRejectEdit = useCallback((editId: string) => {
    setPendingEdits((prev) =>
      prev.map((e) => (e.id === editId ? { ...e, status: 'rejected' as const } : e))
    );
  }, []);

  // Save file content directly (from manual editing)
  const handleSaveFile = useCallback((filename: string, content: string) => {
    setProjectContext((prev) => ({
      files: (prev?.files || []).map((f) =>
        f.name === filename ? { ...f, content } : f
      ),
      loadedAt: prev?.loadedAt,
    }));
  }, []);

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">BuildTrace</h1>
          <div className="w-px h-6 bg-gray-300" />
          <PageTabs
            pages={pages}
            currentPageIndex={currentPageIndex}
            onSelectPage={handleSelectPage}
            onDeletePage={handleDeletePage}
            onAddPage={() => setIsUploadModalOpen(true)}
          />
        </div>
        <div className="flex items-center gap-3">
          <ProjectContextButton
            projectContext={projectContext}
            onUpload={handleProjectContextUpload}
            onError={handleProjectContextError}
          />
          <div className="w-px h-6 bg-gray-300" />
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Change list (collapsible) */}
        <div className={`flex-shrink-0 border-r bg-white flex flex-col overflow-hidden transition-all duration-200 ${isChangesPanelCollapsed ? 'w-10' : 'w-80'}`}>
          {isChangesPanelCollapsed ? (
            /* Collapsed view - just a vertical bar with expand button */
            <div className="flex flex-col items-center py-3 h-full bg-gray-50">
              <button
                onClick={() => setIsChangesPanelCollapsed(false)}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                title="Expand changes panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="mt-2 text-xs text-gray-500 writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                Changes ({currentPage?.changes.length ?? 0})
              </div>
            </div>
          ) : (
            /* Expanded view */
            <>
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsChangesPanelCollapsed(true)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                      title="Collapse panel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="font-medium text-gray-900">
                      Changes ({currentPage?.changes.length ?? 0})
                    </h2>
                    <button
                      onClick={() => setShowChangeTooltips((prev) => !prev)}
                      className={`p-1 rounded transition-colors ${showChangeTooltips ? styles.toggleActive : 'text-gray-400 hover:text-gray-600'}`}
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
                        className={`h-7 px-2 text-xs rounded transition-colors ${styles.buttonPrimarySmall}`}
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
                          ? styles.buttonPrimaryActive
                          : styles.buttonPrimary + ' disabled:opacity-50 disabled:cursor-not-allowed'}
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
                    selectedChangeId={selectedChangeId}
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
            </>
          )}
        </div>

        {/* Right side: Image viewer (takes remaining space) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 relative">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b flex items-center justify-between">
            <div className="flex items-center gap-3 min-h-[28px]">
              <h2 className="font-medium text-gray-900">{currentPage ? `Page ${currentPageIndex + 1}` : 'No page selected'}</h2>
              {currentPage && (
                <span className="text-sm text-gray-500">
                  {currentPage.imageWidth} × {currentPage.imageHeight}
                </span>
              )}

              {/* Panel toggle icons */}
              <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                {/* Legend Panel Toggle - only show if legend or sheets data exists */}
                {(currentPage?.legendImage || currentPage?.sheetsData) && (
                  <button
                    onClick={() => setShowLegendPanel(!showLegendPanel)}
                    className={`p-1.5 rounded transition-colors ${
                      showLegendPanel ? styles.toggleActiveLight : 'hover:bg-gray-100'
                    }`}
                    title={showLegendPanel ? 'Hide sheet info (I)' : 'Show sheet info (I)'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}

                {/* Artifact Panel Toggle */}
                <button
                  onClick={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
                  className={`p-1.5 rounded transition-colors relative ${
                    isArtifactPanelOpen ? styles.toggleActiveLight : 'hover:bg-gray-100'
                  }`}
                  title={isArtifactPanelOpen ? 'Hide Files (P)' : 'View Files (P)'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {pendingEdits.filter((e) => e.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                      {pendingEdits.filter((e) => e.status === 'pending').length}
                    </span>
                  )}
                </button>

                {/* Chat Panel Toggle */}
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`p-1.5 rounded transition-colors ${
                    isChatOpen ? styles.toggleActiveLight : 'hover:bg-gray-100'
                  }`}
                  title={isChatOpen ? 'Hide Chat (Q)' : 'Open Chat (Q)'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>

              {/* Zoom and magnifier controls */}
              {currentPage && (
                <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
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

                  {/* Magnifier Toggle */}
                  <button
                    onClick={() => {
                      setIsMagnifierMode(!isMagnifierMode);
                      if (!isMagnifierMode) setIsDrawingMode(false);
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      isMagnifierMode ? styles.toggleActiveLight : 'hover:bg-gray-100'
                    }`}
                    title={isMagnifierMode ? 'Disable magnifier (M)' : 'Enable magnifier (M)'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Before/After and View Mode toggles */}
              {currentPage && canUseBeforeAfter && (
                <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                  {/* Before/After Image Toggle - only show in before-after mode */}
                  {viewMode === 'before-after' && (
                    <>
                      <div className="flex items-center">
                        <div className="flex items-center gap-0.5 bg-gray-200 rounded p-0.5">
                          <button
                            onClick={() => setBeforeAfterImage('previous')}
                            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                              beforeAfterImage === 'previous'
                                ? styles.buttonPrimaryActive
                                : 'text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setBeforeAfterImage('new')}
                            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                              beforeAfterImage === 'new'
                                ? styles.buttonPrimaryActive
                                : 'text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            New
                          </button>
                        </div>
                        <span className="text-xs text-gray-500 ml-1">(Space)</span>
                      </div>
                      <div className="w-px h-6 bg-gray-300 mx-1" />
                    </>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center">
                    <div className="flex items-center gap-0.5 bg-gray-200 rounded p-0.5">
                      <button
                        onClick={() => setViewMode('overlay')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          viewMode === 'overlay'
                            ? styles.buttonPrimaryActive
                            : 'text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Overlay
                      </button>
                      <button
                        onClick={() => setViewMode('before-after')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          viewMode === 'before-after'
                            ? styles.buttonPrimaryActive
                            : 'text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Before/After
                      </button>
                    </div>
                    <span className="text-xs text-gray-500 ml-1">(B)</span>
                  </div>
                </div>
              )}

              {isDrawingMode && currentPage && (
                <span className="text-sm text-blue-600">
                  — Click and drag to draw bounding box. Escape to cancel.
                </span>
              )}
            </div>
          </div>

          {/* Image viewer with scroll */}
          <div ref={imageViewerContainerRef} className="flex-1 overflow-auto p-4">
            {currentPage ? (() => {
              // Determine which image to show based on view mode
              let displayImage = {
                data: currentPage.imageData,
                width: currentPage.imageWidth,
                height: currentPage.imageHeight,
              };

              if (viewMode === 'before-after' && canUseBeforeAfter) {
                const selectedImage = beforeAfterImage === 'previous'
                  ? currentPage.previousImage
                  : currentPage.newImage;
                if (selectedImage) {
                  displayImage = selectedImage;
                }
              }

              return (
                <ImageViewer
                  imageData={displayImage.data}
                  imageWidth={displayImage.width}
                  imageHeight={displayImage.height}
                  changes={currentPage.changes}
                  hoveredChangeId={hoveredChangeId}
                  isDrawingMode={isDrawingMode}
                  drawingState={drawingState}
                  onDrawComplete={handleDrawComplete}
                  onDrawingStateChange={setDrawingState}
                  onChangeLocationUpdate={handleChangeLocationUpdate}
                  onBoxClick={handleBoxClick}
                  zoomLevel={zoomLevel}
                  onZoomChange={setZoomLevel}
                  isMagnifierMode={isMagnifierMode}
                  scrollContainerRef={imageViewerContainerRef}
                />
              );
            })() : (
              <div className="flex items-center justify-center h-full">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${styles.buttonPrimary}`}
                >
                  Add Page
                </button>
              </div>
            )}
          </div>

          {/* Change Editor Side Panel - for editing existing changes */}
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

          {/* Change Editor Side Panel - for adding new changes */}
          {pendingNewChange && (
            <ChangeEditor
              change={pendingNewChange}
              onSave={handleSaveNewChange}
              onCancel={handleCancelNewChange}
            />
          )}

          {/* Legend Panel - for viewing legend image and sheet contents */}
          {showLegendPanel && currentPage && (currentPage.legendImage || currentPage.sheetsData) && (
            <LegendPanel
              legendImage={currentPage.legendImage}
              sheetsData={currentPage.sheetsData}
              onClose={() => setShowLegendPanel(false)}
            />
          )}

          {/* Artifact Panel - View/edit project context files */}
          {isArtifactPanelOpen && (
            <ArtifactPanel
              projectContext={projectContext}
              pendingEdits={pendingEdits.filter((e) => e.status === 'pending')}
              onClose={() => setIsArtifactPanelOpen(false)}
              onApplyEdit={handleApplyEdit}
              onRejectEdit={handleRejectEdit}
              onSaveFile={handleSaveFile}
              rightOffset={isChatOpen ? chatPanelWidth : 0}
            />
          )}

          {/* Chat Panel - AI assistant for drawing questions */}
          {/* Always mounted to preserve conversation state, but hidden when closed */}
          <div className={isChatOpen ? '' : 'hidden'}>
            <ChatPanel
              projectContext={projectContext}
              sheetContext={currentPage?.sheetsData ?? null}
              onClose={() => setIsChatOpen(false)}
              onToolCall={handleToolCall}
            />
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal
          onUpload={(jsonData, overlayImage, imageName, previousImage, newImage, legendImage, sheetsData) => {
            handleUpload(jsonData, overlayImage, imageName, previousImage, newImage, legendImage, sheetsData);
            setIsUploadModalOpen(false);
          }}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </main>
  );
}
