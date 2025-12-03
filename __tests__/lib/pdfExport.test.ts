import { generatePdfBlob } from '@/lib/pdfExport';
import type { Page, Change } from '@/types/change';

// Mock jsPDF
const mockPdfInstance = {
  addImage: jest.fn(),
  addPage: jest.fn(),
  setDrawColor: jest.fn(),
  setLineWidth: jest.fn(),
  rect: jest.fn(),
  output: jest.fn().mockReturnValue(new Blob(['pdf content'], { type: 'application/pdf' })),
  internal: {
    pageSize: { getWidth: () => 800, getHeight: () => 600 },
  },
};

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => mockPdfInstance);
});

describe('pdfExport', () => {
  const mockChange: Change = {
    id: '1',
    action: 'Move',
    elements: ['Wall'],
    direction: 'Left',
    fromValue: null,
    toValue: null,
    description: null,
    location: { xmin: 100, ymin: 200, xmax: 300, ymax: 400 },
    approved: false,
  };

  const mockPage: Page = {
    id: 'page-1',
    name: 'Test Page',
    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    imageWidth: 800,
    imageHeight: 600,
    changes: [mockChange],
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePdfBlob', () => {
    it('should generate PDF blob from single page', async () => {
      const blob = await generatePdfBlob([mockPage]);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should generate PDF blob from multiple pages', async () => {
      const pages = [
        mockPage,
        { ...mockPage, id: 'page-2', name: 'Test Page 2' },
      ];
      const blob = await generatePdfBlob(pages);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should throw error when no pages provided', async () => {
      await expect(generatePdfBlob([])).rejects.toThrow('No pages to export');
    });

    it('should call progress callback if provided', async () => {
      const onProgress = jest.fn();
      await generatePdfBlob([mockPage], onProgress);
      expect(onProgress).toHaveBeenCalledWith(1, 1);
    });

    it('should call progress callback for each page', async () => {
      const onProgress = jest.fn();
      const pages = [
        mockPage,
        { ...mockPage, id: 'page-2', name: 'Test Page 2' },
        { ...mockPage, id: 'page-3', name: 'Test Page 3' },
      ];
      await generatePdfBlob(pages, onProgress);
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
    });

    it('should add image to PDF', async () => {
      await generatePdfBlob([mockPage]);
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should draw bounding boxes as vector graphics', async () => {
      await generatePdfBlob([mockPage]);
      expect(mockPdfInstance.setDrawColor).toHaveBeenCalledWith(0, 128, 255);
      expect(mockPdfInstance.setLineWidth).toHaveBeenCalledWith(3);
      expect(mockPdfInstance.rect).toHaveBeenCalled();
    });
  });
});
