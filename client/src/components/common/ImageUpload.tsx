import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, Loader2, AlertCircle, Link } from 'lucide-react';
import { supabaseClient, STORAGE_BUCKET, getPublicUrl, isStorageAvailable } from '../../config/supabase';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  folder?: string;
  maxSizeMB?: number;
  className?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function ImageUpload({
  value = '',
  onChange,
  label,
  placeholder = 'Drag & drop an image or click to select',
  folder = 'uploads',
  maxSizeMB = 5,
  className = '',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(!isStorageAvailable());
  const [urlInput, setUrlInput] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload an image file (JPEG, PNG, GIF, or WebP)';
    }
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    if (!supabaseClient) {
      setError('Storage not configured. Use URL input instead.');
      setShowUrlInput(true);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const publicUrl = getPublicUrl(data.path);
      onChange(publicUrl);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [folder]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  // If there's a value, show the preview
  if (value) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
        )}
        <div className="relative group">
          <div className="relative bg-slate-700/50 border border-slate-600/50 rounded-xl p-3 flex items-center gap-3">
            <img
              src={value}
              alt="Uploaded"
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%23374151" width="64" height="64"/><text x="32" y="32" text-anchor="middle" dy=".3em" fill="%239CA3AF" font-size="12">Error</text></svg>';
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{value.split('/').pop()}</p>
              <p className="text-xs text-slate-500 truncate">{value}</p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Remove image"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      )}

      {/* Toggle between upload and URL input */}
      {isStorageAvailable() && (
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className={`text-xs px-2 py-1 rounded ${
              !showUrlInput ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className={`text-xs px-2 py-1 rounded ${
              showUrlInput ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            URL
          </button>
        </div>
      )}

      {showUrlInput ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-colors"
          >
            <Link size={18} />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative cursor-pointer
              border-2 border-dashed rounded-xl
              transition-all duration-200
              ${isDragging
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-slate-600/50 hover:border-slate-500 bg-slate-700/30 hover:bg-slate-700/50'
              }
              ${error ? 'border-red-500/50' : ''}
            `}
          >
            <div className="p-6 flex flex-col items-center text-center">
              {uploading ? (
                <>
                  <Loader2 size={32} className="text-primary-400 animate-spin mb-3" />
                  <p className="text-sm text-white mb-1">Uploading...</p>
                  <div className="w-full max-w-xs h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={`
                    p-3 rounded-xl mb-3
                    ${isDragging ? 'bg-primary-500/20' : 'bg-slate-700/50'}
                  `}>
                    {isDragging ? (
                      <Upload size={28} className="text-primary-400" />
                    ) : (
                      <Image size={28} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm text-white mb-1">{placeholder}</p>
                  <p className="text-xs text-slate-500">
                    JPEG, PNG, GIF or WebP up to {maxSizeMB}MB
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
