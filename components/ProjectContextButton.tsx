'use client';

import { useRef } from 'react';
import { FolderOpen, Check } from 'lucide-react';
import type { ProjectContext, ContextFile } from '@/types/context';

interface ProjectContextButtonProps {
  projectContext: ProjectContext | null;
  onUpload: (context: ProjectContext) => void;
  onError: (error: string) => void;
}

export function ProjectContextButton({
  projectContext,
  onUpload,
  onError,
}: ProjectContextButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Copy files to array before any async operations
    const filesToRead = Array.from(fileList);

    // Reset the input so the same files can be selected again
    e.target.value = '';

    try {
      const files: ContextFile[] = [];

      for (const file of filesToRead) {
        const content = await file.text();
        files.push({
          name: file.name,
          content,
        });
      }

      const context: ProjectContext = {
        files,
        loadedAt: new Date().toISOString(),
      };

      onUpload(context);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to read files');
    }
  };

  const fileCount = projectContext?.files.length ?? 0;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.csv,.xml,.html,.yaml,.yml,text/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        title={projectContext ? 'Change project context files' : 'Add project context files'}
      >
        <FolderOpen className="w-4 h-4" />
        <span>{projectContext ? 'Change Project Details' : 'Add Project Details'}</span>
      </button>
      {projectContext && fileCount > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
          <Check className="w-3 h-3" />
          <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
