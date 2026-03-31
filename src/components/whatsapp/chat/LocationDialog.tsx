import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (location: LocationData) => Promise<{ success: boolean; error?: string }>;
  isSending?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export function LocationDialog({
  open,
  onOpenChange,
  onSend,
  isSending = false,
}: LocationDialogProps) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const resetForm = () => {
    setLatitude("");
    setLongitude("");
    setName("");
    setAddress("");
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsGettingLocation(false);
        toast.success("Localização obtida!");
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Permissão de localização negada");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Localização indisponível");
            break;
          case error.TIMEOUT:
            toast.error("Tempo esgotado ao obter localização");
            break;
          default:
            toast.error("Erro ao obter localização");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const validateCoordinate = (value: string, type: "lat" | "lng"): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (type === "lat") return num >= -90 && num <= 90;
    return num >= -180 && num <= 180;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!latitude.trim() || !longitude.trim()) {
      toast.error("Latitude e longitude são obrigatórias");
      return;
    }

    if (!validateCoordinate(latitude, "lat")) {
      toast.error("Latitude inválida (deve estar entre -90 e 90)");
      return;
    }

    if (!validateCoordinate(longitude, "lng")) {
      toast.error("Longitude inválida (deve estar entre -180 e 180)");
      return;
    }

    const locationData: LocationData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name.trim() || undefined,
      address: address.trim() || undefined,
    };

    try {
      const result = await onSend(locationData);
      if (result.success) {
        toast.success("Localização enviada com sucesso!");
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao enviar localização");
      }
    } catch (error) {
      toast.error("Erro ao enviar localização");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Compartilhar Localização
          </DialogTitle>
          <DialogDescription>
            Envie uma localização para a conversa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Botão de localização atual */}
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Obtendo localização...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                Usar minha localização
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou informe manualmente
              </span>
            </div>
          </div>

          {/* Coordenadas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-23.550520"
                type="text"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-46.633308"
                type="text"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Nome do local */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Local (opcional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viniun Filial Centro"
              maxLength={100}
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="address">Endereço (opcional)</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. Paulista, 1000 - São Paulo"
              maxLength={200}
            />
          </div>

          {/* Preview do mapa (placeholder) */}
          {latitude && longitude && validateCoordinate(latitude, "lat") && validateCoordinate(longitude, "lng") && (
            <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">
                {latitude}, {longitude}
              </p>
              {(name || address) && (
                <p className="text-muted-foreground mt-1">
                  {name && <span className="block">{name}</span>}
                  {address && <span className="block">{address}</span>}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Enviando..." : "Enviar Localização"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LocationDialog;
