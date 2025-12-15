// Types for artifact panel and AI file editing

export interface PendingEdit {
  id: string;
  type: 'update' | 'create' | 'edit';
  filename: string;
  newContent: string;
  oldContent?: string; // undefined for create
  // For 'edit' type (search/replace)
  oldText?: string;
  newText?: string;
  status: 'pending' | 'applied' | 'rejected';
}

export interface ToolCallEvent {
  type: 'tool_call';
  toolName: string;
  toolCallId: string;
  arguments: Record<string, string>;
}
