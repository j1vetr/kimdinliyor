interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
}

export function TimerRing({ timeLeft, totalTime, size = 120 }: TimerRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / totalTime) * circumference;
  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  return (
    <div 
      className={`relative ${isCritical ? "animate-pulse" : ""}`} 
      style={{ width: size, height: size }}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
            <stop offset="100%" stopColor={isUrgent ? "hsl(0 84% 40%)" : "hsl(var(--primary) / 0.6)"} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
          opacity="0.3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 linear"
          filter={isUrgent ? "url(#glow)" : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className={`text-4xl font-bold tabular-nums ${
            isCritical 
              ? "text-destructive scale-110" 
              : isUrgent 
                ? "text-destructive" 
                : "text-foreground"
          } transition-all duration-300`}
          data-testid="text-timer"
        >
          {timeLeft}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">saniye</span>
      </div>
    </div>
  );
}
