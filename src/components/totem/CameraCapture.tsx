import { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, X, RefreshCw, Settings, MapPin } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel?: () => void;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasGetUserMedia, setHasGetUserMedia] = useState(true);
  const [waitingTooLong, setWaitingTooLong] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('unknown');
  const [locationPermission, setLocationPermission] = useState<PermissionState>('unknown');
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verificar estado das permissões
  const checkPermissions = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const [camPerm, locPerm] = await Promise.allSettled([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'geolocation' as PermissionName }),
        ]);

        if (camPerm.status === 'fulfilled') {
          setCameraPermission(camPerm.value.state as PermissionState);
          // Escutar mudanças de permissão
          camPerm.value.onchange = () => {
            setCameraPermission(camPerm.value.state as PermissionState);
            if (camPerm.value.state === 'granted') {
              setShowPermissionGuide(false);
              startCamera();
            }
          };
        }

        if (locPerm.status === 'fulfilled') {
          setLocationPermission(locPerm.value.state as PermissionState);
          locPerm.value.onchange = () => {
            setLocationPermission(locPerm.value.state as PermissionState);
          };
        }
      }
    } catch {
      // Permissions API não suportada
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setWaitingTooLong(false);
      setShowPermissionGuide(false);

      // Timer: se demorar mais de 5s, mostrar botão de retry
      timeoutRef.current = setTimeout(() => {
        setWaitingTooLong(true);
      }, 5000);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      // Cancelar timer se câmera carregou
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setWaitingTooLong(false);
      setCameraPermission('granted');

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }

      // Solicitar localização em background (para estar pronta no registro)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationPermission('granted'),
          () => {},
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      }
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setWaitingTooLong(false);

      console.error('[CameraCapture] Erro ao acessar camera:', err);
      const errName = (err as DOMException).name;

      if (errName === 'NotAllowedError') {
        setCameraPermission('denied');
        setShowPermissionGuide(true);
        setError('Camera bloqueada pelo navegador.');
      } else if (errName === 'NotFoundError') {
        setError('Nenhuma camera encontrada neste dispositivo.');
        setHasGetUserMedia(false);
      } else if (errName === 'NotReadableError') {
        setError('Camera em uso por outro aplicativo. Feche outros apps e tente novamente.');
      } else {
        setError('Erro ao acessar a camera. Tente novamente.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const retryCamera = useCallback(() => {
    stopCamera();
    setError(null);
    setHasGetUserMedia(true);
    setShowPermissionGuide(false);
    startCamera();
  }, [stopCamera, startCamera]);

  useEffect(() => {
    checkPermissions();
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasGetUserMedia(false);
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera, checkPermissions]);

  // Re-check permissions quando a aba volta ao foco (usuario pode ter alterado nas configs)
  useEffect(() => {
    const handleFocus = () => {
      checkPermissions();
      // Se a camera estava negada e agora está granted, tentar novamente
      if (cameraPermission === 'denied' && !isStreaming) {
        setTimeout(() => {
          if (!streamRef.current) {
            startCamera();
          }
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkPermissions, cameraPermission, isStreaming, startCamera]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontal (selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(base64);
    stopCamera();
  }, [stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  // Fallback: input file
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Guia de permissões
  const PermissionGuide = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left space-y-3">
        <div className="flex items-center gap-2 text-amber-700 font-semibold">
          <Settings className="h-5 w-5" />
          <span>Como liberar a camera:</span>
        </div>

        {isIOS && isSafari && (
          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
            <li>Abra <strong>Ajustes</strong> do iPhone</li>
            <li>Role ate <strong>Safari</strong></li>
            <li>Toque em <strong>Camera</strong></li>
            <li>Selecione <strong>Permitir</strong></li>
            <li>Volte aqui e recarregue a pagina</li>
          </ol>
        )}

        {isIOS && isChrome && (
          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
            <li>Abra <strong>Ajustes</strong> do iPhone</li>
            <li>Role ate <strong>Chrome</strong></li>
            <li>Ative <strong>Camera</strong></li>
            <li>Volte aqui e recarregue a pagina</li>
          </ol>
        )}

        {isAndroid && (
          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
            <li>Toque no <strong>cadeado</strong> (ou icone) na barra de endereco</li>
            <li>Toque em <strong>Permissoes</strong> ou <strong>Configuracoes do site</strong></li>
            <li>Ative <strong>Camera</strong> e <strong>Localizacao</strong></li>
            <li>Toque no botao abaixo para tentar novamente</li>
          </ol>
        )}

        {!isIOS && !isAndroid && (
          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
            <li>Clique no <strong>cadeado</strong> na barra de endereco</li>
            <li>Clique em <strong>Configuracoes do site</strong></li>
            <li>Mude <strong>Camera</strong> para <strong>Permitir</strong></li>
            <li>Mude <strong>Localizacao</strong> para <strong>Permitir</strong></li>
            <li>Recarregue a pagina</li>
          </ol>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recarregar Pagina
          </Button>
        </div>
      </div>
    );
  };

  // Status das permissões
  const PermissionStatus = () => (
    <div className="flex items-center justify-center gap-4 text-xs">
      <span className={`flex items-center gap-1 ${cameraPermission === 'granted' ? 'text-green-600' : cameraPermission === 'denied' ? 'text-red-500' : 'text-gray-400'}`}>
        <Camera className="h-3 w-3" />
        Camera: {cameraPermission === 'granted' ? 'OK' : cameraPermission === 'denied' ? 'Bloqueada' : 'Pendente'}
      </span>
      <span className={`flex items-center gap-1 ${locationPermission === 'granted' ? 'text-green-600' : locationPermission === 'denied' ? 'text-red-500' : 'text-gray-400'}`}>
        <MapPin className="h-3 w-3" />
        GPS: {locationPermission === 'granted' ? 'OK' : locationPermission === 'denied' ? 'Bloqueado' : 'Pendente'}
      </span>
    </div>
  );

  // Imagem capturada — mostrar preview
  if (capturedImage) {
    return (
      <Card className="bg-white/95 backdrop-blur shadow-xl">
        <CardContent className="p-4">
          <div className="relative rounded-lg overflow-hidden mb-4">
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full aspect-[4/3] object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetake}
              className="h-12"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Tirar outra
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              className="h-12 bg-green-500 hover:bg-green-600 text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Usar foto
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Erro ou sem getUserMedia — fallback + guia de permissões
  if (!hasGetUserMedia || error) {
    return (
      <Card className="bg-white/95 backdrop-blur shadow-xl">
        <CardContent className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-500 text-center font-medium">{error}</p>
          )}

          {/* Guia de permissões quando bloqueado */}
          {showPermissionGuide && <PermissionGuide />}

          {/* Status das permissões */}
          <PermissionStatus />

          {/* Botão de retry */}
          <Button
            size="lg"
            onClick={retryCamera}
            className="w-full h-14 text-lg bg-[#662E8E] hover:bg-[#4a2268]"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Tentar Camera Novamente
          </Button>

          {/* Fallback: input file */}
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 hover:border-[#662E8E] transition-colors text-center">
              <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 font-medium text-sm">Ou toque aqui para abrir a galeria</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full text-gray-500">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Camera streaming (ou aguardando)
  return (
    <Card className="bg-white/95 backdrop-blur shadow-xl">
      <CardContent className="p-4">
        <div className="relative rounded-lg overflow-hidden mb-4 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[4/3] object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3 px-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              <p className="text-white text-sm font-medium">Aguardando camera...</p>
              {waitingTooLong && (
                <>
                  <p className="text-yellow-300 text-xs text-center">
                    Aceite a permissao no popup do navegador.
                  </p>
                  <p className="text-yellow-300/70 text-xs text-center">
                    Se nao apareceu nenhum popup, clique abaixo.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Status das permissões */}
        <div className="mb-3">
          <PermissionStatus />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Botão principal: capturar ou retry */}
          {waitingTooLong && !isStreaming ? (
            <Button
              size="lg"
              onClick={retryCamera}
              className="h-14 text-lg bg-[#662E8E] hover:bg-[#4a2268]"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Permitir Camera
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleCapture}
              disabled={!isStreaming}
              className="h-14 text-lg bg-[#662E8E] hover:bg-[#4a2268]"
            >
              <Camera className="h-5 w-5 mr-2" />
              Capturar Foto
            </Button>
          )}

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="text-gray-500">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
