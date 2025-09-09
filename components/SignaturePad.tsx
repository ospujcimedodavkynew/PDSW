import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';

export interface SignaturePadRef {
  isEmpty: () => boolean;
  clear: () => void;
  toDataURL: () => string | undefined;
}

const SignaturePad = forwardRef<SignaturePadRef>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  const getCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not found');
    return canvas;
  }
  
  const getContext = () => {
    const ctx = getCanvas().getContext('2d');
    if (!ctx) throw new Error('2D context not found');
    return ctx;
  }

  const resizeCanvas = () => {
    const canvas = getCanvas();
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = 200; // Fixed height
    }
  };

  useEffect(() => {
    const ctx = getContext();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getEventPos = (e: MouseEvent | TouchEvent) => {
    const canvas = getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (e instanceof MouseEvent) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    if (e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return null;
  };
  
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pos = getEventPos(e.nativeEvent);
    if (pos) {
      lastPos.current = pos;
    }
  };
  
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const pos = getEventPos(e.nativeEvent);
    if (pos && lastPos.current) {
      const ctx = getContext();
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clearPad = () => {
    const canvas = getCanvas();
    const ctx = getContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => {
      const canvas = getCanvas();
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      return canvas.toDataURL() === blank.toDataURL();
    },
    clear: clearPad,
    toDataURL: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return undefined;
    }
  }));

  return (
    <div className="relative w-full h-auto touch-none bg-gray-100">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button
        type="button"
        onClick={clearPad}
        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-200"
        aria-label="Smazat podpis"
      >
        <RefreshCw className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
});

export default SignaturePad;
