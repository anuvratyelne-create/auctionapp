import { useState, useEffect, useRef } from 'react';
import { formatIndianNumber } from '../../utils/formatters';

interface AnimatedBidAmountProps {
  value: number;
  duration?: number;
  className?: string;
}

export default function AnimatedBidAmount({
  value,
  duration = 500,
  className = ''
}: AnimatedBidAmountProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    // If value changed, animate
    if (value !== previousValue.current) {
      const startValue = previousValue.current;
      const endValue = value;
      const diff = endValue - startValue;
      const startTime = Date.now();

      setIsAnimating(true);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function - easeOutCubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.round(startValue + diff * eased);
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      previousValue.current = value;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span
      className={`
        ${className}
        ${isAnimating ? 'bid-animate-pulse scale-105' : ''}
        transition-transform duration-200
      `}
    >
      {formatIndianNumber(displayValue)}
    </span>
  );
}
