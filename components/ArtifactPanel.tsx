'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, FileText, Eye, Code, AlertCircle, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileDiff } from './FileDiff';
import type { ProjectContext } from '@/types/context';
import type { PendingEdit } from '@/types/artifact';

const MIN_WIDTH = 320;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 450;
const STORAGE_KEY = 'artifactPanelWidth';

interface ArtifactPanelProps {
  projectContext: ProjectContext | null;
  pendingEdits: PendingEdit[];
  onClose: () => void;
  onApplyEdit: (editId: string) => void;
  onRejectEdit: (editId: string) => void;
  onSaveFile: (filename: string, content: string) => void;
  rightOffset?: number; // Offset from right edge when ChatPanel is also open
}

export function ArtifactPanel({
  projectContext,
  pendingEdits,
  onClose,
  onApplyEdit,
  onRejectEdit,
  onSaveFile,
  rightOffset = 0,
}: ArtifactPanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');
  const [editedContent, setEditedContent] = useState<string | null>(null); // null = not editing
  const panelRef = useRef<HTMLDivElement>(null);

  // Start with default width to avoid hydration mismatch
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);

  // Load saved width from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setPanelWidth(parsed);
      }
    }
  }, []);
  const [isResizing, setIsResizing] = useState(false);

  // Get list of files (from context + any pending creates)
  const files = useMemo(() => {
    const contextFiles = projectContext?.files || [];
    const pendingCreates = pendingEdits
      .filter((e) => e.type === 'create' && e.status === 'pending')
      .map((e) => ({ name: e.filename, content: '', isPending: true }));

    // Merge, preferring context files
    const fileMap = new Map<string, { name: string; content: string; isPending?: boolean }>();
    contextFiles.forEach((f) => fileMap.set(f.name, { ...f, isPending: false }));
    pendingCreates.forEach((f) => {
      if (!fileMap.has(f.name)) {
        fileMap.set(f.name, f);
      }
    });

    return Array.from(fileMap.values());
  }, [projectContext, pendingEdits]);

  // Auto-select first file or file with pending edit
  useEffect(() => {
    if (!selectedFile && files.length > 0) {
      // Prefer file with pending edit
      const pendingFile = pendingEdits.find((e) => e.status === 'pending');
      if (pendingFile) {
        setSelectedFile(pendingFile.filename);
      } else {
        setSelectedFile(files[0].name);
      }
    }
  }, [files, selectedFile, pendingEdits]);

  // Get pending edit for selected file
  const pendingEditForSelected = useMemo(() => {
    if (!selectedFile) return null;
    return pendingEdits.find(
      (e) => e.filename === selectedFile && e.status === 'pending'
    );
  }, [selectedFile, pendingEdits]);

  // Debug logging
  useEffect(() => {
    console.log('[ArtifactPanel] State:', {
      pendingEditsCount: pendingEdits.length,
      pendingEdits: pendingEdits.map(e => ({ filename: e.filename, type: e.type, status: e.status })),
      selectedFile,
      pendingEditForSelected: pendingEditForSelected ? {
        filename: pendingEditForSelected.filename,
        type: pendingEditForSelected.type,
      } : null,
      filesCount: files.length,
    });
  }, [pendingEdits, selectedFile, pendingEditForSelected, files]);

  // Get content for selected file
  const selectedFileContent = useMemo(() => {
    if (!selectedFile) return '';
    const file = projectContext?.files.find((f) => f.name === selectedFile);
    return file?.content || '';
  }, [selectedFile, projectContext]);

  // Reset edited content when file selection changes
  useEffect(() => {
    setEditedContent(null);
  }, [selectedFile]);

  // Check if content has been modified
  const hasUnsavedChanges = editedContent !== null && editedContent !== selectedFileContent;

  // Handle save
  const handleSave = useCallback(() => {
    if (selectedFile && editedContent !== null) {
      onSaveFile(selectedFile, editedContent);
      setEditedContent(null);
    }
  }, [selectedFile, editedContent, onSaveFile]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setEditedContent(null);
  }, []);

  // Export file as PDF
  const handleExportPDF = useCallback(() => {
    if (!selectedFile || !selectedFileContent) return;

    // Create a new window with the rendered markdown content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    // Simple markdown to HTML conversion for print
    // We'll use a basic styling that looks good in print
    const filename = selectedFile.replace(/\.md$/, '');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
            }
            h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            p { margin: 1em 0; }
            ul, ol { margin: 1em 0; padding-left: 2em; }
            li { margin: 0.25em 0; }
            code {
              background: #f4f4f4;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-size: 0.9em;
            }
            pre {
              background: #f4f4f4;
              padding: 1em;
              border-radius: 5px;
              overflow-x: auto;
            }
            pre code {
              background: none;
              padding: 0;
            }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 1em 0;
              padding-left: 1em;
              color: #666;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th { background: #f4f4f4; }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div id="content"></div>
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
          <script>
            document.getElementById('content').innerHTML = marked.parse(\`${selectedFileContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [selectedFile, selectedFileContent]);

  // Save panel width to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(panelWidth));
    }
  }, [panelWidth]);

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

      // Calculate new width based on mouse position from the right edge (accounting for offset)
      const newWidth = parentRect.right - e.clientX - rightOffset;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
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
  }, [isResizing, rightOffset]);

  const pendingCount = pendingEdits.filter((e) => e.status === 'pending').length;

  return (
    <div
      ref={panelRef}
      className="absolute top-0 bottom-0 bg-white border-l shadow-lg flex flex-col z-19"
      style={{ width: panelWidth, right: rightOffset }}
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
      <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <h2 className="font-medium text-gray-900">Project Files</h2>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
          <FileText className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm">No project files loaded</p>
          <p className="text-xs mt-1">Upload files using the &quot;Add Project Details&quot; button</p>
        </div>
      ) : (
        <>
          {/* File tabs */}
          <div className="flex-shrink-0 border-b bg-gray-50 overflow-x-auto">
            <div className="flex px-2 py-1 gap-1">
              {files.map((file) => {
                const hasPending = pendingEdits.some(
                  (e) => e.filename === file.name && e.status === 'pending'
                );
                return (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFile(file.name)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap ${
                      selectedFile === file.name
                        ? 'bg-white border border-gray-300 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {file.name}
                    {hasPending && (
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* View mode toggle and export (only when no pending edit) */}
          {!pendingEditForSelected && (
            <div className="flex-shrink-0 px-3 py-2 border-b flex items-center justify-between">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                title="Export as PDF"
              >
                <Download className="w-3 h-3" />
                Export PDF
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('rendered')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                    viewMode === 'rendered'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('source')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                    viewMode === 'source'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Code className="w-3 h-3" />
                  Source
                </button>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {pendingEditForSelected ? (
              <FileDiff
                filename={pendingEditForSelected.filename}
                oldContent={pendingEditForSelected.oldContent}
                newContent={pendingEditForSelected.newContent}
                onApply={() => onApplyEdit(pendingEditForSelected.id)}
                onReject={() => onRejectEdit(pendingEditForSelected.id)}
              />
            ) : viewMode === 'rendered' ? (
              <div className="h-full overflow-y-auto p-4">
                <div className="prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedFileContent}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <textarea
                  value={editedContent ?? selectedFileContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="flex-1 p-4 text-xs font-mono resize-none border-none outline-none bg-white"
                  spellCheck={false}
                />
                {/* Save/Cancel buttons when content has changed */}
                {hasUnsavedChanges && (
                  <div className="flex-shrink-0 p-3 border-t bg-amber-50 flex items-center justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
