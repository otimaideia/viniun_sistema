# 📦 Recursos de Teste: Sistema de Contratos HTML → PDF

**Data de criação:** 06/02/2026
**Sistema:** YESlaser Painel - Módulo Influenciadoras

---

## 📋 Arquivos Criados

### 1. Guia de Teste Completo
**Arquivo:** `TESTE_MANUAL_CONTRATOS.md`
**Propósito:** Roteiro passo-a-passo para testar todo o fluxo de contratos

**Conteúdo:**
- Pré-requisitos e credenciais de acesso
- 18 passos detalhados com screenshots
- Checklist de validação completo
- Seção de registro de bugs
- Script SQL de verificação

---

### 2. Guia Detalhado (Referência Completa)
**Arquivo:** `TESTE_CONTRATOS_HTML_PDF.md`
**Propósito:** Documentação técnica completa do sistema de contratos

**Conteúdo:**
- Arquitetura do sistema
- Fluxo detalhado em 7 etapas
- Checklist de validação por categoria
- 17 screenshots obrigatórios
- Seção de troubleshooting
- Queries SQL de verificação

---

### 3. Script de Verificação
**Arquivo:** `VERIFICAR_CONTRATOS_JULIA.sh`
**Propósito:** Script bash para validar estado do banco de dados
**Status:** ⚠️ Com erros de parsing jq (caracteres especiais)

**Nota:** Use os comandos SQL diretos do guia de teste em vez do script.

---

## 🎯 Dados de Teste Identificados

### Influenciadora
- **Nome:** Juliana Costa Ferreira
- **Código:** JULIAN04
- **ID:** `a297e5a8-3549-4cd3-a969-5b5802200481`
- **Email:** juliana.influencer@teste.com

### Contratos Disponíveis

#### Contrato 1 (R$ 5.000) ✅
- **ID:** `e89fc7d6-5770-4ff8-a260-adb13cee69d3`
- **Modalidade:** Mensal
- **Valor:** R$ 5.000,00
- **Status:** Ativo
- **Data Início:** 01/02/2026

#### Contrato 2 (R$ 3.000) ⭐ USAR ESTE
- **ID:** `d21f0b41-a385-4a7e-8371-ed37a15f3ddb`
- **Modalidade:** Mensal
- **Valor:** R$ 3.000,00
- **Status:** Ativo
- **Data Início:** 01/02/2026
- **Documento existente:** 1 (tipo: certificado, criado em 06/02/2026)

---

## 🚀 Como Executar o Teste

### Opção 1: Teste Manual (Recomendado)

1. **Abrir guia de teste:**
   ```bash
   open TESTE_MANUAL_CONTRATOS.md
   ```

2. **Seguir roteiro passo-a-passo**
   - 18 passos com screenshots
   - Marcar checkboxes conforme avança
   - Registrar problemas encontrados

3. **Validar no banco:**
   ```bash
   # Copiar e executar comando SQL do guia
   SERVICE_KEY="..."
   curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" ...
   ```

---

### Opção 2: Documentação de Referência

1. **Consultar guia completo:**
   ```bash
   open TESTE_CONTRATOS_HTML_PDF.md
   ```

2. **Usar como referência técnica**
   - Arquitetura do sistema
   - Fluxo detalhado de cada etapa
   - Troubleshooting e resolução de problemas

---

## 📸 Screenshots Obrigatórios

### Teste Manual (16 screenshots)
1. `01-dashboard.png` - Dashboard após login
2. `02-lista-influenciadoras.png` - Lista de influenciadoras
3. `03-perfil-juliana.png` - Perfil da Juliana
4. `04-lista-contratos.png` - Aba de contratos
5. `05-contrato-3000-aberto.png` - Contrato R$ 3.000 aberto
6. `06-contrato-header.png` - Header do contrato
7. `07-contrato-partes.png` - Partes (CONTRATANTE/CONTRATADO)
8. `08-contrato-valores.png` - Valores e modalidade
9. `09-contrato-clausulas.png` - Cláusulas contratuais
10. `10-contrato-rodape.png` - Rodapé com assinaturas
11. `11-botao-imprimir-header.png` - Botão "Imprimir/Salvar PDF"
12. `12-janela-impressao-chrome.png` - Janela de impressão
13. `13-preview-impressao-page1.png` - Preview da página 1
14. `14-preview-impressao-clean.png` - Preview limpo (sem UI)
15. `15-network-insert-document.png` - Network tab mostrando INSERT
16. `16-apos-reload.png` - Estado após reload

### Bonus (2 screenshots opcionais)
17. `17-link-assinatura-gerado.png` - Link de assinatura
18. `18-pagina-assinatura.png` - Página de assinatura pública

---

## 🔍 Validação no Banco de Dados

### Comando SQL de Verificação

```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

echo "=== DOCUMENTOS DO CONTRATO R$ 3.000 ==="
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id, tipo_documento, created_at FROM mt_influencer_contract_documents WHERE contract_id = '\''d21f0b41-a385-4a7e-8371-ed37a15f3ddb'\'' ORDER BY created_at DESC"}'
```

### Estado Atual (Antes do Teste)

```json
[
  {
    "id": "854fa714-4e55-45a3-b24d-dee1c61d26bf",
    "contract_id": "d21f0b41-a385-4a7e-8371-ed37a15f3ddb",
    "tipo_documento": "certificado",
    "created_at": "2026-02-06 01:24:07.94943+00"
  }
]
```

**Observação:** Já existe 1 documento do tipo "certificado". Durante o teste, deverá ser criado um documento do tipo "contrato_principal".

---

## ✅ Checklist Pré-Teste

Antes de iniciar o teste, verificar:

- [ ] Servidor rodando em http://localhost:8080
- [ ] Credenciais de login disponíveis
- [ ] Chrome/Chromium instalado
- [ ] Console do navegador acessível (F12)
- [ ] Capacidade de salvar arquivos PDF
- [ ] Acesso ao banco de dados (Service Key)
- [ ] Guia de teste aberto e pronto

---

## 🎯 Objetivos do Teste

### Funcionalidades a Validar

1. **Preview HTML do Contrato**
   - Renderização correta de todos os dados
   - Formatação adequada
   - Dados dinâmicos preenchidos

2. **Impressão Nativa**
   - Janela de impressão abre
   - Preview sem elementos de UI
   - Formatação adequada para PDF

3. **Geração de PDF**
   - Salvar como PDF funciona
   - Qualidade do PDF adequada
   - Nome do arquivo sugerido

4. **Persistência de Dados**
   - Metadados salvos em `mt_influencer_contract_documents`
   - Dados persistem após reload
   - Integridade dos dados

5. **Link de Assinatura (Bonus)**
   - Link gerado corretamente
   - Link pode ser acessado
   - Página de assinatura funcional

---

## 📊 Critérios de Sucesso

### ✅ Aprovado se:
- Preview HTML renderiza corretamente
- Impressão funciona sem erros
- PDF é gerado com qualidade
- Dados são salvos no banco
- Console sem erros críticos

### ⚠️ Atenção se:
- Pequenos problemas de formatação
- Avisos no console (não-críticos)
- Performance lenta mas funcional

### ❌ Reprovado se:
- Preview não renderiza
- Impressão não abre
- Erros críticos no console
- Dados não são salvos
- Sistema não funciona

---

## 🛠️ Troubleshooting

### Servidor não está respondendo
```bash
# Verificar processo Vite
lsof -ti :8080

# Reiniciar servidor
cd /Applications/XAMPP/xamppfiles/htdocs/sites/yeslaserpainel
npm run dev
```

### Login não funciona
```bash
# Verificar conexão com Supabase
curl -I https://supabase.yeslaser.com.br

# Testar credenciais
# Email: marketing@franquiayeslaser.com.br
# Senha: yeslaser@2025M
```

### Influenciadora não aparece
```bash
# Verificar se existe no banco
SERVICE_KEY="..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id, nome FROM mt_influencers WHERE codigo = '\''JULIAN04'\''"}'
```

### Contrato não carrega
- Verificar console do navegador (F12)
- Verificar aba Network para erros de API
- Confirmar ID do contrato está correto

---

## 📝 Notas Importantes

### Arquivos do Sistema

**Páginas principais:**
- `src/pages/InfluenciadoraContratoPreview.tsx` - Página de preview/impressão
- `src/components/influenciadoras/ContratoTemplate.tsx` - Template HTML do contrato

**Hooks Multi-Tenant:**
- `src/hooks/multitenant/useInfluencerContractsMT.ts` - CRUD de contratos
- `src/hooks/multitenant/useContractDocumentsMT.ts` - Documentos
- `src/hooks/multitenant/useContractSignatureMT.ts` - Assinaturas

**Tabelas do Banco:**
- `mt_influencer_contracts` - Contratos
- `mt_influencer_contract_documents` - Documentos gerados
- `mt_influencer_contract_signature_log` - Log de assinaturas

### Tecnologias Utilizadas

- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Impressão:** window.print() nativo do navegador
- **PDF:** Chrome Print to PDF (nativo)
- **Backend:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth

---

**Criado em:** 06/02/2026
**Última atualização:** 06/02/2026
**Versão:** 1.0
