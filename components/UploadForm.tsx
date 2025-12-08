'use client';

import { useState, useCallback, useRef } from 'react';
import { parseAnalysisJson } from '@/lib/validation';
import { useToast } from './Toast';
import { styles, theme } from '@/lib/theme';
import type { AnalysisResult, ImageData, SheetsData } from '@/types/change';

interface UploadFormProps {
  onUpload: (
    jsonData: AnalysisResult | null,
    overlayImage: ImageData,
    imageName: string,
    previousImage: ImageData | null,
    newImage: ImageData | null,
    legendImage: ImageData | null,
    sheetsData: SheetsData | null
  ) => void;
  disabled?: boolean;
}

type UploadTab = 'multi' | 'individual';

// File name mappings for multi-file upload
const FILE_MAPPINGS = {
  overlay: 'overlay.png',
  previous: 'old.png',
  new: 'new.png',
  changes: 'changes.json',
  legend: 'legend.png',
  sheets: 'sheet.json',
} as const;

export function UploadForm({ onUpload, disabled = false }: UploadFormProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<UploadTab>('multi');

  // Shared state
  const [jsonData, setJsonData] = useState<AnalysisResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [previousError, setPreviousError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [legendError, setLegendError] = useState<string | null>(null);
  const [sheetsData, setSheetsData] = useState<SheetsData | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');

  // Multi-file upload state
  const [multiFileStatus, setMultiFileStatus] = useState<Record<string, 'loaded' | 'error' | null>>({});
  const [multiFileError, setMultiFileError] = useState<string | null>(null);

  const overlayImageRef = useRef<ImageData | null>(null);
  const previousImageRef = useRef<ImageData | null>(null);
  const newImageRef = useRef<ImageData | null>(null);
  const legendImageRef = useRef<ImageData | null>(null);

  // Force re-render when refs change
  const [, forceUpdate] = useState({});

  // Reset all state when switching tabs
  const handleTabChange = useCallback((tab: UploadTab) => {
    setActiveTab(tab);
    // Reset all state
    setJsonData(null);
    setJsonError(null);
    setOverlayError(null);
    setPreviousError(null);
    setNewError(null);
    setLegendError(null);
    setSheetsData(null);
    setSheetsError(null);
    setImageName('');
    setMultiFileStatus({});
    setMultiFileError(null);
    overlayImageRef.current = null;
    previousImageRef.current = null;
    newImageRef.current = null;
    legendImageRef.current = null;
    forceUpdate({});
  }, []);

  // Helper to load an image file and return ImageData
  const loadImageFile = useCallback((file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            data: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Multi-file upload handler
  const handleMultiFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setMultiFileError(null);
      const status: Record<string, 'loaded' | 'error' | null> = {};

      // Reset refs
      overlayImageRef.current = null;
      previousImageRef.current = null;
      newImageRef.current = null;
      legendImageRef.current = null;
      setJsonData(null);
      setSheetsData(null);

      // Process each file based on filename
      for (const file of Array.from(files)) {
        const fileName = file.name.toLowerCase();

        try {
          if (fileName === FILE_MAPPINGS.overlay.toLowerCase()) {
            overlayImageRef.current = await loadImageFile(file);
            setImageName(file.name.replace(/\.[^/.]+$/, ''));
            status['overlay'] = 'loaded';
          } else if (fileName === FILE_MAPPINGS.previous.toLowerCase()) {
            previousImageRef.current = await loadImageFile(file);
            status['previous'] = 'loaded';
          } else if (fileName === FILE_MAPPINGS.new.toLowerCase()) {
            newImageRef.current = await loadImageFile(file);
            status['new'] = 'loaded';
          } else if (fileName === FILE_MAPPINGS.legend.toLowerCase()) {
            legendImageRef.current = await loadImageFile(file);
            status['legend'] = 'loaded';
          } else if (fileName === FILE_MAPPINGS.changes.toLowerCase()) {
            const text = await file.text();
            const { result, errors } = parseAnalysisJson(text);
            if (result) {
              setJsonData(result);
              status['changes'] = 'loaded';
            } else {
              setJsonError(errors.join('; '));
              status['changes'] = 'error';
            }
          } else if (fileName === FILE_MAPPINGS.sheets.toLowerCase()) {
            const text = await file.text();
            const data = JSON.parse(text) as SheetsData;
            if (data.blocks && Array.isArray(data.blocks)) {
              setSheetsData(data);
              status['sheets'] = 'loaded';
            } else {
              setSheetsError('Invalid sheet.json');
              status['sheets'] = 'error';
            }
          }
        } catch (err) {
          const key = fileName.replace(/\.[^/.]+$/, '');
          status[key] = 'error';
        }
      }

      // Validate dimensions for comparison images
      if (overlayImageRef.current) {
        if (previousImageRef.current) {
          if (
            previousImageRef.current.width !== overlayImageRef.current.width ||
            previousImageRef.current.height !== overlayImageRef.current.height
          ) {
            previousImageRef.current = null;
            status['previous'] = 'error';
            showToast('Previous image dimensions do not match overlay', 'warning');
          }
        }
        if (newImageRef.current) {
          if (
            newImageRef.current.width !== overlayImageRef.current.width ||
            newImageRef.current.height !== overlayImageRef.current.height
          ) {
            newImageRef.current = null;
            status['new'] = 'error';
            showToast('New image dimensions do not match overlay', 'warning');
          }
        }
      }

      if (!overlayImageRef.current) {
        setMultiFileError(`Missing required file: ${FILE_MAPPINGS.overlay}`);
      }

      setMultiFileStatus(status);
      forceUpdate({});
    },
    [loadImageFile, showToast]
  );

  // Individual file handlers (existing code)
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
      imageRef: React.RefObject<ImageData | null>,
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

  const handleLegendChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setLegendError(null);

      if (!file.type.startsWith('image/')) {
        setLegendError('File must be an image (PNG, JPG, etc.)');
        legendImageRef.current = null;
        forceUpdate({});
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        const img = new Image();
        img.onload = () => {
          legendImageRef.current = {
            data: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
          forceUpdate({});
        };
        img.onerror = () => {
          setLegendError('Failed to load image');
          legendImageRef.current = null;
          forceUpdate({});
        };
        img.src = dataUrl;
      };

      reader.onerror = () => {
        setLegendError('Failed to read file');
        legendImageRef.current = null;
        forceUpdate({});
      };

      reader.readAsDataURL(file);
    },
    []
  );

  const handleSheetsChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSheetsError(null);

      try {
        const text = await file.text();
        const data = JSON.parse(text) as SheetsData;

        // Basic validation
        if (!data.blocks || !Array.isArray(data.blocks)) {
          setSheetsError('Invalid sheet.json: missing blocks array');
          setSheetsData(null);
          return;
        }

        setSheetsData(data);
      } catch {
        setSheetsError('Failed to parse sheet.json file');
        setSheetsData(null);
      }
    },
    []
  );

  const handleCreatePage = useCallback(() => {
    if (!overlayImageRef.current) return;

    onUpload(
      jsonData,
      overlayImageRef.current,
      imageName || 'Untitled',
      previousImageRef.current,
      newImageRef.current,
      legendImageRef.current,
      sheetsData
    );
  }, [jsonData, imageName, onUpload, sheetsData]);

  const canCreate = overlayImageRef.current !== null;

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => handleTabChange('multi')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'multi'
              ? styles.tabActive
              : styles.tabInactive
          }`}
        >
          Multi-File Upload
        </button>
        <button
          onClick={() => handleTabChange('individual')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'individual'
              ? styles.tabActive
              : styles.tabInactive
          }`}
        >
          Individual Upload
        </button>
      </div>

      {/* Multi-File Upload Tab */}
      {activeTab === 'multi' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="multi-upload" className="text-sm font-medium text-gray-700">
              Select Files
            </label>
            <input
              id="multi-upload"
              type="file"
              multiple
              accept="image/*,.json,application/json"
              onChange={handleMultiFileChange}
              disabled={disabled}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Expected file names */}
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Expected file names:</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <span className={multiFileStatus['overlay'] === 'loaded' ? theme.accent.text500 : multiFileStatus['overlay'] === 'error' ? 'text-red-600' : ''}>
                  {multiFileStatus['overlay'] === 'loaded' ? '✓' : multiFileStatus['overlay'] === 'error' ? '✗' : '•'}
                </span>
                <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.overlay}</code>
                <span className="text-red-500">*</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={multiFileStatus['previous'] === 'loaded' ? theme.accent.text500 : multiFileStatus['previous'] === 'error' ? 'text-red-600' : ''}>
                  {multiFileStatus['previous'] === 'loaded' ? '✓' : multiFileStatus['previous'] === 'error' ? '✗' : '•'}
                </span>
                <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.previous}</code>
              </div>
              <div className="flex items-center gap-1">
                <span className={multiFileStatus['new'] === 'loaded' ? theme.accent.text500 : multiFileStatus['new'] === 'error' ? 'text-red-600' : ''}>
                  {multiFileStatus['new'] === 'loaded' ? '✓' : multiFileStatus['new'] === 'error' ? '✗' : '•'}
                </span>
                <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.new}</code>
              </div>
              <div className="flex items-center gap-1">
                <span className={multiFileStatus['changes'] === 'loaded' ? theme.accent.text500 : multiFileStatus['changes'] === 'error' ? 'text-red-600' : ''}>
                  {multiFileStatus['changes'] === 'loaded' ? '✓' : multiFileStatus['changes'] === 'error' ? '✗' : '•'}
                </span>
                <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.changes}</code>
              </div>
              <div className="flex items-center gap-1">
                <span className={multiFileStatus['legend'] === 'loaded' ? theme.accent.text500 : multiFileStatus['legend'] === 'error' ? 'text-red-600' : ''}>
                  {multiFileStatus['legend'] === 'loaded' ? '✓' : multiFileStatus['legend'] === 'error' ? '✗' : '•'}
                </span>
                <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.legend}</code>
              </div>
              <div className="flex items-center gap-1">
                <span className={multiFileStatus['sheets'] === 'loaded' ? theme.accent.text500 : multiFileStatus['sheets'] === 'error' ? 'text-red-600' : ''}>
                  {multiFileStatus['sheets'] === 'loaded' ? '✓' : multiFileStatus['sheets'] === 'error' ? '✗' : '•'}
                </span>
                <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.sheets}</code>
              </div>
            </div>
          </div>

          {multiFileError && (
            <p className="text-sm text-red-600" role="alert">
              {multiFileError}
            </p>
          )}

          {jsonError && (
            <p className="text-sm text-red-600" role="alert">
              Changes file error: {jsonError}
            </p>
          )}

          {sheetsError && (
            <p className="text-sm text-red-600" role="alert">
              Sheets file error: {sheetsError}
            </p>
          )}

          <p className="text-xs text-gray-500">
            Select multiple files at once. Only <code className="bg-gray-200 px-1 rounded">{FILE_MAPPINGS.overlay}</code> is required.
          </p>

          <button
            onClick={handleCreatePage}
            disabled={!canCreate || disabled}
            className={styles.buttonPrimaryFull}
          >
            Create Page
          </button>
        </div>
      )}

      {/* Individual Upload Tab */}
      {activeTab === 'individual' && (
        <>
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
              <p className={`text-sm ${theme.accent.text500}`}>
                Loaded {jsonData.changes.length} changes
              </p>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* Legend Image - Optional */}
          <div className="flex flex-col gap-2 py-4">
            <label htmlFor="legend-upload" className="text-sm font-medium text-gray-700">
              Legend Image <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="legend-upload"
              type="file"
              accept="image/*"
              onChange={handleLegendChange}
              disabled={disabled}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
            />
            {legendError && (
              <p className="text-sm text-red-600" role="alert">
                {legendError}
              </p>
            )}
            {legendImageRef.current && (
              <p className={`text-sm ${theme.accent.text500}`}>
                Legend loaded ({legendImageRef.current.width} × {legendImageRef.current.height})
              </p>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* Sheets JSON - Optional */}
          <div className="flex flex-col gap-2 py-4">
            <label htmlFor="sheets-upload" className="text-sm font-medium text-gray-700">
              Sheets JSON <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="sheets-upload"
              type="file"
              accept=".json,application/json"
              onChange={handleSheetsChange}
              disabled={disabled}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
            />
            {sheetsError && (
              <p className="text-sm text-red-600" role="alert">
                {sheetsError}
              </p>
            )}
            {sheetsData && (
              <p className={`text-sm ${theme.accent.text500}`}>
                Loaded {sheetsData.blocks.length} blocks from sheet {sheetsData.sheet_number}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200" />

          <div className="pt-4">
            <p className="text-xs text-gray-500 mb-4">
              Upload an overlay image (required). Optionally add previous/new images for before/after comparison, a JSON file with change data, a legend image, and a sheet.json file with metadata.
            </p>

            <button
              onClick={handleCreatePage}
              disabled={!canCreate || disabled}
              className={styles.buttonPrimaryFull}
            >
              Create Page
            </button>
          </div>
        </>
      )}
    </div>
  );
}
