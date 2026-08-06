import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';
import { detectImageTransparency, cropImage, dataUrlToFile } from '../../utils/imageUtils';

interface ImageCropperProps {
  isOpen: boolean;
  imageUrl: string;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for widescreen
  outputSize?: { width: number; height: number };
  onSave: (croppedImageUrl: string, file: File) => void;
  onClose: () => void;
  title?: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropper({
  isOpen,
  imageUrl,
  aspectRatio = 1,
  outputSize,
  onSave,
  onClose,
  title = 'Adjust Image',
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [hasTransparency, setHasTransparency] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'auto' | 'png' | 'jpeg'>('auto');
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Detect transparency on image load
  useEffect(() => {
    if (imageUrl) {
      detectImageTransparency(imageUrl).then(setHasTransparency);
    }
  }, [imageUrl]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const handleReset = () => {
    setScale(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;

    setSaving(true);
    try {
      // Calculate actual pixel crop based on scale
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      const pixelCrop = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
      };

      const croppedDataUrl = await cropImage(imageUrl, {
        crop: pixelCrop,
        outputWidth: outputSize?.width,
        outputHeight: outputSize?.height,
        outputFormat,
      });

      const file = dataUrlToFile(croppedDataUrl, 'cropped-image');
      onSave(croppedDataUrl, file);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-sm text-slate-400">
                Drag to reposition, scroll to zoom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Image Cropper */}
        <div className="p-6 overflow-auto max-h-[50vh]">
          <div
            className="relative bg-slate-800/50 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              // Checkerboard pattern for transparency
              backgroundImage: hasTransparency
                ? 'linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%)'
                : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              backgroundColor: hasTransparency ? '#1f2937' : '#1e293b',
            }}
          >
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center',
                  maxHeight: '400px',
                  maxWidth: '100%',
                }}
                className="transition-transform duration-200"
              />
            </ReactCrop>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-white/10 space-y-4">
          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleZoom(-0.5)}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Zoom out 50%"
            >
              <ZoomOut className="w-4 h-4" />
              <span className="text-sm">-5x</span>
            </button>
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg min-w-[100px] justify-center">
              <span className="text-white font-medium">{Math.round(scale * 100)}%</span>
            </div>

            <button
              onClick={() => handleZoom(0.1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(0.5)}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Zoom in 50%"
            >
              <ZoomIn className="w-4 h-4" />
              <span className="text-sm">+5x</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors ml-2"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Format Selection */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-slate-400">Format:</span>
            <div className="flex gap-2">
              {(['auto', 'png', 'jpeg'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setOutputFormat(format)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    outputFormat === format
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {format === 'auto' ? 'Auto' : format.toUpperCase()}
                  {format === 'auto' && hasTransparency && (
                    <span className="ml-1 text-xs opacity-75">(PNG)</span>
                  )}
                  {format === 'auto' && !hasTransparency && (
                    <span className="ml-1 text-xs opacity-75">(JPEG)</span>
                  )}
                </button>
              ))}
            </div>
            {hasTransparency && (
              <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">
                Transparency detected
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !completedCrop}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
