'use client';

import { useState, useEffect, useRef } from 'react';
import type { Change, ActionType, DirectionType } from '@/types/change';
import { ACTION_TYPES, DIRECTION_TYPES } from '@/types/change';
import { styles } from '@/lib/theme';

interface ChangeEditorProps {
  change: Change;
  onSave: (updates: Partial<Omit<Change, 'id' | 'location'>>) => void;
  onCancel: () => void;
}

interface FormState {
  action: ActionType;
  elements: string;
  direction: DirectionType;
  fromValue: string;
  toValue: string;
  description: string;
}

interface FormErrors {
  action?: string;
  elements?: string;
}

export function ChangeEditor({ change, onSave, onCancel }: ChangeEditorProps) {
  const [formState, setFormState] = useState<FormState>({
    action: change.action,
    elements: change.elements.join(', '),
    direction: change.direction,
    fromValue: change.fromValue ?? '',
    toValue: change.toValue ?? '',
    description: change.description ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const elementsInputRef = useRef<HTMLInputElement>(null);

  // Focus elements field on mount
  useEffect(() => {
    elementsInputRef.current?.focus();
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleTextChange = (field: 'elements' | 'fromValue' | 'toValue' | 'description') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: e.target.value }));
    if (field === 'elements' && errors.elements) {
      setErrors((prev) => ({ ...prev, elements: undefined }));
    }
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, action: e.target.value as ActionType }));
  };

  const handleDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormState((prev) => ({
      ...prev,
      direction: value === '' ? null : (value as DirectionType),
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    const elements = formState.elements
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (elements.length === 0) {
      newErrors.elements = 'At least one element is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const elements = formState.elements
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    onSave({
      action: formState.action,
      elements,
      direction: formState.direction,
      fromValue: formState.fromValue.trim() || null,
      toValue: formState.toValue.trim() || null,
      description: formState.description.trim() || null,
    });
  };

  return (
    <>
      {/* Side Panel - slides in from left, contained within image viewer */}
      <div
        data-testid="editor-panel"
        className="absolute top-0 left-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col border-r animate-slide-in-left"
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Edit Change</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Action dropdown */}
          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              id="action"
              value={formState.action}
              onChange={handleActionChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white ${styles.focusRing}`}
            >
              {ACTION_TYPES.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Elements field */}
          <div>
            <label htmlFor="elements" className="block text-sm font-medium text-gray-700 mb-1">
              Elements (comma-separated)
            </label>
            <input
              ref={elementsInputRef}
              id="elements"
              type="text"
              value={formState.elements}
              onChange={handleTextChange('elements')}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm
                ${styles.focusRing}
                ${errors.elements ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.elements && (
              <p className="mt-1 text-sm text-red-600">{errors.elements}</p>
            )}
          </div>

          {/* Direction dropdown */}
          <div>
            <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-1">
              Direction (optional)
            </label>
            <select
              id="direction"
              value={formState.direction ?? ''}
              onChange={handleDirectionChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white ${styles.focusRing}`}
            >
              <option value="">None</option>
              {DIRECTION_TYPES.filter((d) => d !== null).map((direction) => (
                <option key={direction} value={direction!}>
                  {direction}
                </option>
              ))}
            </select>
          </div>

          {/* From/To Value fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromValue" className="block text-sm font-medium text-gray-700 mb-1">
                From Value
              </label>
              <input
                id="fromValue"
                type="text"
                value={formState.fromValue}
                onChange={handleTextChange('fromValue')}
                placeholder="e.g., 10cm"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${styles.focusRing}`}
              />
            </div>
            <div>
              <label htmlFor="toValue" className="block text-sm font-medium text-gray-700 mb-1">
                To Value
              </label>
              <input
                id="toValue"
                type="text"
                value={formState.toValue}
                onChange={handleTextChange('toValue')}
                placeholder="e.g., 15cm"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${styles.focusRing}`}
              />
            </div>
          </div>

          {/* Description field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formState.description}
              onChange={handleTextChange('description')}
              placeholder="Add any additional notes about this change..."
              rows={3}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm resize-none ${styles.focusRing}`}
            />
          </div>
        </div>

        {/* Footer - fixed at bottom */}
        <div className="p-4 border-t flex justify-end gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${styles.focusRing}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={styles.buttonSave}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
