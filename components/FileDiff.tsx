'use client';

import { useMemo } from 'react';

interface FileDiffProps {
  filename: string;
  oldContent?: string;
  newContent: string;
  onApply: () => void;
  onReject: () => void;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff algorithm
  const lcs = computeLCS(oldLines, newLines);
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        // Line is in both - unchanged
        result.push({
          type: 'unchanged',
          content: oldLines[oldIdx],
          oldLineNum: oldIdx + 1,
          newLineNum: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
        lcsIdx++;
      } else {
        // Line is only in new - added
        result.push({
          type: 'added',
          content: newLines[newIdx],
          newLineNum: newIdx + 1,
        });
        newIdx++;
      }
    } else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
      // Line is only in old - removed
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        oldLineNum: oldIdx + 1,
      });
      oldIdx++;
    } else if (newIdx < newLines.length) {
      // Line is only in new - added
      result.push({
        type: 'added',
        content: newLines[newIdx],
        newLineNum: newIdx + 1,
      });
      newIdx++;
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

export function FileDiff({ filename, oldContent, newContent, onApply, onReject }: FileDiffProps) {
  const isCreate = oldContent === undefined;
  const diffLines = useMemo(() => {
    if (isCreate) {
      // For new files, all lines are additions
      return newContent.split('\n').map((content, idx) => ({
        type: 'added' as const,
        content,
        newLineNum: idx + 1,
      }));
    }
    return computeDiff(oldContent, newContent);
  }, [oldContent, newContent, isCreate]);

  const stats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{filename}</span>
          <span className="text-xs text-gray-500">
            {isCreate ? '(new file)' : '(modified)'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-600">+{stats.added}</span>
          <span className="text-red-600">-{stats.removed}</span>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`flex ${
              line.type === 'added'
                ? 'bg-green-50'
                : line.type === 'removed'
                  ? 'bg-red-50'
                  : ''
            }`}
          >
            {/* Line numbers */}
            <div className="flex-shrink-0 w-16 flex text-gray-400 select-none border-r border-gray-200">
              <span className="w-8 px-1 text-right">
                {line.type !== 'added' ? line.oldLineNum : ''}
              </span>
              <span className="w-8 px-1 text-right">
                {line.type !== 'removed' ? line.newLineNum : ''}
              </span>
            </div>
            {/* Sign */}
            <div
              className={`w-5 flex-shrink-0 text-center select-none ${
                line.type === 'added'
                  ? 'text-green-600 bg-green-100'
                  : line.type === 'removed'
                    ? 'text-red-600 bg-red-100'
                    : 'text-gray-300'
              }`}
            >
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </div>
            {/* Content */}
            <pre className="flex-1 px-2 whitespace-pre-wrap break-all">
              {line.content || ' '}
            </pre>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onReject}
          className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Reject
        </button>
        <button
          onClick={onApply}
          className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}
