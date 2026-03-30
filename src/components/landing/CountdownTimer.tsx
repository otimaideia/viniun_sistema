import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate?: Date;
  daysToAdd?: number;
  className?: string;
  variant?: "default" | "large" | "compact";
}

const CountdownTimer = ({ 
  targetDate, 
  daysToAdd = 20, // Alterado para 20 dias
  className = "",
  variant = "default"
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const endDate = targetDate || new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, daysToAdd]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1 text-sm font-mono ${className}`}>
        <span>{formatNumber(timeLeft.days)}d</span>
        <span>{formatNumber(timeLeft.hours)}h</span>
        <span>{formatNumber(timeLeft.minutes)}m</span>
        <span>{formatNumber(timeLeft.seconds)}s</span>
      </div>
    );
  }

  if (variant === "large") {
    return (
      <div className={`flex items-center justify-center gap-2 md:gap-4 ${className}`}>
        <TimeBlock value={timeLeft.days} label="DIAS" large />
        <Separator />
        <TimeBlock value={timeLeft.hours} label="HORAS" large />
        <Separator />
        <TimeBlock value={timeLeft.minutes} label="MIN" large />
        <Separator />
        <TimeBlock value={timeLeft.seconds} label="SEG" large />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <TimeBlock value={timeLeft.days} label="dias" />
      <Separator />
      <TimeBlock value={timeLeft.hours} label="horas" />
      <Separator />
      <TimeBlock value={timeLeft.minutes} label="min" />
      <Separator />
      <TimeBlock value={timeLeft.seconds} label="seg" />
    </div>
  );
};

const TimeBlock = ({ 
  value, 
  label, 
  large = false 
}: { 
  value: number; 
  label: string; 
  large?: boolean;
}) => (
  <div className="flex flex-col items-center">
    <span 
      className={`font-bold ${
        large 
          ? "text-3xl md:text-5xl bg-white/20 backdrop-blur-sm px-3 md:px-4 py-2 rounded-lg" 
          : "text-xl md:text-2xl"
      }`}
    >
      {value.toString().padStart(2, "0")}
    </span>
    <span className={`${large ? "text-xs md:text-sm mt-1" : "text-xs"} opacity-80`}>
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span className="text-xl md:text-2xl font-bold opacity-60">:</span>
);

export default CountdownTimer;
