// types/context.ts
// Project and sheet context types for LLM chat agent

export interface ContextFile {
  /** File name */
  name: string;
  /** File content as text */
  content: string;
}

export interface ProjectContext {
  /** Collection of text files loaded as context */
  files: ContextFile[];
  /** Timestamp when context was loaded */
  loadedAt?: string;
}

export interface SheetContext {
  /** Sheet number/identifier (e.g., "A-101", "M-001") */
  sheetNumber: string;

  /** Human-readable sheet name */
  sheetName?: string;

  /** Sheet discipline/category */
  discipline?: 'Architectural' | 'Structural' | 'Mechanical' | 'Electrical' | 'Plumbing' | 'Civil' | string;

  /** Legend items on this sheet */
  legends: LegendItem[];

  /** General notes text */
  generalNotes: string[];

  /** Revision history */
  revisions?: Revision[];

  /** Scale information */
  scale?: string;

  /** Additional sheet metadata */
  metadata?: Record<string, unknown>;
}

export interface LegendItem {
  /** Symbol identifier or image reference */
  symbol: string;

  /** Text description of the symbol */
  description: string;

  /** Category for grouping (e.g., "Electrical", "Plumbing") */
  category?: string;

  /** Color or pattern identifier */
  appearance?: string;
}

export interface Revision {
  /** Revision number/letter */
  number: string;

  /** Date of revision */
  date: string;

  /** Description of what changed */
  description: string;

  /** Who made the revision */
  author?: string;
}

// Actual sheet.json format from the application
export interface SheetBlock {
  block_type: string;
  storage_type: 'text' | 'image';
  image_uri?: string;
  text_content: string | null;
  bbox_xmin?: number;
  bbox_ymin?: number;
  bbox_xmax?: number;
  bbox_ymax?: number;
  description?: string;
  title_block_info?: {
    sheet_number?: string;
    sheet_title?: string;
    project_name?: string;
    date?: string | null;
    revision?: string | null;
    scale?: string;
    drawn_by?: string | null;
    checked_by?: string | null;
  } | null;
}

export interface SheetData {
  image_uri?: string;
  sheet_number: string;
  blocks: SheetBlock[];
}
