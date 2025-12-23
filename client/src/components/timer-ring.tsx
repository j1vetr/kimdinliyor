interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
}

export function TimerRing({ timeLeft, totalTime, size = 80 }: TimerRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / totalTime) * circumference;
  const isUrgent = timeLeft <= 5;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={`text-2xl font-bold ${isUrgent ? "text-destructive animate-countdown-pulse" : ""}`}
          data-testid="text-timer"
        >
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
