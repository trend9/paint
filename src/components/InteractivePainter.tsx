import React, { useRef, useState, useEffect } from 'react';
import { Download, RotateCcw, Paintbrush, Circle, Sparkles, AlertCircle } from 'lucide-react';

interface InteractivePainterProps {
  imageUrl: string;
  title: string;
}

const PALETTE = [
  { name: 'いちごピンク', value: '#FF8DA1' },
  { name: 'あかぞうマン', value: '#FF4D4D' },
  { name: 'みかんオレンジ', value: '#FFA347' },
  { name: 'おひさまイエロー', value: '#FFE55C' },
  { name: 'もりもりグリーン', value: '#7CE682' },
  { name: 'めだかミント', value: '#6CE6C7' },
  { name: 'おそらのブルー', value: '#66B3FF' },
  { name: 'ぶどうバイオレット', value: '#C68DFF' },
  { name: 'くりいろブラウン', value: '#C08A5E' },
  { name: 'くろくまブラック', value: '#333333' }
];

const BRUSH_SIZES = [
  { name: 'ちいさい 🐱', size: 6 },
  { name: 'ふつう 🐻', size: 14 },
  { name: 'おおきい 🐘', size: 28 }
];

export default function InteractivePainter({ imageUrl, title }: InteractivePainterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState('#FF8DA1');
  const [brushSize, setBrushSize] = useState(14);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 500 });
  const [paintCount, setPaintCount] = useState(0);

  // Synchronize canvas dimensions with its container size on mount or resize
  useEffect(() => {
    function handleResize() {
      if (containerRef.current && canvasRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        // Keep 4:5 aspect ratio, capping height at 550px for viewport accessibility
        const computedWidth = Math.min(width, 450);
        const computedHeight = computedWidth * 1.25;
        
        // Save state
        setCanvasSize({ width: computedWidth, height: computedHeight });
        
        // Before sizing, save canvas contents in a temporary canvas to prevent wiping on redraw
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasRef.current.width;
        tempCanvas.height = canvasRef.current.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvasRef.current, 0, 0);
        }

        // Apply new sizing
        canvasRef.current.width = computedWidth;
        canvasRef.current.height = computedHeight;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Fill white background initially
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, computedWidth, computedHeight);
          // Redraw previous paint if exists
          ctx.drawImage(tempCanvas, 0, 0, computedWidth, computedHeight);
        }
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageUrl]); // Trigger re-size and re-init when page changes

  // Initialize white canvas background when size updates or page refreshes
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        setPaintCount(0);
      }
    }
  }, [imageUrl, canvasSize.width, canvasSize.height]);

  // Drawing mouse/touch triggers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale back coordinates correctly considering element size vs drawing buffer scaling
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setPaintCount(c => c + 1);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      setPaintCount(0);
    }
  };

  // Merge the user's canvas ink and the background line-art vector template into a final single JPG download!
  const handleSaveImage = () => {
    if (!canvasRef.current) return;
    
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = canvasRef.current.width * 2; // Double size for high-def resolution export
    mergedCanvas.height = canvasRef.current.height * 2;
    const ctx = mergedCanvas.getContext('2d');
    
    if (ctx) {
      // 1. Draw painting layer (scaled up)
      ctx.drawImage(canvasRef.current, 0, 0, mergedCanvas.width, mergedCanvas.height);
      
      // 2. Draw line art overlay
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => {
        // Draw image on top
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(img, 0, 0, mergedCanvas.width, mergedCanvas.height);
        
        // Export file trigger
        const link = document.createElement('a');
        link.download = `${title || 'ぬりえ'}_できあがり.png`;
        link.href = mergedCanvas.toDataURL('image/png');
        link.click();
      };
      
      // Handle server-cached or static CORS fallback (like local SVGs)
      if (imageUrl.startsWith('/')) {
        // Simple mock load in case of immediate caching
        img.src = window.location.origin + imageUrl;
      }
    }
  };

  return (
    <div className="bg-white rounded-[40px] shadow-2xl shadow-pink-100/70 border-8 border-white p-4 sm:p-8" id="digital-canvas-playground">
      <div className="text-center mb-6">
        <h3 className="text-xl font-black text-brand-dark flex items-center justify-center gap-2">
          <Sparkles className="text-brand-pink fill-brand-pink/20 w-5 h-5 animate-pulse" />
          ブラウザでそのまま色ぬり体験！
        </h3>
        <p className="text-xs text-gray-500 mt-1">印刷しなくても、スマホやタブレットで今すぐ色をぬってあそべるよ！</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Toolbox / Left hand controls */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-5 shadow-inner border border-gray-150 flex flex-col justify-between">
          <div>
            {/* Color section */}
            <div className="mb-4">
              <span className="text-xs font-black text-brand-dark block mb-3.5">🎨 パレット（えのぐ）</span>
              <div className="grid grid-cols-5 gap-2.5">
                {PALETTE.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setColor(item.value);
                      setTool('brush');
                    }}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform duration-250 relative ${
                      tool === 'brush' && color === item.value 
                        ? 'scale-110 border-brand-pink shadow-md ring-4 ring-pink-100/50' 
                        : 'border-gray-200/50 hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.value }}
                    title={item.name}
                  >
                    {tool === 'brush' && color === item.value && (
                      <div className="absolute inset-0 m-auto w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes section */}
            <div className="mb-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-black text-brand-dark block mb-2">✏️ ふでの太さ</span>
              <div className="flex flex-col gap-1.5 font-bold">
                {BRUSH_SIZES.map((sizeObj) => (
                  <button
                    key={sizeObj.size}
                    onClick={() => setBrushSize(sizeObj.size)}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-black rounded-2xl cursor-pointer transition-colors ${
                      brushSize === sizeObj.size
                        ? 'bg-pink-100/60 text-brand-pink border-2 border-pink-200/45'
                        : 'bg-gray-50 text-gray-550 hover:bg-gray-100/80'
                    }`}
                  >
                    <span>{sizeObj.name}</span>
                    <Circle 
                      className={`fill-current ${brushSize === sizeObj.size ? 'text-brand-pink' : 'text-gray-400'}`}
                      style={{ 
                        width: sizeObj.size === 6 ? 6 : sizeObj.size === 14 ? 12 : 20, 
                        height: sizeObj.size === 6 ? 6 : sizeObj.size === 14 ? 12 : 20 
                      }} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Eraser / Special tools */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-black text-brand-dark block mb-2">🧼 とくしゅツール</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-2xl cursor-pointer ${
                    tool === 'eraser'
                      ? 'bg-pink-100/60 text-brand-pink border-2 border-pink-200/40'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100/70'
                  }`}
                >
                  🧼 けしごむ
                </button>
                <button
                  onClick={() => setTool('brush')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-2xl cursor-pointer ${
                    tool === 'brush'
                      ? 'bg-pink-100/60 text-brand-pink border-2 border-pink-200/40'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100/70'
                  }`}
                >
                  🖌️ えのぐ
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <button
              onClick={clearCanvas}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              はじめからぬり直す
            </button>
          </div>
        </div>

        {/* Drawing Workspace Canvas Area */}
        <div className="lg:col-span-2 flex justify-center items-center">
          <div 
            ref={containerRef}
            className="w-full max-w-[450px] relative rounded-[32px] overflow-hidden shadow-2xl shadow-pink-50 border-4 border-white select-none touch-none aspect-[4/5]"
          >
            {/* The Drawing Canvas underlying the outline */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute top-0 left-0 cursor-crosshair z-0"
              style={{ width: '100%', height: '100%' }}
            />

            {/* This image handles multiplying blend effect, making white parts transparent overlaying lines */}
            <img
              src={imageUrl}
              alt=""
              className="absolute top-0 left-0 w-full h-full object-fill pointer-events-none z-10"
              style={{ mixBlendMode: 'multiply' }}
              referrerPolicy="no-referrer"
            />

            {paintCount === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 bg-white/20 pointer-events-none z-20 transition-opacity">
                <Paintbrush className="w-12 h-12 mb-2 animate-bounce text-brand-pink" />
                <p className="text-sm font-black text-brand-dark">ここをタッチして色をぬるよ！</p>
              </div>
            )}
          </div>
        </div>

        {/* Save & Tutorial Handout / Right panels */}
        <div className="lg:col-span-1 flex flex-col justify-between gap-4">
          <div className="bg-pink-50/10 border border-pink-100/40 rounded-3xl p-5 text-xs text-gray-600 leading-relaxed">
            <h4 className="font-black mb-2 flex items-center gap-1.5 text-brand-pink">
              <AlertCircle className="w-3.5 h-3.5" />
              ぬりえのあそびかた
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-500 font-medium">
              <li>左側のパレットからすきなえのぐ（色）を選びます。</li>
              <li>ふでの太さを選びます（ぞうさんはとっても太いよ！）。</li>
              <li>絵の上にタッチして滑らせると、きれいに色がぬれます。</li>
              <li>間違えたら <b>けしごむ</b> でポンポン消せます。</li>
              <li>できあがったら、「作品をダウンロード」で保存フォルダにイラストを残せます！</li>
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSaveImage}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-brand-pink hover:bg-[#ff7b8f] text-white rounded-full font-black shadow-lg shadow-pink-150 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <Download className="w-4 h-4" />
              できた作品を保存する
            </button>
            <p className="text-[10px] text-center text-gray-400 font-bold leading-relaxed">
              ※お子様のぬった作品がスマートフォンやPCに画像として保存されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
