import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Wallet, Landmark, CreditCard, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import { ACCOUNT_TYPE_LABELS } from '@/types/financeiro';
import type { AccountType } from '@/types/financeiro';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const accountIcons: Record<AccountType, typeof Wallet> = {
  caixa: Wallet,
  banco: Landmark,
  cartao: CreditCard,
  digital: Smartphone,
};

export default function Contas() {
  const navigate = useNavigate();
  const { accounts, isLoading, deleteAccount } = useFinancialAccountsMT();

  const totalBalance = accounts.reduce((sum, a) => sum + a.saldo_atual, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Contas</span>
          </div>
          <h1 className="text-2xl font-bold">Contas Financeiras</h1>
        </div>
        <Button onClick={() => navigate('/financeiro/contas/novo')}>
          <Plus className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
      </div>

      {/* Total Balance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total</p>
              <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma conta cadastrada. Clique em "Nova Conta" para comecar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = accountIcons[account.tipo] || Wallet;
            return (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{account.nome}</h3>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {ACCOUNT_TYPE_LABELS[account.tipo]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/financeiro/contas/${account.id}/editar`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover conta?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acao ira desativar a conta "{account.nome}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAccount(account.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {account.banco && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {account.banco}
                      {account.agencia && ` | Ag: ${account.agencia}`}
                      {account.conta && ` | Cc: ${account.conta}`}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Saldo Atual</p>
                    <p className={`text-xl font-bold ${account.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.saldo_atual)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
