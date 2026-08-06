import { useState, useCallback } from 'react';
import { fileToDataUrl } from '../utils/imageUtils';

interface UseImageCropperOptions {
  aspectRatio?: number;
  outputSize?: { width: number; height: number };
}

interface UseImageCropperReturn {
  isOpen: boolean;
  imageUrl: string;
  openCropper: (file: File) => Promise<void>;
  openCropperWithUrl: (url: string) => void;
  closeCropper: () => void;
  handleSave: (croppedUrl: string, file: File) => void;
  croppedImageUrl: string | null;
  croppedFile: File | null;
  aspectRatio: number;
  outputSize?: { width: number; height: number };
}

export function useImageCropper(
  options: UseImageCropperOptions = {}
): UseImageCropperReturn {
  const { aspectRatio = 1, outputSize } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);

  const openCropper = useCallback(async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setImageUrl(dataUrl);
    setIsOpen(true);
  }, []);

  const openCropperWithUrl = useCallback((url: string) => {
    setImageUrl(url);
    setIsOpen(true);
  }, []);

  const closeCropper = useCallback(() => {
    setIsOpen(false);
    setImageUrl('');
  }, []);

  const handleSave = useCallback((croppedUrl: string, file: File) => {
    setCroppedImageUrl(croppedUrl);
    setCroppedFile(file);
    setIsOpen(false);
    setImageUrl('');
  }, []);

  return {
    isOpen,
    imageUrl,
    openCropper,
    openCropperWithUrl,
    closeCropper,
    handleSave,
    croppedImageUrl,
    croppedFile,
    aspectRatio,
    outputSize,
  };
}
