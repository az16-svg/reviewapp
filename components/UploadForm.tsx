'use client';

import { useState, useCallback, useRef } from 'react';
import { parseAnalysisJson } from '@/lib/validation';
import { useToast } from './Toast';
import type { AnalysisResult, ImageData } from '@/types/change';

interface UploadFormProps {
  onUpload: (
    jsonData: AnalysisResult | null,
    overlayImage: ImageData,
    imageName: string,
    previousImage: ImageData | null,
    newImage: ImageData | null
  ) => void;
  disabled?: boolean;
}

export function UploadForm({ onUpload, disabled = false }: UploadFormProps) {
  const { showToast } = useToast();
  const [jsonData, setJsonData] = useState<AnalysisResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [previousError, setPreviousError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');

  const overlayImageRef = useRef<ImageData | null>(null);
  const previousImageRef = useRef<ImageData | null>(null);
  const newImageRef = useRef<ImageData | null>(null);

  // Force re-render when refs change
  const [, forceUpdate] = useState({});

  const handleJsonChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setJsonError(null);

      try {
        const text = await file.text();
        const { result, errors } = parseAnalysisJson(text);

        if (!result) {
          setJsonError(errors.join('; '));
          setJsonData(null);
          return;
        }

        setJsonData(result);
        if (!imageName) {
          setImageName(file.name.replace(/\.json$/i, ''));
        }
      } catch {
        setJsonError('Failed to read file');
        setJsonData(null);
      }
    },
    [imageName]
  );

  const loadOverlayImage = useCallback(
    (file: File) => {
      setOverlayError(null);

      if (!file.type.startsWith('image/')) {
        setOverlayError('File must be an image (PNG, JPG, etc.)');
        overlayImageRef.current = null;
        forceUpdate({});
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        const img = new Image();
        img.onload = () => {
          overlayImageRef.current = {
            data: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
          if (!imageName) {
            setImageName(file.name.replace(/\.[^/.]+$/, ''));
          }

          // Clear previous/new images if they don't match the new overlay dimensions
          if (previousImageRef.current) {
            if (
              previousImageRef.current.width !== img.naturalWidth ||
              previousImageRef.current.height !== img.naturalHeight
            ) {
              previousImageRef.current = null;
              showToast(
                'Previous image cleared: dimensions do not match overlay image',
                'warning'
              );
            }
          }
          if (newImageRef.current) {
            if (
              newImageRef.current.width !== img.naturalWidth ||
              newImageRef.current.height !== img.naturalHeight
            ) {
              newImageRef.current = null;
              showToast(
                'New image cleared: dimensions do not match overlay image',
                'warning'
              );
            }
          }

          forceUpdate({});
        };
        img.onerror = () => {
          setOverlayError('Failed to load image');
          overlayImageRef.current = null;
          forceUpdate({});
        };
        img.src = dataUrl;
      };

      reader.onerror = () => {
        setOverlayError('Failed to read file');
        overlayImageRef.current = null;
        forceUpdate({});
      };

      reader.readAsDataURL(file);
    },
    [imageName, showToast]
  );

  const loadComparisonImage = useCallback(
    (
      file: File,
      setError: (err: string | null) => void,
      imageRef: React.MutableRefObject<ImageData | null>,
      imageType: 'Previous' | 'New'
    ) => {
      setError(null);

      if (!file.type.startsWith('image/')) {
        setError('File must be an image (PNG, JPG, etc.)');
        imageRef.current = null;
        forceUpdate({});
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        const img = new Image();
        img.onload = () => {
          // Validate dimensions against overlay image
          if (overlayImageRef.current) {
            if (
              img.naturalWidth !== overlayImageRef.current.width ||
              img.naturalHeight !== overlayImageRef.current.height
            ) {
              setError(
                `Dimensions (${img.naturalWidth}x${img.naturalHeight}) do not match overlay (${overlayImageRef.current.width}x${overlayImageRef.current.height})`
              );
              imageRef.current = null;
              showToast(
                `${imageType} image rejected: dimensions must match overlay image (${overlayImageRef.current.width}x${overlayImageRef.current.height}). Before/After comparison disabled.`,
                'warning'
              );
              forceUpdate({});
              return;
            }
          }

          imageRef.current = {
            data: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
          forceUpdate({});
        };
        img.onerror = () => {
          setError('Failed to load image');
          imageRef.current = null;
          forceUpdate({});
        };
        img.src = dataUrl;
      };

      reader.onerror = () => {
        setError('Failed to read file');
        imageRef.current = null;
        forceUpdate({});
      };

      reader.readAsDataURL(file);
    },
    [showToast]
  );

  const handleOverlayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loadOverlayImage(file);
    },
    [loadOverlayImage]
  );

  const handlePreviousChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loadComparisonImage(file, setPreviousError, previousImageRef, 'Previous');
    },
    [loadComparisonImage]
  );

  const handleNewChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loadComparisonImage(file, setNewError, newImageRef, 'New');
    },
    [loadComparisonImage]
  );

  const handleCreatePage = useCallback(() => {
    if (!overlayImageRef.current) return;

    onUpload(
      jsonData,
      overlayImageRef.current,
      imageName || 'Untitled',
      previousImageRef.current,
      newImageRef.current
    );
  }, [jsonData, imageName, onUpload]);

  const canCreate = overlayImageRef.current !== null;

  return (
    <div className="flex flex-col">
      {/* Overlay Image - Required */}
      <div className="flex flex-col gap-2 pb-4">
        <label htmlFor="overlay-upload" className="text-sm font-medium text-gray-700">
          Overlay Image <span className="text-red-500">*</span>
        </label>
        <input
          id="overlay-upload"
          type="file"
          accept="image/*"
          onChange={handleOverlayChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
        />
        {overlayError && (
          <p className="text-sm text-red-600" role="alert">
            {overlayError}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200" />

      {/* Previous Image - Optional */}
      <div className="flex flex-col gap-2 py-4">
        <label htmlFor="previous-upload" className="text-sm font-medium text-gray-700">
          Previous Image <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          id="previous-upload"
          type="file"
          accept="image/*"
          onChange={handlePreviousChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
        />
        {previousError && (
          <p className="text-sm text-red-600" role="alert">
            {previousError}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200" />

      {/* New Image - Optional */}
      <div className="flex flex-col gap-2 py-4">
        <label htmlFor="new-upload" className="text-sm font-medium text-gray-700">
          New Image <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          id="new-upload"
          type="file"
          accept="image/*"
          onChange={handleNewChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
        />
        {newError && (
          <p className="text-sm text-red-600" role="alert">
            {newError}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200" />

      {/* JSON File - Optional */}
      <div className="flex flex-col gap-2 pt-4 pb-4">
        <label htmlFor="json-upload" className="text-sm font-medium text-gray-700">
          Change File <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          id="json-upload"
          type="file"
          accept=".json,application/json"
          onChange={handleJsonChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
        />
        {jsonError && (
          <p className="text-sm text-red-600" role="alert">
            Invalid JSON: {jsonError}
          </p>
        )}
        {jsonData && (
          <p className="text-sm text-green-600">
            Loaded {jsonData.changes.length} changes
          </p>
        )}
      </div>

      <div className="border-t border-gray-200" />

      <div className="pt-4">
        <p className="text-xs text-gray-500 mb-4">
          Upload an overlay image (required). Optionally add previous/new images for before/after comparison (must match overlay dimensions), and a JSON file with change data.
        </p>

        <button
          onClick={handleCreatePage}
          disabled={!canCreate || disabled}
          className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Page
        </button>
      </div>
    </div>
  );
}
