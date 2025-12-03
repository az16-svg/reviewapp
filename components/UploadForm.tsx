'use client';

import { useState, useCallback, useRef } from 'react';
import { parseAnalysisJson } from '@/lib/validation';
import type { AnalysisResult } from '@/types/change';

interface UploadFormProps {
  onUpload: (
    jsonData: AnalysisResult,
    imageData: string,
    imageName: string,
    imageWidth: number,
    imageHeight: number
  ) => void;
  disabled?: boolean;
}

export function UploadForm({ onUpload, disabled = false }: UploadFormProps) {
  const [jsonData, setJsonData] = useState<AnalysisResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');

  const imageDataRef = useRef<{
    data: string;
    width: number;
    height: number;
  } | null>(null);

  const tryComplete = useCallback(
    (json: AnalysisResult | null, img: typeof imageDataRef.current) => {
      if (json && img) {
        onUpload(json, img.data, imageName || 'Untitled', img.width, img.height);
      }
    },
    [onUpload, imageName]
  );

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
        setImageName(file.name.replace(/\.json$/i, ''));
        tryComplete(result, imageDataRef.current);
      } catch (err) {
        setJsonError('Failed to read file');
        setJsonData(null);
      }
    },
    [tryComplete]
  );

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImageError(null);

      if (!file.type.startsWith('image/')) {
        setImageError('File must be an image (PNG, JPG, etc.)');
        imageDataRef.current = null;
        return;
      }

      try {
        const reader = new FileReader();

        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;

          // Load image to get dimensions
          const img = new Image();
          img.onload = () => {
            imageDataRef.current = {
              data: dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
            };
            tryComplete(jsonData, imageDataRef.current);
          };
          img.onerror = () => {
            setImageError('Failed to load image');
            imageDataRef.current = null;
          };
          img.src = dataUrl;
        };

        reader.onerror = () => {
          setImageError('Failed to read file');
          imageDataRef.current = null;
        };

        reader.readAsDataURL(file);
      } catch (err) {
        setImageError('Failed to read file');
        imageDataRef.current = null;
      }
    },
    [jsonData, tryComplete]
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold">Upload Files</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="json-upload" className="text-sm font-medium text-gray-700">
          JSON File
        </label>
        <input
          id="json-upload"
          type="file"
          accept=".json,application/json"
          onChange={handleJsonChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
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

      <div className="flex flex-col gap-2">
        <label htmlFor="image-upload" className="text-sm font-medium text-gray-700">
          Image File
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        {imageError && (
          <p className="text-sm text-red-600" role="alert">
            {imageError}
          </p>
        )}
        {imageDataRef.current && (
          <p className="text-sm text-green-600">
            Image loaded ({imageDataRef.current.width}x{imageDataRef.current.height})
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Upload both a JSON file with change data and the corresponding overlay image.
      </p>
    </div>
  );
}
