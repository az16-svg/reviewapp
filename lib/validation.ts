import type { BoundingBox, RawChange, AnalysisResult } from '@/types/change';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBoundingBox(box: unknown): ValidationResult {
  const errors: string[] = [];

  if (box === null || typeof box !== 'object') {
    return { valid: false, errors: ['Bounding box must be an object'] };
  }

  const b = box as Record<string, unknown>;

  if (typeof b.xmin !== 'number' || b.xmin < 0) {
    errors.push('xmin must be a non-negative number');
  }
  if (typeof b.ymin !== 'number' || b.ymin < 0) {
    errors.push('ymin must be a non-negative number');
  }
  if (typeof b.xmax !== 'number' || b.xmax < 0) {
    errors.push('xmax must be a non-negative number');
  }
  if (typeof b.ymax !== 'number' || b.ymax < 0) {
    errors.push('ymax must be a non-negative number');
  }

  if (errors.length === 0) {
    // At this point we've validated all properties are numbers
    const xmin = b.xmin as number;
    const ymin = b.ymin as number;
    const xmax = b.xmax as number;
    const ymax = b.ymax as number;
    if (xmax <= xmin) {
      errors.push('xmax must be greater than xmin');
    }
    if (ymax <= ymin) {
      errors.push('ymax must be greater than ymin');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateChange(change: unknown): ValidationResult {
  const errors: string[] = [];

  if (change === null || typeof change !== 'object') {
    return { valid: false, errors: ['Change must be an object'] };
  }

  const c = change as Record<string, unknown>;

  // Validate action
  if (typeof c.action !== 'string' || c.action.trim() === '') {
    errors.push('action must be a non-empty string');
  }

  // Validate elements
  if (!Array.isArray(c.elements)) {
    errors.push('elements must be an array');
  } else if (c.elements.length === 0) {
    errors.push('elements must have at least one item');
  } else if (!c.elements.every((e) => typeof e === 'string' && e.trim() !== '')) {
    errors.push('all elements must be non-empty strings');
  }

  // Validate direction (optional, but if present must be valid)
  const validDirections = ['left', 'right', 'up', 'down'];
  if (c.direction !== null && c.direction !== undefined) {
    if (typeof c.direction !== 'string' || !validDirections.includes(c.direction)) {
      errors.push(`direction must be null or one of: ${validDirections.join(', ')}`);
    }
  }

  // Validate location
  if (c.location === undefined) {
    errors.push('location is required');
  } else {
    const boxResult = validateBoundingBox(c.location);
    if (!boxResult.valid) {
      errors.push(...boxResult.errors.map((e) => `location: ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAnalysisResult(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.changes)) {
    return { valid: false, errors: ['changes must be an array'] };
  }

  // Validate each change
  d.changes.forEach((change, index) => {
    const result = validateChange(change);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `changes[${index}]: ${e}`));
    }
  });

  return { valid: errors.length === 0, errors };
}

export function parseAnalysisJson(jsonString: string): { result: AnalysisResult | null; errors: string[] } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      result: null,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`]
    };
  }

  const validation = validateAnalysisResult(parsed);
  if (!validation.valid) {
    return { result: null, errors: validation.errors };
  }

  return { result: parsed as AnalysisResult, errors: [] };
}
