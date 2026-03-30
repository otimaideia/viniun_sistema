# Correções Necessárias nos Testes Playwright

## Problema Identificado

Os testes em `whatsapp-filas.spec.ts` usam seletores CSS genéricos que não existem nas páginas:
- `.fila-card` ❌
- `.atendente-card` ❌
- `.conversation-item` ❌
- `.metric-card` ❌
- `.tenant-badge` ❌
- `button[title="Editar fila"]` ❌
- `button[title="Deletar fila"]` ❌

## Solução: Usar data-testid

### 1. Adicionar data-testid nos Componentes

**Exemplo em WhatsAppFilas.tsx:**
```tsx
// Card de Fila
<Card data-testid={`fila-card-${fila.id}`}>
  <CardHeader>
    <Badge data-testid="tenant-badge">{tenant.nome_fantasia}</Badge>
    <CardTitle data-testid="fila-nome">{fila.nome}</CardTitle>
  </CardHeader>
  <CardContent>
    <p data-testid="fila-descricao">{fila.descricao}</p>
  </CardContent>
  <CardFooter>
    <Button data-testid={`btn-editar-${fila.id}`}>Editar</Button>
    <Button data-testid={`btn-deletar-${fila.id}`}>Deletar</Button>
  </CardFooter>
</Card>

// Card de Métricas
<div data-testid="metric-card-conversas">
  <h3>Conversas na Fila</h3>
  <p data-testid="metric-value">{stats.queued_conversations}</p>
</div>
```

**Exemplo em WhatsAppFilaDetail.tsx:**
```tsx
// Lista de Atendentes
<div data-testid="atendentes-list">
  {atendentes.map(atendente => (
    <Card key={atendente.id} data-testid={`atendente-card-${atendente.id}`}>
      <CardHeader>
        <CardTitle data-testid="atendente-nome">{atendente.user.nome}</CardTitle>
      </CardHeader>
      <CardContent>
        <p data-testid="atendente-capacidade">
          {atendente.current_conversations} / {atendente.max_concurrent}
        </p>
      </CardContent>
    </Card>
  ))}
</div>

// Botão Adicionar Atendente
<Button data-testid="btn-adicionar-atendente">Adicionar Atendente</Button>
```

### 2. Atualizar Seletores nos Testes

**Antes (seletores inválidos):**
```typescript
await page.click('.fila-card:first-child');
await page.click('button[title="Editar fila"]');
await expect(page.locator('.atendente-card').first()).toBeVisible();
```

**Depois (data-testid):**
```typescript
await page.click('[data-testid^="fila-card-"]');
await page.click('[data-testid^="btn-editar-"]');
await expect(page.locator('[data-testid^="atendente-card-"]').first()).toBeVisible();
```

### 3. Padrão de Nomenclatura data-testid

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Card de listagem | `{tipo}-card-{id}` | `fila-card-uuid` |
| Botão de ação | `btn-{acao}-{id?}` | `btn-editar-uuid` |
| Input de formulário | `input-{campo}` | `input-codigo` |
| Badge/Label | `{tipo}-badge` | `tenant-badge` |
| Métrica | `metric-card-{nome}` | `metric-card-conversas` |
| Valor de métrica | `metric-value` | (dentro do card) |
| Modal | `modal-{nome}` | `modal-adicionar-atendente` |
| Toast | `toast-{tipo}` | `toast-success` |

### 4. Testes que Precisam de Correção

#### Teste 1-2: Acessar e criar fila
- ❌ `button:has-text("Nova Fila")` → ✅ `[data-testid="btn-nova-fila"]`
- ❌ `select[name="distribution_type"]` → ✅ `[data-testid="select-distribution-type"]`

#### Teste 3: Visualizar detalhes
- ❌ `text=Fila de Vendas - Teste` → ✅ `[data-testid^="fila-card-"]`
- ❌ `button:has-text("Configuração")` → ✅ `[data-testid="tab-configuracao"]`

#### Teste 4: Editar fila
- ❌ `button[title="Editar fila"]` → ✅ `[data-testid^="btn-editar-"]`

#### Teste 5: Adicionar atendente
- ❌ `button:has-text("Adicionar Atendente")` → ✅ `[data-testid="btn-adicionar-atendente"]`
- ❌ `.atendente-card` → ✅ `[data-testid^="atendente-card-"]`

#### Teste 6: Filtrar por sessão
- ❌ `select[name="session_filter"]` → ✅ `[data-testid="select-session-filter"]`
- ❌ `.fila-card` → ✅ `[data-testid^="fila-card-"]`

#### Teste 7: Métricas
- ❌ `.metric-card` → ✅ `[data-testid^="metric-card-"]`

#### Teste 9: Deletar fila
- ❌ `button[title="Deletar fila"]` → ✅ `[data-testid^="btn-deletar-"]`
- ❌ `button:has-text("Confirmar")` → ✅ `[data-testid="btn-confirmar-delecao"]`

#### Teste 10: Estatísticas
- ❌ `.fila-card:first-child` → ✅ `[data-testid^="fila-card-"]:first-child`

#### Teste 13: Transferências
- ❌ `.conversation-item:first-child` → ✅ `[data-testid^="conversation-item-"]:first-child`
- ❌ `button:has-text("Transferir")` → ✅ `[data-testid="btn-transferir"]`

#### Teste 14-15: Multi-tenant
- ❌ `.fila-card` → ✅ `[data-testid^="fila-card-"]`
- ❌ `.tenant-badge` → ✅ `[data-testid="tenant-badge"]`

### 5. Checklist de Implementação

Quando implementar as páginas WhatsApp Filas:

- [ ] Adicionar `data-testid` em TODOS os elementos testáveis
- [ ] Seguir padrão de nomenclatura documentado acima
- [ ] Criar arquivo `tests/whatsapp-filas-updated.spec.ts` com seletores corretos
- [ ] Executar testes e validar que passam
- [ ] Remover seletores CSS genéricos do arquivo antigo
- [ ] Atualizar documentação de testes

### 6. Exemplo Completo: Card de Fila

```tsx
// src/components/whatsapp/FilaCard.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MTWhatsAppQueue } from '@/types/whatsapp-queue';

interface FilaCardProps {
  fila: MTWhatsAppQueue;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function FilaCard({ fila, onEdit, onDelete, onView }: FilaCardProps) {
  return (
    <Card
      data-testid={`fila-card-${fila.id}`}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onView(fila.id)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle data-testid="fila-nome">{fila.nome}</CardTitle>
            <CardDescription data-testid="fila-codigo">
              {fila.codigo}
            </CardDescription>
          </div>
          {fila.tenant && (
            <Badge data-testid="tenant-badge">
              {fila.tenant.nome_fantasia}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <p data-testid="fila-descricao" className="text-sm text-muted-foreground">
          {fila.descricao}
        </p>
        <div className="mt-4 flex gap-4">
          <div data-testid="stat-atendentes">
            <span className="text-xs text-muted-foreground">Atendentes</span>
            <p className="text-lg font-semibold">{fila.total_agents || 0}</p>
          </div>
          <div data-testid="stat-conversas">
            <span className="text-xs text-muted-foreground">Conversas</span>
            <p className="text-lg font-semibold">{fila.active_conversations || 0}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          data-testid={`btn-editar-${fila.id}`}
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(fila.id);
          }}
        >
          Editar
        </Button>
        <Button
          data-testid={`btn-deletar-${fila.id}`}
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(fila.id);
          }}
        >
          Deletar
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 7. Comando para Executar Testes (Após Correções)

```bash
# Executar todos os testes WhatsApp Filas
npx playwright test tests/whatsapp-filas-updated.spec.ts

# Executar teste específico
npx playwright test tests/whatsapp-filas-updated.spec.ts -g "Deve criar uma nova fila"

# Modo debug
npx playwright test tests/whatsapp-filas-updated.spec.ts --debug

# Com interface gráfica
npx playwright test tests/whatsapp-filas-updated.spec.ts --ui
```

## Conclusão

Os testes atuais estão **preparados para o futuro**, mas precisam de correções nos seletores quando as páginas forem implementadas. Use `data-testid` seguindo o padrão documentado para garantir testes estáveis e manuteníveis.
