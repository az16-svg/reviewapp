import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadForm } from '@/components/UploadForm';

describe('UploadForm', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('should render file inputs for JSON and image', () => {
    render(<UploadForm onUpload={mockOnUpload} />);

    expect(screen.getByLabelText(/json file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/image file/i)).toBeInTheDocument();
  });

  it('should show error for invalid JSON', async () => {
    render(<UploadForm onUpload={mockOnUpload} />);

    const jsonInput = screen.getByLabelText(/json file/i);
    const invalidFile = new File(['{ invalid json }'], 'test.json', { type: 'application/json' });

    fireEvent.change(jsonInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
    });
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('should disable inputs when disabled prop is true', () => {
    render(<UploadForm onUpload={mockOnUpload} disabled />);

    expect(screen.getByLabelText(/json file/i)).toBeDisabled();
    expect(screen.getByLabelText(/image file/i)).toBeDisabled();
  });

  it('should accept valid JSON file', async () => {
    render(<UploadForm onUpload={mockOnUpload} />);

    const jsonInput = screen.getByLabelText(/json file/i);
    const validJson = JSON.stringify({
      changes: [{
        action: 'Move',
        elements: ['Wall'],
        direction: 'left',
        value: null,
        location: { xmin: 0, ymin: 0, xmax: 100, ymax: 100 }
      }]
    });
    const validFile = new File([validJson], 'test.json', { type: 'application/json' });

    // Mock file.text() method
    Object.defineProperty(validFile, 'text', {
      value: () => Promise.resolve(validJson),
    });

    fireEvent.change(jsonInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/loaded 1 changes/i)).toBeInTheDocument();
    });
  });
});
