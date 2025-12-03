'use client';

import { useState } from 'react';
import { exportToPdf } from '@/lib/pdfExport';
import type { Page } from '@/types/change';

interface ExportButtonProps {
  pages: Page[];
  disabled?: boolean;
}

export function ExportButton({ pages, disabled = false }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (pages.length === 0) {
      setError('No pages to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress({ current: 0, total: pages.length });

    try {
      await exportToPdf(pages, 'change-review-export.pdf', (current, total) => {
        setProgress({ current, total });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = disabled || isExporting || pages.length === 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
          transition-colors
          ${isDisabled
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'}
        `}
      >
        {isExporting ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Exporting... ({progress.current}/{progress.total})
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export PDF
          </>
        )}
      </button>

      {error && (
        <span className="text-sm text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
