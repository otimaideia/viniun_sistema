import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { ACCOUNT_TYPE_LABELS } from '@/types/financeiro';
import type { AccountType } from '@/types/financeiro';
import { toast } from 'sonner';

export default function ContaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { franchise } = useTenantContext();

  const { accounts, createAccount, updateAccount } = useFinancialAccountsMT();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    tipo: 'banco' as AccountType,
    banco: '',
    agencia: '',
    conta: '',
    saldo_inicial: '',
    franchise_id: franchise?.id || '',
  });

  useEffect(() => {
    if (isEditing && accounts.length > 0) {
      const account = accounts.find((a) => a.id === id);
      if (account) {
        setForm({
          nome: account.nome,
          tipo: account.tipo,
          banco: account.banco || '',
          agencia: account.agencia || '',
          conta: account.conta || '',
          saldo_inicial: String(account.saldo_inicial),
          franchise_id: account.franchise_id || '',
        });
      }
    }
  }, [id, isEditing, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome) {
      toast.error('Informe o nome da conta');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        banco: form.banco || undefined,
        agencia: form.agencia || undefined,
        conta: form.conta || undefined,
        saldo_inicial: form.saldo_inicial ? parseFloat(form.saldo_inicial) : 0,
        franchise_id: form.franchise_id || undefined,
      };

      if (isEditing) {
        await updateAccount({ id, ...payload });
      } else {
        await createAccount(payload);
      }
      navigate('/financeiro/contas');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <Link to="/financeiro/contas" className="hover:text-foreground">Contas</Link>
            <span>/</span>
            <span>{isEditing ? 'Editar' : 'Nova'}</span>
          </div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Conta' : 'Nova Conta'}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/financeiro/contas')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="md:col-span-2">
                <Label htmlFor="nome">Nome da Conta *</Label>
                <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Conta Corrente Bradesco" required />
              </div>

              {/* Tipo */}
              <div>
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as AccountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Banco */}
              <div>
                <Label htmlFor="banco">Banco</Label>
                <Input id="banco" value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))} placeholder="Ex: Bradesco, Itau, Nubank" />
              </div>

              {/* Agencia */}
              <div>
                <Label htmlFor="agencia">Agencia</Label>
                <Input id="agencia" value={form.agencia} onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))} placeholder="0001" />
              </div>

              {/* Conta */}
              <div>
                <Label htmlFor="conta">Numero da Conta</Label>
                <Input id="conta" value={form.conta} onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))} placeholder="12345-6" />
              </div>

              {/* Saldo Inicial */}
              <div>
                <Label htmlFor="saldo_inicial">Saldo Inicial (R$)</Label>
                <Input id="saldo_inicial" type="number" step="0.01" value={form.saldo_inicial} onChange={(e) => setForm((f) => ({ ...f, saldo_inicial: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/financeiro/contas')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Conta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
