import { render, screen, fireEvent } from '@testing-library/react';
import { ChangeList } from '@/components/ChangeList';
import type { Change } from '@/types/change';

// Changes are sorted by y-axis (top to bottom), then x-axis (left to right)
// So id '1' with ymin: 50 comes before id '2' with ymin: 200
const mockChanges: Change[] = [
  {
    id: '1',
    action: 'Move',
    elements: ['Wall', 'Door'],
    direction: 'Left',
    fromValue: null,
    toValue: null,
    description: null,
    location: { xmin: 100, ymin: 50, xmax: 300, ymax: 150 },
    approved: false,
  },
  {
    id: '2',
    action: 'Add',
    elements: ['Window'],
    direction: null,
    fromValue: '10cm',
    toValue: null,
    description: 'Test description',
    location: { xmin: 50, ymin: 200, xmax: 150, ymax: 300 },
    approved: false,
  },
];

describe('ChangeList', () => {
  const mockOnHover = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnCenter = jest.fn();

  const defaultProps = {
    changes: mockChanges,
    hoveredChangeId: null,
    onHover: mockOnHover,
    onApprove: mockOnApprove,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onCenter: mockOnCenter,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all changes in list', () => {
    render(<ChangeList {...defaultProps} />);

    expect(screen.getByText('Move')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('should display action and elements for each change', () => {
    render(<ChangeList {...defaultProps} />);

    expect(screen.getByText(/Wall, Door/)).toBeInTheDocument();
    expect(screen.getByText(/Window/)).toBeInTheDocument();
  });

  it('should call onHover with changeId on mouse enter', () => {
    render(<ChangeList {...defaultProps} />);

    const firstItem = screen.getByText('Move').closest('[data-change-id]');
    fireEvent.mouseEnter(firstItem!);

    expect(mockOnHover).toHaveBeenCalledWith('1');
  });

  it('should call onHover with null on mouse leave', () => {
    render(<ChangeList {...defaultProps} />);

    const firstItem = screen.getByText('Move').closest('[data-change-id]');
    fireEvent.mouseLeave(firstItem!);

    expect(mockOnHover).toHaveBeenCalledWith(null);
  });

  it('should call onApprove on click', () => {
    render(<ChangeList {...defaultProps} />);

    const firstItem = screen.getByText('Move').closest('[data-change-id]');
    fireEvent.click(firstItem!);

    expect(mockOnApprove).toHaveBeenCalledWith('1');
  });

  it('should show edit button for each item', () => {
    render(<ChangeList {...defaultProps} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(2);
  });

  it('should call onEdit when edit button clicked', () => {
    render(<ChangeList {...defaultProps} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('should show delete button for each item', () => {
    render(<ChangeList {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('should highlight approved changes with blue styling', () => {
    const approvedChanges = mockChanges.map((c, i) =>
      i === 0 ? { ...c, approved: true } : c
    );
    render(<ChangeList {...defaultProps} changes={approvedChanges} />);

    const firstItem = screen.getByText('Move').closest('[data-change-id]');
    expect(firstItem).toHaveClass('border-blue-400');
    expect(firstItem).toHaveClass('bg-blue-50');
  });

  it('should show checkmark for approved changes', () => {
    const approvedChanges = mockChanges.map((c, i) =>
      i === 0 ? { ...c, approved: true } : c
    );
    render(<ChangeList {...defaultProps} changes={approvedChanges} />);

    // Check that the checkmark SVG is rendered for approved item
    const firstItem = screen.getByText('Move').closest('[data-change-id]');
    const checkmark = firstItem?.querySelector('svg');
    expect(checkmark).toBeInTheDocument();
  });

  it('should render empty state when no changes', () => {
    render(<ChangeList {...defaultProps} changes={[]} />);

    expect(screen.getByText(/no changes/i)).toBeInTheDocument();
  });
});
