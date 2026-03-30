import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useFunisAdapter } from "@/hooks/useFunisAdapter";
import { useFranchiseDefaultFunnelMT } from "@/hooks/multitenant/useFranchiseDefaultFunnelMT";

/**
 * Página /funil — redireciona para o funil padrão da franquia.
 * Se não houver funil padrão, redireciona para o primeiro funil disponível.
 */
export default function Funil() {
  const navigate = useNavigate();
  const { funis, isLoading: isLoadingFunis } = useFunisAdapter({ includeTemplates: false });
  const { defaultFunnelId, isLoading: isLoadingDefault } = useFranchiseDefaultFunnelMT();

  useEffect(() => {
    if (isLoadingFunis || isLoadingDefault) return;

    if (defaultFunnelId) {
      navigate(`/funil/${defaultFunnelId}`, { replace: true });
    } else if (funis.length > 0) {
      navigate(`/funil/${funis[0].id}`, { replace: true });
    }
  }, [isLoadingFunis, isLoadingDefault, defaultFunnelId, funis, navigate]);

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
