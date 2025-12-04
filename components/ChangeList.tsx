'use client';

import type { Change } from '@/types/change';

interface ChangeListProps {
  changes: Change[];
  hoveredChangeId: string | null;
  showTooltips?: boolean;
  onHover: (changeId: string | null) => void;
  onApprove: (changeId: string) => void;
  onEdit: (changeId: string) => void;
  onDelete: (changeId: string) => void;
  onCenter: (changeId: string) => void;
}

export function ChangeList({
  changes,
  hoveredChangeId,
  showTooltips = false,
  onHover,
  onApprove,
  onEdit,
  onDelete,
  onCenter,
}: ChangeListProps) {
  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-gray-500">
        No changes to display
      </div>
    );
  }

  // Sort changes: top-to-bottom (y-axis priority), then left-to-right (x-axis)
  const sortedChanges = [...changes].sort((a, b) => {
    // Primary: sort by ymin (top to bottom)
    const yDiff = a.location.ymin - b.location.ymin;
    if (Math.abs(yDiff) > 50) return yDiff; // Use threshold to group similar y positions
    // Secondary: sort by xmin (left to right)
    return a.location.xmin - b.location.xmin;
  });

  return (
    <div className="flex flex-col gap-2 p-2">
      {sortedChanges.map((change) => {
        const isApproved = change.approved ?? false;
        const isHovered = hoveredChangeId === change.id;

        // Build tooltip with full metadata (only if enabled)
        const tooltip = showTooltips ? [
          `Action: ${change.action}`,
          `Elements: ${change.elements.join(', ')}`,
          change.direction ? `Direction: ${change.direction}` : null,
          change.fromValue ? `From: ${change.fromValue}` : null,
          change.toValue ? `To: ${change.toValue}` : null,
          change.description ? `Description: ${change.description}` : null,
          `Location: (${change.location.xmin}, ${change.location.ymin}) → (${change.location.xmax}, ${change.location.ymax})`,
          `Status: ${isApproved ? 'Confirmed' : 'Unconfirmed'}`,
        ].filter(Boolean).join('\n') : undefined;

        return (
          <div
            key={change.id}
            data-change-id={change.id}
            title={tooltip}
            onMouseEnter={() => onHover(change.id)}
            onClick={() => onApprove(change.id)}
            className={`
              px-2 py-1.5 rounded border cursor-pointer transition-all
              ${isApproved ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}
              ${isHovered && !isApproved ? 'bg-orange-50 border-orange-300' : ''}
              hover:shadow-sm
            `}
          >
            <div className="flex items-center gap-2">
              {/* Approval checkmark */}
              <div
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${isApproved ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}
                `}
              >
                {isApproved && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-gray-900">{change.action}</span>
                  <span className="text-gray-400">-</span>
                  <span className="text-gray-600 truncate">{change.elements.join(', ')}</span>
                  {change.direction && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 flex-shrink-0">
                      {change.direction}
                    </span>
                  )}
                </div>
                {change.description && (
                  <p className="text-[11px] text-gray-500 line-clamp-3">{change.description}</p>
                )}
                {(change.fromValue || change.toValue) && (
                  <p className="text-xs text-gray-500">
                    {change.fromValue && change.toValue
                      ? `${change.fromValue} → ${change.toValue}`
                      : change.fromValue || change.toValue}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCenter(change.id);
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                  aria-label="Center"
                  title="Center on change (C)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(change.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  aria-label="Edit"
                  title="Edit change (E)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(change.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  aria-label="Delete"
                  title="Delete change (D)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
