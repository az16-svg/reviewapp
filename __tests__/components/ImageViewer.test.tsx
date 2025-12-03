import { render, screen, fireEvent } from '@testing-library/react';
import { ImageViewer } from '@/components/ImageViewer';
import type { Change, DrawingState } from '@/types/change';

const mockChanges: Change[] = [
  {
    id: '1',
    action: 'Move',
    elements: ['Wall'],
    direction: 'Left',
    fromValue: null,
    toValue: null,
    description: null,
    location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
    approved: false,
  },
];

describe('ImageViewer', () => {
  const defaultProps = {
    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    imageWidth: 800,
    imageHeight: 600,
    changes: mockChanges,
    hoveredChangeId: null,
    isDrawingMode: false,
    drawingState: null,
    onDrawComplete: jest.fn(),
  };

  it('should render image', () => {
    render(<ImageViewer {...defaultProps} />);

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', defaultProps.imageData);
  });

  it('should render canvas overlay', () => {
    render(<ImageViewer {...defaultProps} />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should show empty state when no image', () => {
    render(<ImageViewer {...defaultProps} imageData="" />);

    expect(screen.getByText(/no image loaded/i)).toBeInTheDocument();
  });

  it('should apply drawing mode cursor when enabled', () => {
    render(<ImageViewer {...defaultProps} isDrawingMode={true} />);

    const container = screen.getByTestId('image-viewer');
    expect(container).toHaveClass('cursor-crosshair');
  });

  describe('Drawing Mode', () => {
    const mockOnDrawComplete = jest.fn();
    const mockOnDrawingStateChange = jest.fn();

    const drawingProps = {
      ...defaultProps,
      isDrawingMode: true,
      onDrawComplete: mockOnDrawComplete,
      onDrawingStateChange: mockOnDrawingStateChange,
    };

    beforeEach(() => {
      mockOnDrawComplete.mockClear();
      mockOnDrawingStateChange.mockClear();
    });

    it('should start drawing on mousedown in drawing mode', () => {
      render(<ImageViewer {...drawingProps} />);

      const canvas = document.querySelector('canvas')!;
      // Mock getBoundingClientRect
      jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      expect(mockOnDrawingStateChange).toHaveBeenCalledWith({
        startX: 100,
        startY: 100,
        currentX: 100,
        currentY: 100,
      });
    });

    it('should update drawing state on mousemove during draw', () => {
      render(<ImageViewer {...drawingProps} />);

      const canvas = document.querySelector('canvas')!;
      jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Start drawing
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      mockOnDrawingStateChange.mockClear();

      // Move mouse
      fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 });

      expect(mockOnDrawingStateChange).toHaveBeenCalledWith({
        startX: 100,
        startY: 100,
        currentX: 200,
        currentY: 200,
      });
    });

    it('should call onDrawComplete on mouseup with valid box', () => {
      render(<ImageViewer {...drawingProps} />);

      const canvas = document.querySelector('canvas')!;
      jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Start drawing
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      // Move to create box >= 10px
      fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 });
      // Complete drawing
      fireEvent.mouseUp(canvas, { clientX: 200, clientY: 200 });

      expect(mockOnDrawComplete).toHaveBeenCalledWith({
        xmin: 100,
        ymin: 100,
        xmax: 200,
        ymax: 200,
      });
    });

    it('should not call onDrawComplete for boxes smaller than 10px', () => {
      render(<ImageViewer {...drawingProps} />);

      const canvas = document.querySelector('canvas')!;
      jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Start drawing
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      // Move less than 10px
      fireEvent.mouseMove(canvas, { clientX: 105, clientY: 105 });
      // Complete drawing
      fireEvent.mouseUp(canvas, { clientX: 105, clientY: 105 });

      expect(mockOnDrawComplete).not.toHaveBeenCalled();
    });

    it('should cancel drawing on mouse leave', () => {
      render(<ImageViewer {...drawingProps} />);

      const canvas = document.querySelector('canvas')!;
      jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Start drawing
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      mockOnDrawingStateChange.mockClear();

      // Leave canvas
      fireEvent.mouseLeave(canvas);

      expect(mockOnDrawingStateChange).toHaveBeenCalledWith(null);
    });

    it('should not start drawing when not in drawing mode', () => {
      render(<ImageViewer {...defaultProps} isDrawingMode={false} onDrawingStateChange={mockOnDrawingStateChange} />);

      const canvas = document.querySelector('canvas')!;
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      expect(mockOnDrawingStateChange).not.toHaveBeenCalled();
    });

    it('should handle drawing from bottom-right to top-left', () => {
      render(<ImageViewer {...drawingProps} />);

      const canvas = document.querySelector('canvas')!;
      jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Start drawing at bottom-right
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      // Move to top-left
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
      // Complete drawing
      fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100 });

      // Should normalize coordinates
      expect(mockOnDrawComplete).toHaveBeenCalledWith({
        xmin: 100,
        ymin: 100,
        xmax: 200,
        ymax: 200,
      });
    });
  });
});
