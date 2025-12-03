'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Change, BoundingBox, DrawingState } from '@/types/change';

interface ImageViewerProps {
  imageData: string;
  imageWidth: number;
  imageHeight: number;
  changes: Change[];
  hoveredChangeId: string | null;
  isDrawingMode: boolean;
  drawingState: DrawingState | null;
  onDrawComplete: (box: BoundingBox) => void;
  onDrawingStateChange?: (state: DrawingState | null) => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

// Bounding box colors
const COLORS = {
  approved: 'rgba(59, 130, 246, 0.7)',      // Light blue for approved
  hoveredApproved: 'rgba(96, 165, 250, 0.8)', // Lighter blue for hovered+approved
  drawing: 'rgba(59, 130, 246, 0.5)',       // Blue for drawing preview
};

// Generate animated hover color (cycles between orange and yellow)
function getAnimatedHoverColor(time: number): string {
  const cycle = (Math.sin(time * 0.005) + 1) / 2; // 0 to 1, ~1.25s cycle
  const r = 255;
  const g = Math.round(165 + cycle * 90); // 165 to 255
  const b = Math.round(cycle * 100); // 0 to 100
  const alpha = 0.4 + cycle * 0.3; // 0.4 to 0.7
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ImageViewer({
  imageData,
  imageWidth,
  imageHeight,
  changes,
  hoveredChangeId,
  isDrawingMode,
  drawingState,
  onDrawComplete,
  onDrawingStateChange,
  zoomLevel = 1,
  onZoomChange,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);

  // Calculate display size based on zoom level
  const displayWidth = imageWidth * zoomLevel;
  const displayHeight = imageHeight * zoomLevel;

  // Scale factor for drawing coordinates (zoom level)
  const scale = zoomLevel;

  // Pinch-to-zoom using native event listeners (passive: false required to preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onZoomChange) return;

    const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = currentDistance - lastPinchDistanceRef.current;

        // Scale the zoom change (adjust sensitivity)
        const zoomDelta = delta * 0.005;
        const newZoom = Math.min(4, Math.max(0.2, zoomLevel + zoomDelta));

        onZoomChange(newZoom);
        lastPinchDistanceRef.current = currentDistance;
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistanceRef.current = null;
    };

    // Use passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onZoomChange, zoomLevel]);

  // Draw bounding boxes on canvas with animation for hovered items
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number | null = null;
    const hoveredChange = changes.find((c) => c.id === hoveredChangeId);
    const hasHoveredNonApproved = hoveredChange && !(hoveredChange.approved ?? false);

    const draw = (time: number = 0) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw approved boxes first (so hovered appears on top)
      changes.filter((c) => c.approved ?? false).forEach((change) => {
        const isAlsoHovered = hoveredChangeId === change.id;
        drawBoundingBox(ctx, change.location, scale, isAlsoHovered ? COLORS.hoveredApproved : COLORS.approved);
      });

      // Draw hovered box with animation (if not already drawn as approved)
      if (hasHoveredNonApproved && hoveredChange) {
        const animatedColor = getAnimatedHoverColor(time);
        drawBoundingBox(ctx, hoveredChange.location, scale, animatedColor);
      }

      // Draw current drawing preview
      if (isDrawingMode && drawingState) {
        const box: BoundingBox = {
          xmin: Math.min(drawingState.startX, drawingState.currentX),
          ymin: Math.min(drawingState.startY, drawingState.currentY),
          xmax: Math.max(drawingState.startX, drawingState.currentX),
          ymax: Math.max(drawingState.startY, drawingState.currentY),
        };
        drawBoundingBox(ctx, box, scale, COLORS.drawing, true);
      }

      // Continue animation if we have a hovered non-approved item
      if (hasHoveredNonApproved) {
        animationId = requestAnimationFrame(draw);
      }
    };

    // Start drawing
    if (hasHoveredNonApproved) {
      animationId = requestAnimationFrame(draw);
    } else {
      draw(0);
    }

    // Cleanup animation on unmount or dependency change
    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [changes, hoveredChangeId, displayWidth, displayHeight, scale, isDrawingMode, drawingState]);

  // Drawing handlers
  const getImageCoordinates = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      return { x: Math.round(x), y: Math.round(y) };
    },
    [scale]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingMode) return;

      const coords = getImageCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      drawStartRef.current = coords;
      onDrawingStateChange?.({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
    },
    [isDrawingMode, getImageCoordinates, onDrawingStateChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingMode || !isDrawing || !drawStartRef.current) return;

      const coords = getImageCoordinates(e);
      if (!coords) return;

      onDrawingStateChange?.({
        startX: drawStartRef.current.x,
        startY: drawStartRef.current.y,
        currentX: coords.x,
        currentY: coords.y,
      });
    },
    [isDrawingMode, isDrawing, getImageCoordinates, onDrawingStateChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingMode || !isDrawing || !drawStartRef.current) return;

      const coords = getImageCoordinates(e);
      if (!coords) return;

      setIsDrawing(false);

      const box: BoundingBox = {
        xmin: Math.min(drawStartRef.current.x, coords.x),
        ymin: Math.min(drawStartRef.current.y, coords.y),
        xmax: Math.max(drawStartRef.current.x, coords.x),
        ymax: Math.max(drawStartRef.current.y, coords.y),
      };

      // Check minimum size (10px)
      if (box.xmax - box.xmin >= 10 && box.ymax - box.ymin >= 10) {
        onDrawComplete(box);
      }

      drawStartRef.current = null;
      onDrawingStateChange?.(null);
    },
    [isDrawingMode, isDrawing, getImageCoordinates, onDrawComplete, onDrawingStateChange]
  );

  if (!imageData) {
    return (
      <div
        data-testid="image-viewer"
        className="flex items-center justify-center h-64 bg-gray-100 rounded-lg text-gray-500"
      >
        No image loaded
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="image-viewer"
      className={`relative inline-block ${isDrawingMode ? 'cursor-crosshair' : ''}`}
      style={{ width: displayWidth, height: displayHeight, touchAction: 'none' }}
    >
      <img
        src={imageData}
        alt="Overlay"
        width={displayWidth}
        height={displayHeight}
        className="block"
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        width={displayWidth}
        height={displayHeight}
        className="absolute top-0 left-0 pointer-events-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing) {
            setIsDrawing(false);
            drawStartRef.current = null;
            onDrawingStateChange?.(null);
          }
        }}
      />
    </div>
  );
}

function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  box: BoundingBox,
  scale: number,
  color: string,
  dashed: boolean = false
) {
  const x = box.xmin * scale;
  const y = box.ymin * scale;
  const w = (box.xmax - box.xmin) * scale;
  const h = (box.ymax - box.ymin) * scale;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (dashed) {
    ctx.setLineDash([6, 4]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.strokeRect(x, y, w, h);

  // Fill with transparent color
  ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.15)');
  ctx.fillRect(x, y, w, h);
}
