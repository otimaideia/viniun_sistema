import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

interface LocationIds {
  estadoId: string;
  cidadeId: string;
  bairroId: string;
}

interface LocationCascadeSelectProps {
  estadoId: string;
  cidadeId: string;
  bairroId: string;
  onChange: (ids: LocationIds) => void;
}

export function LocationCascadeSelect({
  estadoId,
  cidadeId,
  bairroId,
  onChange,
}: LocationCascadeSelectProps) {
  const { tenant } = useTenantContext();

  const { data: estados = [] } = useQuery({
    queryKey: ["mt-imovel-estados", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_locations" as any)
        .select("id, nome, sigla")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data || []) as Array<{ id: string; nome: string; sigla: string }>;
    },
    enabled: !!tenant,
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ["mt-imovel-cidades", tenant?.id, estadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_locations" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .eq("estado_id", estadoId)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data || []) as Array<{ id: string; nome: string }>;
    },
    enabled: !!tenant && !!estadoId,
  });

  const { data: bairros = [] } = useQuery({
    queryKey: ["mt-imovel-bairros", tenant?.id, cidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_locations" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .eq("cidade_id", cidadeId)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data || []) as Array<{ id: string; nome: string }>;
    },
    enabled: !!tenant && !!cidadeId,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select
          value={estadoId || "none"}
          onValueChange={(v) =>
            onChange({ estadoId: v === "none" ? "" : v, cidadeId: "", bairroId: "" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecione...</SelectItem>
            {estados.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome} ({e.sigla})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cidade</Label>
        <Select
          value={cidadeId || "none"}
          onValueChange={(v) =>
            onChange({ estadoId, cidadeId: v === "none" ? "" : v, bairroId: "" })
          }
          disabled={!estadoId}
        >
          <SelectTrigger>
            <SelectValue placeholder={estadoId ? "Selecione a cidade" : "Selecione o estado primeiro"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecione...</SelectItem>
            {cidades.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Bairro</Label>
        <Select
          value={bairroId || "none"}
          onValueChange={(v) =>
            onChange({ estadoId, cidadeId, bairroId: v === "none" ? "" : v })
          }
          disabled={!cidadeId}
        >
          <SelectTrigger>
            <SelectValue placeholder={cidadeId ? "Selecione o bairro" : "Selecione a cidade primeiro"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecione...</SelectItem>
            {bairros.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
