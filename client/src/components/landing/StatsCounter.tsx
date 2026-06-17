import { useEffect, useState, useRef } from 'react';
import { Trophy, Users, Gavel, Star } from 'lucide-react';

const stats = [
  { icon: Trophy, value: 500, suffix: '+', label: 'Auctions Completed', color: 'text-amber-400' },
  { icon: Users, value: 10000, suffix: '+', label: 'Players Auctioned', color: 'text-blue-400' },
  { icon: Gavel, value: 50000, suffix: '+', label: 'Total Bids Placed', color: 'text-green-400' },
  { icon: Star, value: 4.9, suffix: '', label: 'User Rating', color: 'text-purple-400', decimals: 1 }
];

function useCountUp(end: number, duration: number = 2000, decimals: number = 0) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = easeOutQuart * end;

      setCount(decimals > 0 ? parseFloat(currentValue.toFixed(decimals)) : Math.floor(currentValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasStarted, end, duration, decimals]);

  return { count, ref };
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
  }
  return num.toString();
}

export default function StatsCounter() {
  return (
    <section className="relative py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const { count, ref } = useCountUp(stat.value, 2500, stat.decimals || 0);

            return (
              <div
                key={stat.label}
                ref={ref}
                className="text-center group"
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className={`w-14 h-14 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${stat.color}`}>
                    <stat.icon size={28} />
                  </div>
                </div>

                {/* Value */}
                <div className={`text-4xl md:text-5xl font-bold mb-2 ${stat.color}`}>
                  {stat.decimals ? count.toFixed(stat.decimals) : formatNumber(count)}
                  <span className="text-3xl">{stat.suffix}</span>
                </div>

                {/* Label */}
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
