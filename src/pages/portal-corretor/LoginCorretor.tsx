import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CorretorAuthProvider, useCorretorAuth } from "@/contexts/CorretorAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, Loader2, KeyRound } from "lucide-react";

function LoginForm() {
  const navigate = useNavigate();
  const { login, verifyCode, error, isLoading, pendingIdentifier, clearError } = useCorretorAuth();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"identify" | "verify">("identify");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(identifier);
    if (ok) setStep("verify");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await verifyCode(code);
    if (ok) navigate("/corretor/portal");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal do Corretor</CardTitle>
          <CardDescription>
            {step === "identify"
              ? "Acesse com seu email ou telefone cadastrado"
              : `Enviamos um código para ${pendingIdentifier}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>
          )}

          {step === "identify" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email ou Telefone</Label>
                <Input
                  id="identifier"
                  placeholder="seu@email.com ou (13) 99999-9999"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !identifier.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Acessar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">Digite qualquer código de 6 dígitos (ex: 123456)</p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Verificar
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("identify"); setCode(""); clearError(); }}>
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginCorretor() {
  return (
    <CorretorAuthProvider>
      <LoginForm />
    </CorretorAuthProvider>
  );
}
