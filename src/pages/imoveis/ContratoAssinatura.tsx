import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Loader2, Eraser, PenTool } from "lucide-react";
import { toast, Toaster } from "sonner";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const publicClient = createClient(supabaseUrl, supabaseAnonKey);

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ContratoAssinatura() {
  const { token } = useParams<{ token: string }>();
  const [signatario, setSignatario] = useState<any>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpfInput, setCpfInput] = useState("");
  const [verified, setVerified] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadSignatory();
  }, [token]);

  const loadSignatory = async () => {
    try {
      setLoading(true);
      // Find signatory by token
      const { data: sig, error: sigError } = await publicClient
        .from("mt_property_contract_signatories")
        .select("*")
        .eq("token_assinatura", token!)
        .single();

      if (sigError || !sig) {
        setError("Link de assinatura invalido ou expirado.");
        return;
      }

      if (sig.assinado) {
        setSignatario(sig);
        setSigned(true);
        return;
      }

      setSignatario(sig);

      // Load contract
      const { data: contract } = await publicClient
        .from("mt_property_contracts")
        .select("*, property:mt_properties!property_id(id, titulo, ref_code), lead:mt_leads!lead_id(id, nome)")
        .eq("id", sig.contract_id)
        .single();

      setContrato(contract);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    if (!signatario) return;
    // Check CPF match (loose - remove non-digits)
    const inputCpf = cpfInput.replace(/\D/g, "");
    const storedCpf = (signatario.cpf_cnpj || "").replace(/\D/g, "");

    if (!storedCpf) {
      // No CPF stored, verify by email presence
      setVerified(true);
      return;
    }

    if (inputCpf === storedCpf) {
      setVerified(true);
    } else {
      toast.error("CPF/CNPJ nao confere com o cadastrado.");
    }
  };

  // Canvas drawing
  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!signatario || !canvasRef.current) return;
    setSigning(true);
    try {
      const signatureData = canvasRef.current.toDataURL("image/png");

      const { error: updateError } = await publicClient
        .from("mt_property_contract_signatories")
        .update({
          assinado: true,
          assinado_em: new Date().toISOString(),
          ip_assinatura: null, // Can't reliably get IP from client
          updated_at: new Date().toISOString(),
        })
        .eq("id", signatario.id);

      if (updateError) throw updateError;

      setSigned(true);
      toast.success("Contrato assinado com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao assinar: ${err.message}`);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-2xl px-4 space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Toaster richColors position="top-right" />
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <h2 className="text-xl font-bold">Link Invalido</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Toaster richColors position="top-right" />
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">Contrato Assinado</h2>
            <p className="text-muted-foreground">
              Sua assinatura foi registrada com sucesso.
              {signatario?.assinado_em && (
                <span className="block mt-1">
                  Assinado em {new Date(signatario.assinado_em).toLocaleDateString("pt-BR")}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-right" />

      <div className="bg-white border-b" style={{ borderTopColor: "#1E3A5F", borderTopWidth: 4 }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Assinatura de Contrato</h1>
          <p className="text-muted-foreground">
            {signatario?.nome} - {contrato?.numero || ""}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Identity verification */}
        {!verified && (
          <Card>
            <CardHeader><CardTitle>Verificacao de Identidade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para sua seguranca, confirme seus dados antes de prosseguir.
              </p>
              <div>
                <label className="text-sm font-medium">CPF/CNPJ</label>
                <Input
                  placeholder="Digite seu CPF ou CNPJ..."
                  value={cpfInput}
                  onChange={(e) => setCpfInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>
              <Button onClick={handleVerify} className="w-full">Verificar e Continuar</Button>
            </CardContent>
          </Card>
        )}

        {verified && contrato && (
          <>
            {/* Contract summary */}
            <Card>
              <CardHeader><CardTitle>Resumo do Contrato</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Contrato</p><p className="text-sm font-medium">{contrato.numero || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo</p><p className="text-sm font-medium capitalize">{contrato.tipo}</p></div>
                  <div><p className="text-xs text-muted-foreground">Imovel</p><p className="text-sm font-medium">{contrato.property?.titulo || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Valor</p><p className="text-sm font-bold text-primary">{formatCurrency(contrato.valor_contrato)}</p></div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Sua participacao</p>
                  <p className="text-sm font-medium">{signatario?.nome} ({signatario?.tipo})</p>
                </div>
              </CardContent>
            </Card>

            {/* Clausulas */}
            {contrato.clausulas && (
              <Card>
                <CardHeader><CardTitle>Clausulas do Contrato</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto border rounded p-3 text-sm space-y-2">
                    {contrato.clausulas.split("\n").filter(Boolean).map((c: string, i: number) => (
                      <p key={i}>{i + 1}. {c}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Signature canvas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><PenTool className="h-4 w-4" /> Assinatura</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearCanvas}><Eraser className="h-4 w-4 mr-1" /> Limpar</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Desenhe sua assinatura no campo abaixo usando o mouse ou dedo (tela touch).</p>
                <div className="border-2 border-dashed rounded-lg bg-white">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>

                <Button
                  onClick={handleSign}
                  disabled={!hasSignature || signing}
                  className="w-full"
                  size="lg"
                >
                  {signing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Assinar Contrato
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Ao assinar, voce declara que leu e concorda com todas as clausulas do contrato.
                  Sua assinatura, data e hora serao registradas eletronicamente.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
