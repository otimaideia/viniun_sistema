import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MTChecklistDailyItem } from '@/types/checklist';
import { calculateElapsed, formatSeconds } from '@/hooks/multitenant/useChecklistTimerMT';
import { cn } from '@/lib/utils';

interface TaskTimerProps {
  item: MTChecklistDailyItem;
  onStart: (itemId: string) => void;
  onPause: (itemId: string, item: MTChecklistDailyItem) => void;
  onStop: (itemId: string, item: MTChecklistDailyItem) => void;
  disabled?: boolean;
}

export function TaskTimer({ item, onStart, onPause, onStop, disabled }: TaskTimerProps) {
  const [displaySeconds, setDisplaySeconds] = useState(() => calculateElapsed(item));

  // Atualizar display a cada segundo quando rodando
  useEffect(() => {
    if (item.timer_status !== 'running') {
      setDisplaySeconds(calculateElapsed(item));
      return;
    }

    setDisplaySeconds(calculateElapsed(item));
    const interval = setInterval(() => {
      setDisplaySeconds(calculateElapsed(item));
    }, 1000);

    return () => clearInterval(interval);
  }, [item.timer_status, item.timer_started_at, item.timer_elapsed_seconds]);

  const handleToggle = useCallback(() => {
    if (item.timer_status === 'running') {
      onPause(item.id, item);
    } else {
      onStart(item.id);
    }
  }, [item, onStart, onPause]);

  const handleStop = useCallback(() => {
    onStop(item.id, item);
  }, [item, onStop]);

  // Tempo planejado em segundos
  const plannedSeconds = (item.duracao_min || 0) * 60;

  // Cor do timer baseada no tempo
  const getTimerColor = () => {
    if (displaySeconds === 0) return 'text-muted-foreground';
    if (plannedSeconds === 0) return 'text-blue-600';
    const ratio = displaySeconds / plannedSeconds;
    if (ratio <= 1) return 'text-green-600';
    if (ratio <= 1.2) return 'text-amber-600';
    return 'text-red-600';
  };

  // Item já concluído/pulado — mostrar apenas tempo gasto
  if (item.status === 'concluido' || item.status === 'nao_feito' || item.status === 'pulado') {
    if (item.timer_elapsed_seconds > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('flex items-center gap-1 text-xs font-mono', getTimerColor())}>
                <Clock className="h-3 w-3" />
                <span>{formatSeconds(item.timer_elapsed_seconds)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tempo real: {formatSeconds(item.timer_elapsed_seconds)}</p>
              {plannedSeconds > 0 && <p>Planejado: {formatSeconds(plannedSeconds)}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  }

  const isRunning = item.timer_status === 'running';
  const isPaused = item.timer_status === 'paused';
  const hasStarted = isRunning || isPaused || displaySeconds > 0;

  return (
    <div className="flex items-center gap-1">
      {/* Botão Play/Pause */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7',
                isRunning && 'text-green-600 hover:text-green-700 bg-green-50',
                isPaused && 'text-amber-600 hover:text-amber-700 bg-amber-50',
              )}
              onClick={handleToggle}
              disabled={disabled}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isRunning ? 'Pausar timer' : isPaused ? 'Retomar timer' : 'Iniciar timer'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Display do tempo */}
      {hasStarted && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                'text-xs font-mono tabular-nums min-w-[48px]',
                getTimerColor(),
                isRunning && 'animate-pulse',
              )}>
                {formatSeconds(displaySeconds)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tempo real: {formatSeconds(displaySeconds)}</p>
              {plannedSeconds > 0 && (
                <p>Planejado: {formatSeconds(plannedSeconds)}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Botão Stop (só quando tem tempo acumulado e está pausado) */}
      {isPaused && displaySeconds > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                onClick={handleStop}
                disabled={disabled}
              >
                <Square className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Parar e salvar tempo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
