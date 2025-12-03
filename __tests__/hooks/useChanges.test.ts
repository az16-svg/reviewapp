import { renderHook, act } from '@testing-library/react';
import { useChanges } from '@/hooks/useChanges';
import type { Change } from '@/types/change';

const createMockChange = (id: string): Change => ({
  id,
  action: 'Move',
  elements: ['Wall'],
  direction: 'left',
  value: null,
  location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
});

describe('useChanges', () => {
  it('should initialize with empty array by default', () => {
    const { result } = renderHook(() => useChanges());
    expect(result.current.changes).toEqual([]);
  });

  it('should initialize with provided changes', () => {
    const initialChanges = [createMockChange('1'), createMockChange('2')];
    const { result } = renderHook(() => useChanges(initialChanges));
    expect(result.current.changes).toEqual(initialChanges);
  });

  it('should add a change', () => {
    const { result } = renderHook(() => useChanges());
    const newChange = createMockChange('new');

    act(() => {
      result.current.addChange(newChange);
    });

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toEqual(newChange);
  });

  it('should update a change', () => {
    const initialChange = createMockChange('1');
    const { result } = renderHook(() => useChanges([initialChange]));

    act(() => {
      result.current.updateChange('1', { action: 'Add', direction: 'right' });
    });

    expect(result.current.changes[0].action).toBe('Add');
    expect(result.current.changes[0].direction).toBe('right');
    expect(result.current.changes[0].elements).toEqual(['Wall']); // Unchanged
  });

  it('should delete a change', () => {
    const changes = [createMockChange('1'), createMockChange('2')];
    const { result } = renderHook(() => useChanges(changes));

    act(() => {
      result.current.deleteChange('1');
    });

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].id).toBe('2');
  });

  it('should set changes array', () => {
    const { result } = renderHook(() => useChanges([createMockChange('1')]));
    const newChanges = [createMockChange('a'), createMockChange('b')];

    act(() => {
      result.current.setChanges(newChanges);
    });

    expect(result.current.changes).toEqual(newChanges);
  });

  it('should not modify other changes when updating one', () => {
    const changes = [createMockChange('1'), createMockChange('2')];
    const { result } = renderHook(() => useChanges(changes));

    act(() => {
      result.current.updateChange('1', { action: 'Remove' });
    });

    expect(result.current.changes[1].action).toBe('Move'); // Unchanged
  });
});
