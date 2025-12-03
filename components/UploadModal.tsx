'use client';

import { useEffect } from 'react';
import { UploadForm } from './UploadForm';
import type { AnalysisResult } from '@/types/change';

interface UploadModalProps {
  onUpload: (
    jsonData: AnalysisResult,
    imageData: string,
    imageName: string,
    imageWidth: number,
    imageHeight: number
  ) => void;
  onClose: () => void;
}

export function UploadModal({ onUpload, onClose }: UploadModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUpload = (
    jsonData: AnalysisResult,
    imageData: string,
    imageName: string,
    imageWidth: number,
    imageHeight: number
  ) => {
    onUpload(jsonData, imageData, imageName, imageWidth, imageHeight);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Page</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <UploadForm onUpload={handleUpload} />
        </div>
      </div>
    </div>
  );
}
