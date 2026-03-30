import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Upload, FileText, X, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancialTransactionsMT, useFinancialTransactionMT, useFinancialCategoriesMT, useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '@/types/financeiro';
import type { TransactionType, TransactionStatus, FinancialTransactionCreate } from '@/types/financeiro';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function LancamentoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { franchise } = useTenantContext();

  const { transactions, createTransaction, createInstallmentTransaction, updateTransaction } = useFinancialTransactionsMT();
  const { transaction: singleTransaction, isLoading: isLoadingSingle } = useFinancialTransactionMT(isEditing ? id : undefined);
  const { categories } = useFinancialCategoriesMT();
  const { accounts } = useFinancialAccountsMT();

  const [saving, setSaving] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [existingComprovanteUrl, setExistingComprovanteUrl] = useState<string | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    tipo: 'despesa' as TransactionType,
    descricao: '',
    valor: '',
    category_id: '',
    account_id: '',
    franchise_id: franchise?.id || '',
    data_competencia: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    status: 'pendente' as TransactionStatus,
    forma_pagamento: '',
    parcela_atual: '',
    parcela_total: '',
    documento: '',
    observacoes: '',
  });

  useEffect(() => {
    if (!isEditing) return;

    // Try from list first, then fallback to single-fetch (direct URL access)
    const tx = transactions.find((t) => t.id === id) || singleTransaction;
    if (tx) {
      setForm({
        tipo: tx.tipo,
        descricao: tx.descricao,
        valor: String(tx.valor),
        category_id: tx.category_id || '',
        account_id: tx.account_id || '',
        franchise_id: tx.franchise_id || '',
        data_competencia: tx.data_competencia,
        data_vencimento: tx.data_vencimento || '',
        status: tx.status,
        forma_pagamento: tx.forma_pagamento || '',
        parcela_atual: tx.parcela_atual ? String(tx.parcela_atual) : '',
        parcela_total: tx.parcela_total ? String(tx.parcela_total) : '',
        documento: tx.documento || '',
        observacoes: tx.observacoes || '',
      });
      if (tx.comprovante_url) {
        setExistingComprovanteUrl(tx.comprovante_url);
      }
    }
  }, [id, isEditing, transactions, singleTransaction]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Formato invalido. Use JPG, PNG ou PDF.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Maximo 5MB.');
      return;
    }

    setComprovanteFile(file);
    setExistingComprovanteUrl(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setComprovantePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setComprovantePreview(null);
    }
  };

  const removeComprovante = () => {
    setComprovanteFile(null);
    setComprovantePreview(null);
    setExistingComprovanteUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadComprovante = async (): Promise<string | null> => {
    if (!comprovanteFile) return existingComprovanteUrl || null;

    setUploadingComprovante(true);
    try {
      const ext = comprovanteFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const filePath = `comprovantes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, comprovanteFile, { contentType: comprovanteFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Erro ao fazer upload do comprovante:', err);
      toast.error('Erro ao fazer upload do comprovante');
      return null;
    } finally {
      setUploadingComprovante(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.descricao || !form.valor || !form.data_competencia) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }

    setSaving(true);
    try {
      // Upload comprovante if a new file was selected
      const comprovanteUrl = await uploadComprovante();

      const payload: FinancialTransactionCreate = {
        tipo: form.tipo,
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        franchise_id: form.franchise_id || franchise?.id || '',
        category_id: form.category_id || undefined,
        account_id: form.account_id || undefined,
        data_competencia: form.data_competencia,
        data_vencimento: form.data_vencimento || undefined,
        status: form.status,
        forma_pagamento: form.forma_pagamento || undefined,
        parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : undefined,
        parcela_total: form.parcela_total ? parseInt(form.parcela_total) : undefined,
        documento: form.documento || undefined,
        observacoes: form.observacoes || undefined,
        comprovante_url: comprovanteUrl || undefined,
      };

      if (isEditing) {
        await updateTransaction({ id, ...payload });
      } else {
        const parcelaTotal = parseInt(form.parcela_total) || 0;
        if (parcelaTotal > 1) {
          await createInstallmentTransaction(payload, parcelaTotal);
          toast.success(`${parcelaTotal} parcelas criadas com sucesso`);
        } else {
          await createTransaction(payload);
        }
      }
      navigate('/financeiro/lancamentos');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.tipo === form.tipo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <Link to="/financeiro/lancamentos" className="hover:text-foreground">Lancamentos</Link>
            <span>/</span>
            <span>{isEditing ? 'Editar' : 'Novo'}</span>
          </div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Lancamento' : 'Novo Lancamento'}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/financeiro/lancamentos')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados do Lancamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo toggle */}
            <div>
              <Label>Tipo *</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={form.tipo === 'receita' ? 'default' : 'outline'}
                  className={form.tipo === 'receita' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setForm((f) => ({ ...f, tipo: 'receita', category_id: '' }))}
                >
                  Receita
                </Button>
                <Button
                  type="button"
                  variant={form.tipo === 'despesa' ? 'default' : 'outline'}
                  className={form.tipo === 'despesa' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setForm((f) => ({ ...f, tipo: 'despesa', category_id: '' }))}
                >
                  Despesa
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Descricao */}
              <div className="md:col-span-2">
                <Label htmlFor="descricao">Descricao *</Label>
                <Input id="descricao" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descricao do lancamento" required />
              </div>

              {/* Valor */}
              <div>
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input id="valor" type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0,00" required />
              </div>

              {/* Categoria */}
              <div>
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo ? `${c.codigo} - ` : ''}{c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conta */}
              <div>
                <Label>Conta</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm((f) => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Competencia */}
              <div>
                <Label htmlFor="data_competencia">Data Competencia *</Label>
                <Input id="data_competencia" type="date" value={form.data_competencia} onChange={(e) => setForm((f) => ({ ...f, data_competencia: e.target.value }))} required />
              </div>

              {/* Data Vencimento */}
              <div>
                <Label htmlFor="data_vencimento">Data Vencimento</Label>
                <Input id="data_vencimento" type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} />
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TransactionStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSACTION_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Forma Pagamento */}
              <div>
                <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => setForm((f) => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartao de Credito</SelectItem>
                    <SelectItem value="cartao_debito">Cartao de Debito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Parcelas */}
              <div>
                <Label htmlFor="parcela_atual">Parcela Atual</Label>
                <Input id="parcela_atual" type="number" min="1" value={form.parcela_atual} onChange={(e) => setForm((f) => ({ ...f, parcela_atual: e.target.value }))} placeholder="1" />
              </div>
              <div>
                <Label htmlFor="parcela_total">Total de Parcelas</Label>
                <Input id="parcela_total" type="number" min="1" value={form.parcela_total} onChange={(e) => setForm((f) => ({ ...f, parcela_total: e.target.value }))} placeholder="1" />
              </div>

              {/* Documento */}
              <div>
                <Label htmlFor="documento">Documento/NF</Label>
                <Input id="documento" value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))} placeholder="Numero do documento" />
              </div>

              {/* Comprovante */}
              <div className="md:col-span-2">
                <Label>Comprovante</Label>
                <div className="mt-1 space-y-3">
                  {/* Existing comprovante preview */}
                  {existingComprovanteUrl && !comprovanteFile && (
                    <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                      {existingComprovanteUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                        <img
                          src={existingComprovanteUrl}
                          alt="Comprovante"
                          className="h-20 w-20 object-cover rounded border"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <a
                            href={existingComprovanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Ver comprovante (PDF)
                          </a>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeComprovante}
                        className="ml-auto text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* New file preview */}
                  {comprovanteFile && (
                    <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                      {comprovantePreview ? (
                        <img
                          src={comprovantePreview}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded border"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span>{comprovanteFile.name}</span>
                        </div>
                      )}
                      <div className="flex-1 text-sm text-muted-foreground">
                        {comprovanteFile.name} ({(comprovanteFile.size / 1024).toFixed(0)} KB)
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeComprovante}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Upload button */}
                  {!comprovanteFile && !existingComprovanteUrl && (
                    <div
                      className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique para enviar comprovante (JPG, PNG ou PDF - max 5MB)
                      </span>
                    </div>
                  )}

                  {(comprovanteFile || existingComprovanteUrl) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" /> Substituir arquivo
                    </Button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              {/* Observacoes */}
              <div className="md:col-span-2">
                <Label htmlFor="observacoes">Observacoes</Label>
                <Textarea id="observacoes" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview de Parcelas */}
        {!isEditing && parseInt(form.parcela_total) > 1 && parseFloat(form.valor) > 0 && form.data_vencimento && (
          <Card className="mt-4 border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview das Parcelas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Serão criadas <strong>{form.parcela_total} parcelas</strong> de{' '}
                <strong>R$ {(parseFloat(form.valor) / parseInt(form.parcela_total)).toFixed(2)}</strong>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Array.from({ length: parseInt(form.parcela_total) }, (_, i) => {
                  const date = new Date(form.data_vencimento + 'T00:00:00');
                  date.setMonth(date.getMonth() + i);
                  return (
                    <div key={i} className="flex justify-between p-2 bg-white rounded border">
                      <span>{i + 1}/{form.parcela_total}</span>
                      <span>{date.toLocaleDateString('pt-BR')}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/financeiro/lancamentos')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Lancamento'}
          </Button>
        </div>
      </form>
    </div>
  );
}
