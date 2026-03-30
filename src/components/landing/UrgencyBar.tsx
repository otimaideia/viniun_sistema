import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface UrgencyBarProps {
  message?: string;
}

const UrgencyBar = ({ message }: UrgencyBarProps) => {
  const [spots, setSpots] = useState(47);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Countdown to midnight
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    // Decrease spots randomly
    const spotsInterval = setInterval(() => {
      setSpots((prev) => {
        if (prev > 15 && Math.random() > 0.7) {
          return prev - 1;
        }
        return prev;
      });
    }, 25000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(spotsInterval);
    };
  }, []);

  return (
    <div className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4">
        {message ? (
          <div className="flex items-center justify-center gap-2 text-center">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm md:text-base">{message}</span>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-bold text-lg">
                ATENÇÃO: Restam apenas <span className="text-2xl px-2 bg-white/20 rounded">{spots}</span> vagas para hoje
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Oferta encerra em:</span>
              <div className="flex gap-1">
                <span className="bg-white/20 px-2 py-1 rounded font-mono font-bold">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-white/20 px-2 py-1 rounded font-mono font-bold">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-white/20 px-2 py-1 rounded font-mono font-bold">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrgencyBar;
