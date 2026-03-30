import { useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useYESiaVoice } from '@/hooks/multitenant/useYESiaVoice';

interface YESiaVoiceButtonProps {
  className?: string;
}

export function YESiaVoiceButton({ className }: YESiaVoiceButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const {
    status,
    error,
    transcripts,
    currentTranscript,
    isAISpeaking,
    isConnected,
    connect,
    disconnect,
  } = useYESiaVoice();

  const handleToggle = async () => {
    if (isConnected) {
      disconnect();
      setShowDialog(false);
    } else {
      setShowDialog(true);
      await connect();
    }
  };

  const handleClose = () => {
    disconnect();
    setShowDialog(false);
  };

  const statusText: Record<string, string> = {
    idle: 'Iniciar conversa por voz',
    connecting: 'Conectando...',
    connected: 'Ouvindo...',
    speaking: 'Você está falando...',
    listening: 'YESia está respondendo...',
    error: error || 'Erro na conexão',
  };

  return (
    <>
      <Button
        variant={isConnected ? 'default' : 'ghost'}
        size="icon"
        className={cn(
          'h-7 w-7 relative',
          isConnected && 'bg-green-600 hover:bg-green-700 text-white',
          className
        )}
        onClick={handleToggle}
        title={statusText[status]}
      >
        {status === 'connecting' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isConnected ? (
          <>
            <Mic className="h-3.5 w-3.5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          </>
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Conversa por Voz — YESia
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            {/* Voice visualization */}
            <div className={cn(
              'relative flex items-center justify-center w-24 h-24 rounded-full mb-4 transition-all duration-300',
              status === 'connecting' && 'bg-yellow-100',
              status === 'connected' && 'bg-green-100',
              status === 'speaking' && 'bg-blue-100 scale-110',
              status === 'listening' && 'bg-purple-100',
              status === 'error' && 'bg-red-100',
              status === 'idle' && 'bg-gray-100',
            )}>
              {/* Pulse rings when active */}
              {isConnected && (
                <>
                  <span className="absolute inset-0 rounded-full bg-current opacity-10 animate-ping" />
                  <span className="absolute inset-2 rounded-full bg-current opacity-5 animate-ping [animation-delay:150ms]" />
                </>
              )}

              {status === 'connecting' ? (
                <Loader2 className="h-10 w-10 text-yellow-600 animate-spin" />
              ) : status === 'error' ? (
                <MicOff className="h-10 w-10 text-red-600" />
              ) : isConnected ? (
                <Phone className="h-10 w-10 text-green-600" />
              ) : (
                <Mic className="h-10 w-10 text-gray-400" />
              )}
            </div>

            {/* Status text */}
            <p className={cn(
              'text-sm font-medium mb-1',
              status === 'error' && 'text-red-600',
              status === 'speaking' && 'text-blue-600',
              isAISpeaking && 'text-purple-600',
            )}>
              {statusText[status]}
            </p>

            {/* Current transcript (real-time) */}
            {currentTranscript && (
              <p className="text-xs text-muted-foreground italic max-w-[300px] text-center">
                "{currentTranscript}"
              </p>
            )}

            {/* Action button */}
            <Button
              variant={isConnected ? 'destructive' : 'default'}
              size="lg"
              className="mt-4"
              onClick={handleToggle}
              disabled={status === 'connecting'}
            >
              {status === 'connecting' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conectando...</>
              ) : isConnected ? (
                <><PhoneOff className="h-4 w-4 mr-2" /> Encerrar</>
              ) : (
                <><Phone className="h-4 w-4 mr-2" /> Iniciar Conversa</>
              )}
            </Button>

            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>

          {/* Transcript history */}
          {transcripts.length > 0 && (
            <ScrollArea className="h-40 border rounded-md p-3">
              <div className="space-y-2">
                {transcripts.map((t, i) => (
                  <div key={i} className={cn(
                    'text-xs p-2 rounded',
                    t.role === 'user' ? 'bg-blue-50 text-right' : 'bg-gray-50',
                  )}>
                    <span className="font-medium text-[10px] text-muted-foreground">
                      {t.role === 'user' ? 'Você' : 'YESia'}
                    </span>
                    <p>{t.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default YESiaVoiceButton;
