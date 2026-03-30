import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface CepAddressData {
  cidade: string;
  estado: string;
  bairro?: string;
  endereco?: string;
}

interface CepInputProps {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound?: (data: CepAddressData) => void;
  className?: string;
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function CepInput({ value, onChange, onAddressFound, className }: CepInputProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(maskCep(e.target.value));
  };

  const handleBlur = async () => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setIsLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      onAddressFound?.({
        cidade: data.localidade || "",
        estado: data.uf || "",
        bairro: data.bairro || "",
        endereco: data.logradouro || "",
      });
    } catch {
      toast.error("Erro ao consultar CEP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="00000-000"
        maxLength={9}
        className={className}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
