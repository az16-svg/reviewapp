// Core types

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export type ActionType = 'Add' | 'Remove' | 'Move' | 'Dimension Change' | 'Other';
export type DirectionType = 'Up' | 'Down' | 'Left' | 'Right' | null;

export interface Change {
  id: string;
  action: ActionType;
  elements: string[];
  direction: DirectionType;
  fromValue: string | null;
  toValue: string | null;
  description: string | null;
  location: BoundingBox;
  approved: boolean;
}

export interface Page {
  id: string;
  name: string;
  imageData: string;
  imageWidth: number;
  imageHeight: number;
  changes: Change[];
  createdAt: Date;
}

// Import/Export types (without id)
export interface RawChange {
  action: string;
  elements: string[];
  direction: string | null;
  value: unknown;
  fromValue?: unknown;
  toValue?: unknown;
  description?: string | null;
  location: BoundingBox;
}

export interface AnalysisResult {
  changes: RawChange[];
}

// UI State types
export interface DrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface AppState {
  pages: Page[];
  currentPageIndex: number;
  selectedChangeIds: Set<string>;
  hoveredChangeId: string | null;
  isDrawingMode: boolean;
  drawingState: DrawingState | null;
}

// Action types for changes
export type ChangeAction =
  | { type: 'ADD_CHANGE'; pageId: string; change: Change }
  | { type: 'UPDATE_CHANGE'; pageId: string; changeId: string; updates: Partial<Omit<Change, 'id'>> }
  | { type: 'DELETE_CHANGE'; pageId: string; changeId: string };

// Action types for pages
export type PageAction =
  | { type: 'ADD_PAGE'; page: Page }
  | { type: 'DELETE_PAGE'; pageId: string }
  | { type: 'SET_CURRENT_PAGE'; index: number };

// Utility function to generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Valid action types
export const ACTION_TYPES: ActionType[] = ['Add', 'Remove', 'Move', 'Dimension Change', 'Other'];
export const DIRECTION_TYPES: DirectionType[] = [null, 'Up', 'Down', 'Left', 'Right'];

// Transform raw change to internal change with ID
export function rawChangeToChange(raw: RawChange): Change {
  // Map action to valid ActionType, default to 'Other'
  const action = ACTION_TYPES.includes(raw.action as ActionType)
    ? (raw.action as ActionType)
    : 'Other';

  // Map direction to valid DirectionType
  const direction = DIRECTION_TYPES.includes(raw.direction as DirectionType)
    ? (raw.direction as DirectionType)
    : null;

  return {
    id: generateId(),
    action,
    elements: raw.elements,
    direction,
    fromValue: raw.fromValue != null ? String(raw.fromValue) : (raw.value != null ? String(raw.value) : null),
    toValue: raw.toValue != null ? String(raw.toValue) : null,
    description: raw.description ?? null,
    location: raw.location,
    approved: false,
  };
}

// Transform internal change to raw change for export
export function changeToRawChange(change: Change): RawChange {
  return {
    action: change.action,
    elements: change.elements,
    direction: change.direction,
    value: change.fromValue,
    fromValue: change.fromValue,
    toValue: change.toValue,
    description: change.description,
    location: change.location,
  };
}
