import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangeEditor } from '@/components/ChangeEditor';
import type { Change } from '@/types/change';

const mockChange: Change = {
  id: '1',
  action: 'Move',
  elements: ['Wall', 'Door'],
  direction: 'Left',
  fromValue: '10cm',
  toValue: '15cm',
  description: 'Test description',
  location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
  approved: false,
};

describe('ChangeEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    change: mockChange,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with change data', () => {
    render(<ChangeEditor {...defaultProps} />);

    expect(screen.getByLabelText(/action/i)).toHaveValue('Move');
    expect(screen.getByLabelText(/elements/i)).toHaveValue('Wall, Door');
    expect(screen.getByLabelText(/direction/i)).toHaveValue('Left');
    expect(screen.getByLabelText(/from value/i)).toHaveValue('10cm');
    expect(screen.getByLabelText(/to value/i)).toHaveValue('15cm');
  });

  it('should show save and cancel buttons', () => {
    render(<ChangeEditor {...defaultProps} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should call onCancel when cancel button clicked', () => {
    render(<ChangeEditor {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onCancel when escape key pressed', () => {
    render(<ChangeEditor {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onCancel when backdrop clicked', () => {
    render(<ChangeEditor {...defaultProps} />);

    const backdrop = screen.getByTestId('editor-backdrop');
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should not close when modal content clicked', () => {
    render(<ChangeEditor {...defaultProps} />);

    const modal = screen.getByTestId('editor-modal');
    fireEvent.click(modal);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should update action field when selected from dropdown', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const actionSelect = screen.getByLabelText(/action/i);
    await user.selectOptions(actionSelect, 'Remove');

    expect(actionSelect).toHaveValue('Remove');
  });

  it('should update elements field when typed', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const elementsInput = screen.getByLabelText(/elements/i);
    await user.clear(elementsInput);
    await user.type(elementsInput, 'Window, Frame');

    expect(elementsInput).toHaveValue('Window, Frame');
  });

  it('should update direction field when selected from dropdown', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const directionSelect = screen.getByLabelText(/direction/i);
    await user.selectOptions(directionSelect, 'Right');

    expect(directionSelect).toHaveValue('Right');
  });

  it('should call onSave with updated data when save clicked', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const actionSelect = screen.getByLabelText(/action/i);
    await user.selectOptions(actionSelect, 'Remove');

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).toHaveBeenCalledWith({
      action: 'Remove',
      elements: ['Wall', 'Door'],
      direction: 'Left',
      fromValue: '10cm',
      toValue: '15cm',
      description: 'Test description',
    });
  });

  it('should parse elements from comma-separated string', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const elementsInput = screen.getByLabelText(/elements/i);
    await user.clear(elementsInput);
    await user.type(elementsInput, 'Window, Frame, Glass');

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: ['Window', 'Frame', 'Glass'],
      })
    );
  });

  it('should handle empty optional fields', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const directionSelect = screen.getByLabelText(/direction/i);
    const fromValueInput = screen.getByLabelText(/from value/i);
    const toValueInput = screen.getByLabelText(/to value/i);
    await user.selectOptions(directionSelect, '');
    await user.clear(fromValueInput);
    await user.clear(toValueInput);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: null,
        fromValue: null,
        toValue: null,
      })
    );
  });

  it('should show validation error when elements is empty', async () => {
    const user = userEvent.setup();
    render(<ChangeEditor {...defaultProps} />);

    const elementsInput = screen.getByLabelText(/elements/i);
    await user.clear(elementsInput);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText(/at least one element is required/i)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should handle change with null optional fields', () => {
    const changeWithNulls: Change = {
      ...mockChange,
      direction: null,
      fromValue: null,
      toValue: null,
    };

    render(<ChangeEditor {...defaultProps} change={changeWithNulls} />);

    expect(screen.getByLabelText(/direction/i)).toHaveValue('');
    expect(screen.getByLabelText(/from value/i)).toHaveValue('');
    expect(screen.getByLabelText(/to value/i)).toHaveValue('');
  });

  it('should focus elements field on mount', () => {
    render(<ChangeEditor {...defaultProps} />);

    expect(screen.getByLabelText(/elements/i)).toHaveFocus();
  });
});
