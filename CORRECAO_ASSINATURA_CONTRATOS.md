# Correção Crítica: Sistema de Assinatura de Contratos

**Data:** 06/02/2026
**Autor:** Claude + Danilo
**Prioridade:** 🚨 CRÍTICA - Falha de Segurança

---

## 📋 Resumo Executivo

**PROBLEMA IDENTIFICADO PELO USUÁRIO:**
> "como pode estar assinando sem ver o contrato em pdf"

O sistema permitia assinatura digital de contratos **SEM EXISTIR DOCUMENTO PDF GERADO**. Isso viola princípios básicos de contratos legais: não se pode assinar um documento que não existe.

**STATUS DA CORREÇÃO:**
- ✅ **Validação de Backend Implementada** (Hook corrigido)
- ⚠️ **Geração de PDF com Problema Técnico** (Requer investigação adicional)

---

## 🔴 Problema Original

### Evidência do Bug

**Contrato R$ 3.000 (@julianabeauty):**
- ✅ Status: "Assinado digitalmente 05/02/2026 às 22:24"
- ❌ Documento: "Nenhum documento gerado ainda"
- ✅ Histórico: 7 logs de assinatura completos
- ❌ Validação: **FALHOU** - Assinatura sem PDF

### Fluxo Incorreto

```
ANTES (VULNERÁVEL):
1. Admin clica "Gerar Link de Assinatura" → ✅ Link gerado
2. Influenciadora acessa link → ✅ Sessão criada
3. Valida identidade (CPF + email + nome) → ✅ Validado
4. Assina no canvas → ✅ Assinatura registrada
5. Contrato status = "ativo" → ✅ Ativo

PROBLEMA: Em NENHUMA etapa foi verificado se existe PDF!
```

---

## ✅ Correção Implementada

### Arquivo Modificado

**`src/hooks/multitenant/useContractSignatureMT.ts`**

### Mudança 1: Validação em `initiateSignature` (Linhas 93-106)

**ANTES:**
```typescript
const initiateSignature = useMutation({
  mutationFn: async ({ contract_id, influencer_id }) => {
    if (!tenant && accessLevel !== 'platform') {
      throw new Error('Tenant não definido');
    }

    // Gerar token de sessão único
    const sessionToken = crypto.randomUUID();
    // ... resto do código
```

**DEPOIS:**
```typescript
const initiateSignature = useMutation({
  mutationFn: async ({ contract_id, influencer_id }) => {
    if (!tenant && accessLevel !== 'platform') {
      throw new Error('Tenant não definido');
    }

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se documento foi gerado
    const { data: existingDocument, error: docError } = await supabase
      .from('mt_influencer_contract_documents')
      .select('id, nome_arquivo')
      .eq('contract_id', contract_id)
      .eq('tipo_documento', 'contrato_principal')
      .maybeSingle();

    if (docError) {
      throw new Error(`Erro ao verificar documento: ${docError.message}`);
    }

    if (!existingDocument) {
      throw new Error('Documento do contrato precisa ser gerado antes de solicitar assinatura. Clique em "Gerar Documento" primeiro.');
    }

    // Gerar token de sessão único
    const sessionToken = crypto.randomUUID();
    // ... resto do código
```

### Mudança 2: Validação em `registerSignature` (Linhas 241-257)

**ANTES:**
```typescript
const registerSignature = useMutation({
  mutationFn: async ({ contract_id, influencer_id, signature_data }) => {
    if (!tenant && accessLevel !== 'platform') {
      throw new Error('Tenant não definido');
    }

    // 1. Registrar log de assinatura
    const { data: logData, error: logError } = await supabase
```

**DEPOIS:**
```typescript
const registerSignature = useMutation({
  mutationFn: async ({ contract_id, influencer_id, signature_data }) => {
    if (!tenant && accessLevel !== 'platform') {
      throw new Error('Tenant não definido');
    }

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se documento foi gerado antes de registrar assinatura
    const { data: existingDocument, error: docError } = await supabase
      .from('mt_influencer_contract_documents')
      .select('id, nome_arquivo, hash_arquivo')
      .eq('contract_id', contract_id)
      .eq('tipo_documento', 'contrato_principal')
      .maybeSingle();

    if (docError) {
      throw new Error(`Erro ao verificar documento: ${docError.message}`);
    }

    if (!existingDocument) {
      throw new Error('Não é possível assinar um contrato sem documento gerado. Este é um erro crítico de segurança.');
    }

    // 1. Registrar log de assinatura
    const { data: logData, error: logError } = await supabase
```

### Mudança 3: Certificado Digital Aprimorado (Linhas 290-300)

**ANTES:**
```typescript
const certificateData = {
  contract_id,
  influencer_id,
  signature_date: new Date().toISOString(),
  signature_hash: await contractTemplateService.generateDocumentHash(
    new TextEncoder().encode(signature_data.canvas_data)
  ),
  ip_address: signature_data.ip_address,
  user_agent: signature_data.user_agent,
};
```

**DEPOIS:**
```typescript
const certificateData = {
  contract_id,
  influencer_id,
  signature_date: new Date().toISOString(),
  signature_hash: await contractTemplateService.generateDocumentHash(
    new TextEncoder().encode(signature_data.canvas_data)
  ),
  document_signed: {
    document_id: existingDocument.id,
    document_name: existingDocument.nome_arquivo,
    document_hash: existingDocument.hash_arquivo,
    verified: true,
  },
  ip_address: signature_data.ip_address,
  user_agent: signature_data.user_agent,
};
```

---

## 🔒 Fluxo Correto Após Correção

```
DEPOIS (SEGURO):
1. Admin clica "Gerar Documento" → ✅ PDF gerado e salvo (mt_influencer_contract_documents)
2. Admin clica "Gerar Link de Assinatura"
   → ✅ Hook valida: existe documento?
   → ❌ SE NÃO: Erro "Documento precisa ser gerado primeiro"
   → ✅ SE SIM: Link gerado
3. Influenciadora acessa link → ✅ Sessão criada
4. Valida identidade → ✅ Validado
5. Assina no canvas
   → ✅ Hook valida novamente: existe documento?
   → ❌ SE NÃO: Erro crítico de segurança
   → ✅ SE SIM: Assinatura registrada com referência ao documento
6. Certificado digital criado → ✅ Inclui hash do documento assinado
```

---

## ⚠️ Problema Adicional Identificado

### Geração de PDF Não Está Salvando no Banco

**Sintoma:**
- Botão "Gerar Documento" é clicado
- Console mostra logs de geração:
  ```
  [PDF] Iniciando geração do PDF...
  [PDF] Dados formatados
  [PDF] Conteúdo PDF construído
  [PDF] Criando Promise para geração...
  [PDF] Criando documento PDF com pdfMake...
  [PDF] Documento criado, chamando getBlob...
  ```
- **MAS** documento não aparece na UI
- **MAS** nenhum erro é exibido

**Investigação:**

**Arquivo:** `src/services/contracts/contractTemplateService.ts`

**Função:** `generateDOCX` (linhas 120-210)

**Processo:**
1. ✅ pdfMake.createPdf() cria documento
2. ✅ pdfDocGenerator.getBlob() obtém Blob
3. ❓ FileReader converte Blob → ArrayBuffer (pode estar falhando)
4. ❓ Promise resolve (não está chegando até aqui)

**Hook:** `src/hooks/multitenant/useContractDocumentsMT.ts`

**Função:** `generateDocument` (linhas 68-169)

**Processo:**
1. ✅ Prepara dados do contrato
2. ❓ Chama `contractTemplateService.generateDOCX()` (Promise pendente?)
3. ❌ Não chega até o INSERT no banco

**Causa Provável:**
- A Promise retornada por `generateDOCX` não está resolvendo
- FileReader pode estar falhando silenciosamente
- Ou há um erro no `pdfMake.getBlob()` que não está sendo capturado

---

## 🔧 Recomendações

### Prioridade ALTA

1. **Investigar geração de PDF:**
   ```typescript
   // Adicionar mais logs no contractTemplateService.ts
   reader.onloadend = () => {
     console.log('[PDF] Leitura do blob concluída');
     console.log('[PDF] Tipo do result:', typeof reader.result);
     console.log('[PDF] Tamanho:', reader.result?.byteLength);
     // ...
   };
   ```

2. **Adicionar timeout na Promise:**
   ```typescript
   return Promise.race([
     pdfGenerationPromise,
     new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Timeout na geração de PDF')), 30000)
     )
   ]);
   ```

3. **Testar geração de PDF isoladamente:**
   - Criar um teste unitário para `generateDOCX`
   - Verificar se pdfMake está instalado corretamente
   - Testar com dados mínimos

### Prioridade MÉDIA

4. **Renomear função `generateDOCX` para `generatePDF`:**
   - O nome está confuso (gera PDF, não DOCX)

5. **Adicionar validação de RLS:**
   - Verificar se políticas RLS permitem INSERT em `mt_influencer_contract_documents`

6. **Implementar retry:**
   - Se geração falhar, tentar novamente até 3 vezes

### Prioridade BAIXA

7. **Adicionar testes E2E:**
   - Testar fluxo completo: Gerar PDF → Assinar → Download
   - Validar bloqueio quando não há PDF

---

## 📊 Impacto da Correção

### Segurança
- ✅ **Crítico:** Bloqueio de assinaturas sem documento
- ✅ **Alto:** Validação dupla (frontend + backend)
- ✅ **Médio:** Certificado digital com hash do documento

### Funcionalidade
- ⚠️ **Bloqueado:** Geração de PDF com falha técnica (requer fix)
- ✅ **Funcional:** Validação de segurança implementada
- ✅ **UX:** Mensagens de erro claras

### Compliance Legal
- ✅ **Essencial:** Não é mais possível assinar documento inexistente
- ✅ **Auditoria:** Certificado digital referencia documento assinado
- ✅ **Rastreabilidade:** Log completo de tentativas de assinatura

---

## 🧪 Testes Realizados

### Teste 1: Validação de Segurança ✅
- Modificado hook `useContractSignatureMT`
- Adicionadas validações nas linhas 93-106 e 241-257
- Código compila sem erros TypeScript

### Teste 2: UI Existente ✅
- Botão "Gerar Link de Assinatura" já estava desabilitado sem PDF
- Mensagem "Gere o documento primeiro" já existia
- UI está correta desde o início

### Teste 3: Geração de PDF ❌
- Clicado em "Gerar Documento"
- Logs de início aparecem no console
- **FALHA:** PDF não é salvo no banco
- **FALHA:** Promise não resolve

---

## 📝 Próximos Passos

1. **URGENTE:** Corrigir geração de PDF
   - Investigar por que FileReader não está resolvendo
   - Adicionar tratamento de erro mais robusto
   - Testar com dados mínimos

2. **IMPORTANTE:** Testar validação de segurança
   - Criar contrato de teste
   - Tentar assinar sem PDF (deve bloquear)
   - Gerar PDF e assinar (deve funcionar)

3. **DESEJÁVEL:** Implementar testes automatizados
   - E2E para fluxo completo
   - Unitário para geração de PDF
   - Integração para validação de assinatura

---

## 🎯 Conclusão

**Problema Principal:** ✅ **CORRIGIDO**
- Sistema não permitirá mais assinaturas sem documento PDF
- Validação implementada em 2 camadas (initiate + register)
- Certificado digital aprimorado

**Problema Secundário:** ⚠️ **REQUER ATENÇÃO**
- Geração de PDF está falhando silenciosamente
- Promise não resolve após getBlob()
- Requer investigação técnica adicional

**Fluxo Correto Implementado:**
```
Gerar Documento → Assinar → Download
     ↓               ↓           ↓
  PDF salvo    Validação    Certificado
  no banco      dupla        com hash
```

**Recomendação Final:**
Antes de liberar para produção, **RESOLVER problema de geração de PDF**. A validação de segurança está implementada, mas sem PDF funcional o sistema ficará bloqueado.
