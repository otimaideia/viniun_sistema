# 🧪 Teste Manual: Sistema de Contratos HTML → PDF

**Data:** 06/02/2026
**Objetivo:** Validar fluxo completo de geração e impressão de documentos de contrato

---

## ✅ PRÉ-REQUISITOS

- [x] Servidor rodando: http://localhost:8080
- [x] Login: `marketing@franquiayeslaser.com.br` / `yeslaser@2025M`
- [x] Influenciadora de teste: **Juliana Costa Ferreira** (código JULIAN04)
- [x] Contratos disponíveis:
  - Contrato 1: R$ 5.000/mês (ID: `e89fc7d6-5770-4ff8-a260-adb13cee69d3`)
  - Contrato 2: R$ 3.000/mês (ID: `d21f0b41-a385-4a7e-8371-ed37a15f3ddb`) ⭐ **USAR ESTE**

---

## 📝 ROTEIRO DE TESTE

### ETAPA 1: Login e Acesso

1. **Abrir navegador Chrome**
   - URL: http://localhost:8080

2. **Fazer login:**
   - Email: `marketing@franquiayeslaser.com.br`
   - Senha: `yeslaser@2025M`
   - Clicar "Entrar"
   - ✅ **Screenshot:** `01-dashboard.png`

---

### ETAPA 2: Navegar até Influenciadoras

3. **Menu lateral:**
   - Clicar em "Influenciadoras"
   - ✅ **Screenshot:** `02-lista-influenciadoras.png`

4. **Selecionar Juliana:**
   - Procurar por "Juliana Costa Ferreira" ou código "JULIAN04"
   - Clicar no card da influenciadora
   - ✅ **Screenshot:** `03-perfil-juliana.png`

---

### ETAPA 3: Acessar Contratos

5. **Aba Contratos:**
   - Clicar na aba "Contratos" no perfil
   - Verificar se aparecem 2 contratos (R$ 5.000 e R$ 3.000)
   - ✅ **Screenshot:** `04-lista-contratos.png`

6. **Selecionar contrato R$ 3.000:**
   - Clicar no card do contrato de R$ 3.000/mês
   - Aguardar carregamento da página de detalhes
   - ✅ **Screenshot:** `05-contrato-3000-aberto.png`

---

### ETAPA 4: Validar Preview HTML

7. **Verificar conteúdo do contrato:**

   **HEADER (Topo):**
   - [ ] Logo/nome da empresa (YESlaser ou tenant correto)
   - [ ] Título: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INFLUENCIADOR DIGITAL"
   - [ ] Número do contrato (formato: YLS-XXXXXX)
   - ✅ **Screenshot:** `06-contrato-header.png`

   **PARTES DO CONTRATO:**
   - [ ] **CONTRATANTE:** Nome da empresa + CNPJ + endereço
   - [ ] **CONTRATADO:** Nome Juliana + CPF + dados pessoais
   - ✅ **Screenshot:** `07-contrato-partes.png`

   **OBJETO E VALORES:**
   - [ ] Modalidade: "Pagamento Fixo Mensal"
   - [ ] Valor mensal: R$ 3.000,00
   - [ ] Data de início: 01/02/2026
   - [ ] Posts/mês, Stories/mês, Reels/mês (se houver)
   - ✅ **Screenshot:** `08-contrato-valores.png`

   **CLÁUSULAS:**
   - [ ] Cláusulas contratuais formatadas e legíveis
   - [ ] Parágrafo sobre direitos de imagem
   - [ ] Responsabilidades e obrigações
   - ✅ **Screenshot:** `09-contrato-clausulas.png`

   **RODAPÉ:**
   - [ ] Local e data de assinatura
   - [ ] Linhas para assinatura do CONTRATANTE
   - [ ] Linhas para assinatura do CONTRATADO
   - ✅ **Screenshot:** `10-contrato-rodape.png`

---

### ETAPA 5: Testar Impressão/PDF

8. **Botão "Imprimir/Salvar PDF":**
   - Localizar botão no topo da página (próximo ao botão "Voltar")
   - Verificar se está habilitado
   - ✅ **Screenshot:** `11-botao-imprimir-header.png`

9. **Clicar em "Imprimir/Salvar PDF":**
   - Clicar no botão
   - Aguardar abertura da janela de impressão do Chrome
   - ✅ **Screenshot:** `12-janela-impressao-chrome.png`

10. **Validar preview de impressão:**

    **Formatação:**
    - [ ] Documento em formato A4
    - [ ] Margens adequadas (≈2cm)
    - [ ] Texto legível e bem formatado
    - [ ] Quebras de página adequadas (se mais de 1 página)
    - ✅ **Screenshot:** `13-preview-impressao-page1.png`

    **Conteúdo:**
    - [ ] Sem elementos de interface (sidebar, menu, header do sistema)
    - [ ] Sem botões (Voltar, Imprimir, etc.)
    - [ ] Apenas o conteúdo do contrato
    - ✅ **Screenshot:** `14-preview-impressao-clean.png`

11. **Salvar como PDF:**
    - Destino: "Salvar como PDF"
    - Nome: `Contrato_Juliana_R3000_Mensal.pdf`
    - Clicar "Salvar"
    - ✅ **Arquivo salvo:** `Contrato_Juliana_R3000_Mensal.pdf`

---

### ETAPA 6: Verificar Persistência de Dados

12. **Abrir Console do navegador:**
    - Pressionar F12
    - Ir para aba "Network"
    - Filtrar por "mt_influencer"

13. **Verificar requisições:**
    - [ ] Houve INSERT em `mt_influencer_contract_documents`?
    - [ ] Status da requisição: 200 ou 201?
    - ✅ **Screenshot:** `15-network-insert-document.png`

14. **Recarregar página (F5):**
    - Aguardar carregamento
    - Verificar se preview HTML ainda aparece
    - Verificar se botão "Imprimir" ainda funciona
    - ✅ **Screenshot:** `16-apos-reload.png`

---

### ETAPA 7: Link de Assinatura (Bonus)

15. **Botão "Gerar Link de Assinatura":**
    - Se disponível, clicar no botão
    - Verificar toast de sucesso
    - Verificar se link foi copiado
    - ✅ **Screenshot:** `17-link-assinatura-gerado.png`

16. **Testar link (opcional):**
    - Colar link em nova aba
    - Verificar se abre página de assinatura
    - ✅ **Screenshot:** `18-pagina-assinatura.png`

---

## 🔍 CHECKLIST FINAL

### Preview HTML
- [ ] Título e número do contrato
- [ ] Dados da CONTRATANTE (empresa)
- [ ] Dados do CONTRATADO (Juliana)
- [ ] Valores e modalidade corretos
- [ ] Cláusulas contratuais completas
- [ ] Espaços para assinatura

### Impressão/PDF
- [ ] Janela de impressão abre corretamente
- [ ] Preview sem elementos de UI
- [ ] Formatação adequada (margens, quebras de página)
- [ ] PDF salvo com sucesso
- [ ] Qualidade do PDF adequada

### Persistência
- [ ] Documento salvo em `mt_influencer_contract_documents`
- [ ] Preview funciona após reload
- [ ] Dados persistem corretamente

### Console/Erros
- [ ] Console sem erros críticos
- [ ] Requisições bem-sucedidas (status 2xx)
- [ ] Sem warnings importantes

---

## 🐛 REGISTRO DE PROBLEMAS

| # | Problema | Severidade | Screenshot |
|---|----------|------------|------------|
|   |          |            |            |

**Erros do Console:**
```
(colar aqui se houver)
```

**Observações:**
```
(escrever observações gerais)
```

---

## ✅ RESULTADO FINAL

**Status Geral:**
- [ ] ✅ Tudo funcionando perfeitamente
- [ ] ⚠️ Funcionando com issues menores
- [ ] ❌ Bugs críticos encontrados

**Aprovação para Produção:**
- [ ] SIM - Pode ir para produção
- [ ] NÃO - Precisa correções

---

## 📊 VERIFICAÇÃO NO BANCO DE DADOS

Execute após o teste para validar dados:

```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

echo "=== DOCUMENTOS GERADOS PARA JULIANA ==="
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id, contract_id, tipo_documento, created_at FROM mt_influencer_contract_documents WHERE contract_id = '\''d21f0b41-a385-4a7e-8371-ed37a15f3ddb'\'' ORDER BY created_at DESC"}'
```

**Resultado Esperado:**
- Pelo menos 1 documento com `tipo_documento = 'contrato_principal'`
- `created_at` recente (durante o teste)

---

**Testador:** _______________
**Data:** _______________
**Duração:** _______ minutos
