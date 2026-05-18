import { useState, useRef, useEffect, memo, ImgHTMLAttributes } from 'react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  fallback?: string;
  placeholderClassName?: string;
}

/**
 * LazyImage component that uses IntersectionObserver to load images
 * only when they enter the viewport. This reduces initial page load
 * and saves bandwidth for off-screen images.
 */
function LazyImage({
  src,
  alt = '',
  className = '',
  fallback = '',
  placeholderClassName = '',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading slightly before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
  };

  const imageSrc = error && fallback ? fallback : (isInView ? src : undefined);

  return (
    <img
      ref={imgRef}
      src={imageSrc || undefined}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}

export default memo(LazyImage);
