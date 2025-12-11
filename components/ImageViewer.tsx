'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Change, BoundingBox, DrawingState } from '@/types/change';

// Resize handle types (including 'move' for dragging the entire box)
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

interface ResizeState {
  changeId: string;
  handle: ResizeHandle;
  originalBox: BoundingBox;
  currentBox: BoundingBox;
  startCoords?: { x: number; y: number }; // For tracking move offset
}

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
  onChangeLocationUpdate?: (changeId: string, newLocation: BoundingBox) => void;
  onBoxClick?: (changeId: string) => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  isMagnifierMode?: boolean;
}

// Bounding box colors
const COLORS = {
  approved: 'rgba(59, 130, 246, 0.7)',
  hoveredApproved: 'rgba(96, 165, 250, 0.8)',
  drawing: 'rgba(59, 130, 246, 0.5)',
  resizing: 'rgba(234, 88, 12, 0.8)', // Darker orange
};

const HANDLE_SIZE = 8; // Size of resize handles in pixels
const HANDLE_HIT_AREA = 12; // Hit area for detecting handle hover/click

// Generate animated hover color
function getAnimatedHoverColor(time: number): string {
  const cycle = (Math.sin(time * 0.005) + 1) / 2;
  const r = 255;
  const g = Math.round(165 + cycle * 90);
  const b = Math.round(cycle * 100);
  const alpha = 0.4 + cycle * 0.3;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Get cursor style for resize handle
function getCursorForHandle(handle: ResizeHandle): string {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'move':
      return 'move';
    default:
      return 'default';
  }
}

// Magnifier settings
const MAGNIFIER_SIZE = 300; // Diameter in pixels
const MAGNIFIER_ZOOM = 5; // 100% zoom (1:1 pixel view at 20% base zoom)

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
  onChangeLocationUpdate,
  onBoxClick,
  zoomLevel = 1,
  onZoomChange,
  isMagnifierMode = false,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle>(null);
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const displayWidth = imageWidth * zoomLevel;
  const displayHeight = imageHeight * zoomLevel;
  const scale = zoomLevel;

  // Get the box to use for a change (use resize preview if resizing)
  const getDisplayBox = useCallback(
    (change: Change): BoundingBox => {
      if (resizeState && resizeState.changeId === change.id) {
        return resizeState.currentBox;
      }
      return change.location;
    },
    [resizeState]
  );

  // Find which change's bounding box contains a point
  const getChangeAtPosition = useCallback(
    (x: number, y: number): Change | null => {
      // Check in reverse order to get topmost (last drawn) first
      for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];
        const { xmin, ymin, xmax, ymax } = change.location;
        if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
          return change;
        }
      }
      return null;
    },
    [changes]
  );

  // Detect which resize handle is at a given position
  const getHandleAtPosition = useCallback(
    (x: number, y: number, box: BoundingBox): ResizeHandle => {
      const hitArea = HANDLE_HIT_AREA / scale;
      const { xmin, ymin, xmax, ymax } = box;

      const nearLeft = Math.abs(x - xmin) < hitArea;
      const nearRight = Math.abs(x - xmax) < hitArea;
      const nearTop = Math.abs(y - ymin) < hitArea;
      const nearBottom = Math.abs(y - ymax) < hitArea;
      const inHorizontalRange = x >= xmin - hitArea && x <= xmax + hitArea;
      const inVerticalRange = y >= ymin - hitArea && y <= ymax + hitArea;

      // Corners first (higher priority)
      if (nearLeft && nearTop) return 'nw';
      if (nearRight && nearTop) return 'ne';
      if (nearLeft && nearBottom) return 'sw';
      if (nearRight && nearBottom) return 'se';

      // Edges
      if (nearTop && inHorizontalRange) return 'n';
      if (nearBottom && inHorizontalRange) return 's';
      if (nearLeft && inVerticalRange) return 'w';
      if (nearRight && inVerticalRange) return 'e';

      // Inside box = move
      if (x > xmin && x < xmax && y > ymin && y < ymax) return 'move';

      return null;
    },
    [scale]
  );

  // Pinch-to-zoom
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
        const zoomDelta = delta * 0.005;
        const newZoom = Math.min(4, Math.max(0.2, zoomLevel + zoomDelta));
        onZoomChange(newZoom);
        lastPinchDistanceRef.current = currentDistance;
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistanceRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onZoomChange, zoomLevel]);

  // Draw bounding boxes and resize handles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number | null = null;
    const hoveredChange = changes.find((c) => c.id === hoveredChangeId);
    const hasHoveredNonApproved = hoveredChange && !(hoveredChange.approved ?? false);

    const draw = (time: number = 0) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw approved boxes first
      changes
        .filter((c) => c.approved ?? false)
        .forEach((change) => {
          const box = getDisplayBox(change);
          const isAlsoHovered = hoveredChangeId === change.id;
          const isResizing = resizeState?.changeId === change.id;
          const color = isResizing
            ? COLORS.resizing
            : isAlsoHovered
              ? COLORS.hoveredApproved
              : COLORS.approved;
          drawBoundingBox(ctx, box, scale, color);

          // Draw resize handles for hovered change
          if (isAlsoHovered && !isDrawingMode) {
            drawResizeHandles(ctx, box, scale);
          }
        });

      // Draw hovered non-approved box with animation
      if (hasHoveredNonApproved && hoveredChange) {
        const box = getDisplayBox(hoveredChange);
        const isResizing = resizeState?.changeId === hoveredChange.id;
        const color = isResizing ? COLORS.resizing : getAnimatedHoverColor(time);
        drawBoundingBox(ctx, box, scale, color);

        // Draw resize handles
        if (!isDrawingMode) {
          drawResizeHandles(ctx, box, scale);
        }
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

      if (hasHoveredNonApproved || resizeState) {
        animationId = requestAnimationFrame(draw);
      }
    };

    if (hasHoveredNonApproved || resizeState) {
      animationId = requestAnimationFrame(draw);
    } else {
      draw(0);
    }

    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [changes, hoveredChangeId, displayWidth, displayHeight, scale, isDrawingMode, drawingState, resizeState, getDisplayBox]);

  // Draw magnifier
  useEffect(() => {
    if (!isMagnifierMode || !magnifierPos || !imageRef.current) return;

    const magnifierCanvas = magnifierCanvasRef.current;
    if (!magnifierCanvas) return;

    const ctx = magnifierCanvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const radius = MAGNIFIER_SIZE / 2;

    // Clear canvas
    ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

    // Create circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate source area from original image
    const sourceSize = MAGNIFIER_SIZE / (scale * MAGNIFIER_ZOOM);
    const sourceX = (magnifierPos.x / scale) - sourceSize / 2;
    const sourceY = (magnifierPos.y / scale) - sourceSize / 2;

    // Draw zoomed portion of image
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      MAGNIFIER_SIZE,
      MAGNIFIER_SIZE
    );

    ctx.restore();

    // Draw border
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Draw crosshair
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(radius, radius - 10);
    ctx.lineTo(radius, radius + 10);
    ctx.moveTo(radius - 10, radius);
    ctx.lineTo(radius + 10, radius);
    ctx.stroke();
  }, [isMagnifierMode, magnifierPos, scale]);

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
      const coords = getImageCoordinates(e);
      if (!coords) return;

      // Track mouse down position for click detection
      mouseDownPosRef.current = coords;

      // Check for resize handle or move on hovered change
      if (hoveredChangeId && !isDrawingMode && onChangeLocationUpdate) {
        const hoveredChange = changes.find((c) => c.id === hoveredChangeId);
        if (hoveredChange) {
          const handle = getHandleAtPosition(coords.x, coords.y, hoveredChange.location);
          if (handle) {
            e.preventDefault();
            setResizeState({
              changeId: hoveredChangeId,
              handle,
              originalBox: { ...hoveredChange.location },
              currentBox: { ...hoveredChange.location },
              startCoords: { x: coords.x, y: coords.y },
            });
            return;
          }
        }
      }

      // Otherwise, handle drawing mode
      if (!isDrawingMode) return;

      setIsDrawing(true);
      drawStartRef.current = coords;
      onDrawingStateChange?.({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
    },
    [isDrawingMode, getImageCoordinates, onDrawingStateChange, hoveredChangeId, changes, getHandleAtPosition, onChangeLocationUpdate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getImageCoordinates(e);
      if (!coords) return;

      // Always update magnifier position (so it's ready when mode is toggled on)
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setMagnifierPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }

      // Handle resizing or moving
      if (resizeState) {
        const { handle, originalBox, startCoords } = resizeState;
        const newBox = { ...originalBox };

        // Update box based on which handle is being dragged
        switch (handle) {
          case 'nw':
            newBox.xmin = Math.min(coords.x, originalBox.xmax - 10);
            newBox.ymin = Math.min(coords.y, originalBox.ymax - 10);
            break;
          case 'n':
            newBox.ymin = Math.min(coords.y, originalBox.ymax - 10);
            break;
          case 'ne':
            newBox.xmax = Math.max(coords.x, originalBox.xmin + 10);
            newBox.ymin = Math.min(coords.y, originalBox.ymax - 10);
            break;
          case 'e':
            newBox.xmax = Math.max(coords.x, originalBox.xmin + 10);
            break;
          case 'se':
            newBox.xmax = Math.max(coords.x, originalBox.xmin + 10);
            newBox.ymax = Math.max(coords.y, originalBox.ymin + 10);
            break;
          case 's':
            newBox.ymax = Math.max(coords.y, originalBox.ymin + 10);
            break;
          case 'sw':
            newBox.xmin = Math.min(coords.x, originalBox.xmax - 10);
            newBox.ymax = Math.max(coords.y, originalBox.ymin + 10);
            break;
          case 'w':
            newBox.xmin = Math.min(coords.x, originalBox.xmax - 10);
            break;
          case 'move':
            if (startCoords) {
              const dx = coords.x - startCoords.x;
              const dy = coords.y - startCoords.y;
              newBox.xmin = originalBox.xmin + dx;
              newBox.xmax = originalBox.xmax + dx;
              newBox.ymin = originalBox.ymin + dy;
              newBox.ymax = originalBox.ymax + dy;
            }
            break;
        }

        setResizeState((prev) => (prev ? { ...prev, currentBox: newBox } : null));
        return;
      }

      // Check for handle hover on hovered change
      if (hoveredChangeId && !isDrawingMode && !isDrawing) {
        const hoveredChange = changes.find((c) => c.id === hoveredChangeId);
        if (hoveredChange) {
          const handle = getHandleAtPosition(coords.x, coords.y, hoveredChange.location);
          setHoveredHandle(handle);
        }
      } else {
        setHoveredHandle(null);
      }

      // Handle drawing
      if (!isDrawingMode || !isDrawing || !drawStartRef.current) return;

      onDrawingStateChange?.({
        startX: drawStartRef.current.x,
        startY: drawStartRef.current.y,
        currentX: coords.x,
        currentY: coords.y,
      });
    },
    [isDrawingMode, isDrawing, getImageCoordinates, onDrawingStateChange, resizeState, hoveredChangeId, changes, getHandleAtPosition]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const coords = getImageCoordinates(e);
      const clickThreshold = 5; // pixels - if mouse moved less than this, it's a click

      // Check if this was a click (minimal movement)
      const wasClick =
        coords &&
        mouseDownPosRef.current &&
        Math.abs(coords.x - mouseDownPosRef.current.x) < clickThreshold &&
        Math.abs(coords.y - mouseDownPosRef.current.y) < clickThreshold;

      // Commit resize
      if (resizeState && onChangeLocationUpdate) {
        onChangeLocationUpdate(resizeState.changeId, resizeState.currentBox);
        setResizeState(null);
        mouseDownPosRef.current = null;
        return;
      }

      // Handle click on bounding box (only when not in drawing mode)
      if (wasClick && !isDrawingMode && coords && onBoxClick) {
        const clickedChange = getChangeAtPosition(coords.x, coords.y);
        if (clickedChange) {
          onBoxClick(clickedChange.id);
          mouseDownPosRef.current = null;
          return;
        }
      }

      // Handle drawing completion
      if (!isDrawingMode || !isDrawing || !drawStartRef.current) {
        mouseDownPosRef.current = null;
        return;
      }

      if (!coords) {
        mouseDownPosRef.current = null;
        return;
      }

      setIsDrawing(false);

      const box: BoundingBox = {
        xmin: Math.min(drawStartRef.current.x, coords.x),
        ymin: Math.min(drawStartRef.current.y, coords.y),
        xmax: Math.max(drawStartRef.current.x, coords.x),
        ymax: Math.max(drawStartRef.current.y, coords.y),
      };

      if (box.xmax - box.xmin >= 10 && box.ymax - box.ymin >= 10) {
        onDrawComplete(box);
      }

      drawStartRef.current = null;
      mouseDownPosRef.current = null;
      onDrawingStateChange?.(null);
    },
    [isDrawingMode, isDrawing, getImageCoordinates, onDrawComplete, onDrawingStateChange, resizeState, onChangeLocationUpdate, onBoxClick, getChangeAtPosition]
  );

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      drawStartRef.current = null;
      onDrawingStateChange?.(null);
    }
    if (resizeState && onChangeLocationUpdate) {
      // Commit resize on mouse leave
      onChangeLocationUpdate(resizeState.changeId, resizeState.currentBox);
      setResizeState(null);
    }
    setHoveredHandle(null);
    setMagnifierPos(null);
  }, [isDrawing, onDrawingStateChange, resizeState, onChangeLocationUpdate]);

  // Determine cursor
  const getCursor = () => {
    if (isMagnifierMode) return 'none';
    if (isDrawingMode) return 'crosshair';
    if (resizeState) return getCursorForHandle(resizeState.handle);
    if (hoveredHandle) return getCursorForHandle(hoveredHandle);
    return 'default';
  };

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
      className="relative inline-block"
      style={{ width: displayWidth, height: displayHeight, touchAction: 'none', cursor: getCursor() }}
    >
      <img
        ref={imageRef}
        src={imageData}
        alt="Overlay"
        width={displayWidth}
        height={displayHeight}
        className="block"
        draggable={false}
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        width={displayWidth}
        height={displayHeight}
        className="absolute top-0 left-0 pointer-events-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {/* Magnifier overlay */}
      {isMagnifierMode && magnifierPos && (
        <canvas
          ref={magnifierCanvasRef}
          width={MAGNIFIER_SIZE}
          height={MAGNIFIER_SIZE}
          className="absolute pointer-events-none"
          style={{
            left: magnifierPos.x - MAGNIFIER_SIZE / 2,
            top: magnifierPos.y - MAGNIFIER_SIZE / 2,
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        />
      )}
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

  ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.15)');
  ctx.fillRect(x, y, w, h);
}

function drawResizeHandles(ctx: CanvasRenderingContext2D, box: BoundingBox, scale: number) {
  const x = box.xmin * scale;
  const y = box.ymin * scale;
  const w = (box.xmax - box.xmin) * scale;
  const h = (box.ymax - box.ymin) * scale;

  const handleSize = HANDLE_SIZE;
  const halfHandle = handleSize / 2;

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  // Corner handles
  const corners = [
    { x: x, y: y }, // nw
    { x: x + w, y: y }, // ne
    { x: x, y: y + h }, // sw
    { x: x + w, y: y + h }, // se
  ];

  corners.forEach((corner) => {
    ctx.fillRect(corner.x - halfHandle, corner.y - halfHandle, handleSize, handleSize);
    ctx.strokeRect(corner.x - halfHandle, corner.y - halfHandle, handleSize, handleSize);
  });

  // Edge handles (midpoints)
  const edges = [
    { x: x + w / 2, y: y }, // n
    { x: x + w / 2, y: y + h }, // s
    { x: x, y: y + h / 2 }, // w
    { x: x + w, y: y + h / 2 }, // e
  ];

  edges.forEach((edge) => {
    ctx.fillRect(edge.x - halfHandle, edge.y - halfHandle, handleSize, handleSize);
    ctx.strokeRect(edge.x - halfHandle, edge.y - halfHandle, handleSize, handleSize);
  });
}
