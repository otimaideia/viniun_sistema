import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/contexts/CorretorAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CorretorPerfil() {
  const navigate = useNavigate();
  const { corretor } = useCorretorAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: corretor?.nome || "",
    email: corretor?.email || "",
    telefone: corretor?.telefone || "",
    celular: corretor?.celular || "",
    creci: corretor?.creci || "",
  });

  const handleSave = async () => {
    if (!corretor) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("mt_corretores")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", corretor.id);
      if (error) throw error;
      toast.success("Perfil atualizado!");
      // Update session storage
      const updated = { ...corretor, ...form };
      sessionStorage.setItem("corretor_auth", JSON.stringify(updated));
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/corretor/portal")}><ArrowLeft className="h-4 w-4" /></Button>
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="font-bold">Meu Perfil</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader><CardTitle>Dados do Corretor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Celular</Label><Input value={form.celular} onChange={(e) => setForm(f => ({ ...f, celular: e.target.value }))} /></div>
              <div className="space-y-2"><Label>CRECI</Label><Input value={form.creci} onChange={(e) => setForm(f => ({ ...f, creci: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
