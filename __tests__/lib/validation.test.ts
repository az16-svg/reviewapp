import {
  validateBoundingBox,
  validateChange,
  validateAnalysisResult,
  parseAnalysisJson,
} from '@/lib/validation';

describe('validateBoundingBox', () => {
  it('should accept a valid bounding box', () => {
    const result = validateBoundingBox({
      xmin: 100,
      ymin: 200,
      xmax: 300,
      ymax: 400,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null', () => {
    const result = validateBoundingBox(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Bounding box must be an object');
  });

  it('should reject negative coordinates', () => {
    const result = validateBoundingBox({
      xmin: -10,
      ymin: 200,
      xmax: 300,
      ymax: 400,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('xmin must be a non-negative number');
  });

  it('should reject xmax <= xmin', () => {
    const result = validateBoundingBox({
      xmin: 300,
      ymin: 200,
      xmax: 100,
      ymax: 400,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('xmax must be greater than xmin');
  });

  it('should reject ymax <= ymin', () => {
    const result = validateBoundingBox({
      xmin: 100,
      ymin: 400,
      xmax: 300,
      ymax: 200,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ymax must be greater than ymin');
  });
});

describe('validateChange', () => {
  const validChange = {
    action: 'Move',
    elements: ['Wall', 'Door'],
    direction: 'left',
    value: null,
    location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
  };

  it('should accept a valid change', () => {
    const result = validateChange(validChange);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept change with null direction', () => {
    const result = validateChange({ ...validChange, direction: null });
    expect(result.valid).toBe(true);
  });

  it('should reject empty action', () => {
    const result = validateChange({ ...validChange, action: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('action must be a non-empty string');
  });

  it('should reject empty elements array', () => {
    const result = validateChange({ ...validChange, elements: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('elements must have at least one item');
  });

  it('should reject invalid direction', () => {
    const result = validateChange({ ...validChange, direction: 'diagonal' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('direction must be null or one of');
  });

  it('should reject missing location', () => {
    const { location, ...changeWithoutLocation } = validChange;
    const result = validateChange(changeWithoutLocation);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('location is required');
  });
});

describe('validateAnalysisResult', () => {
  it('should accept valid analysis result', () => {
    const result = validateAnalysisResult({
      changes: [
        {
          action: 'Move',
          elements: ['Wall'],
          direction: 'left',
          value: null,
          location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept empty changes array', () => {
    const result = validateAnalysisResult({ changes: [] });
    expect(result.valid).toBe(true);
  });

  it('should reject missing changes array', () => {
    const result = validateAnalysisResult({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('changes must be an array');
  });

  it('should report errors for invalid changes with index', () => {
    const result = validateAnalysisResult({
      changes: [
        { action: '', elements: ['Wall'], direction: null, value: null, location: { xmin: 0, ymin: 0, xmax: 10, ymax: 10 } },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('changes[0]');
  });
});

describe('parseAnalysisJson', () => {
  it('should parse valid JSON', () => {
    const json = JSON.stringify({
      changes: [
        {
          action: 'Move',
          elements: ['Wall'],
          direction: 'left',
          value: null,
          location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
        },
      ],
    });
    const { result, errors } = parseAnalysisJson(json);
    expect(result).not.toBeNull();
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid JSON syntax', () => {
    const { result, errors } = parseAnalysisJson('{ invalid json }');
    expect(result).toBeNull();
    expect(errors[0]).toContain('Invalid JSON');
  });

  it('should reject valid JSON with invalid schema', () => {
    const { result, errors } = parseAnalysisJson('{"changes": [{"action": ""}]}');
    expect(result).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });
});
