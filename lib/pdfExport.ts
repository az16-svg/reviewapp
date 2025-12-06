import jsPDF from 'jspdf';
import type { Page, BoundingBox } from '@/types/change';

/**
 * Detects image format from data URL
 */
function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  return 'PNG';
}

/**
 * Draws bounding boxes as vector graphics on the PDF
 */
function drawPdfBoundingBox(
  pdf: jsPDF,
  box: BoundingBox,
  scaleX: number,
  scaleY: number,
  offsetX: number,
  offsetY: number
) {
  const x = offsetX + box.xmin * scaleX;
  const y = offsetY + box.ymin * scaleY;
  const w = (box.xmax - box.xmin) * scaleX;
  const h = (box.ymax - box.ymin) * scaleY;

  // Draw stroke only (no fill to keep it simple and visible)
  pdf.setDrawColor(0, 128, 255);
  pdf.setLineWidth(3);
  pdf.rect(x, y, w, h, 'S');
}

interface PdfExportOptions {
  drawBoundingBoxes?: boolean;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Generates a PDF blob from pages with optional bounding boxes rendered as vectors
 */
export async function generatePdfBlob(
  pages: Page[],
  options: PdfExportOptions = {}
): Promise<Blob> {
  const { drawBoundingBoxes = false, onProgress } = options;
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [pages[0].imageWidth, pages[0].imageHeight],
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // Report progress
    onProgress?.(i + 1, pages.length);

    // Add new page for all but the first
    if (i > 0) {
      pdf.addPage([page.imageWidth, page.imageHeight], 'landscape');
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate scaling to fit page while maintaining aspect ratio
    const imgAspect = page.imageWidth / page.imageHeight;
    const pageAspect = pageWidth / pageHeight;

    let renderWidth: number;
    let renderHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > pageAspect) {
      renderWidth = pageWidth;
      renderHeight = pageWidth / imgAspect;
      offsetY = (pageHeight - renderHeight) / 2;
    } else {
      renderHeight = pageHeight;
      renderWidth = pageHeight * imgAspect;
      offsetX = (pageWidth - renderWidth) / 2;
    }

    // Add original image directly (preserves original compression)
    const format = getImageFormat(page.imageData);
    pdf.addImage(page.imageData, format, offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');

    // Draw bounding boxes as vector graphics (if enabled)
    if (drawBoundingBoxes) {
      const scaleX = renderWidth / page.imageWidth;
      const scaleY = renderHeight / page.imageHeight;

      page.changes.forEach((change) => {
        drawPdfBoundingBox(pdf, change.location, scaleX, scaleY, offsetX, offsetY);
      });
    }
  }

  return pdf.output('blob');
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports pages to PDF and triggers download
 */
export async function exportToPdf(
  pages: Page[],
  filename: string = 'change-review-export.pdf',
  options: PdfExportOptions = {}
): Promise<void> {
  const blob = await generatePdfBlob(pages, options);
  downloadBlob(blob, filename);
}
