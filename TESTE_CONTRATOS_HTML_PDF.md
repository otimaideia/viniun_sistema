# 🧪 Guia de Teste: Sistema de Contratos HTML → PDF

**Data:** 06/02/2026
**Sistema:** YESlaser Painel - Módulo Influenciadoras
**Objetivo:** Testar fluxo completo de geração de documentos de contrato usando HTML e impressão nativa

---

## 📋 Pré-requisitos

- [x] Servidor rodando em http://localhost:8080 (VERIFICADO ✅)
- [x] Chrome/Chromium instalado
- [x] Login: marketing@franquiayeslaser.com.br / yeslaser@2025M

---

## 🎯 Fluxo de Teste - Passo a Passo

### ETAPA 1: Login e Navegação Inicial

1. **Abrir o sistema:**
   - URL: http://localhost:8080
   - Aguardar carregamento completo

2. **Fazer login:**
   - Email: `marketing@franquiayeslaser.com.br`
   - Senha: `yeslaser@2025M`
   - Clicar em "Entrar"
   - **Screenshot:** `01-login-page.png`

3. **Verificar dashboard:**
   - Aguardar redirecionamento
   - Verificar se nome do usuário aparece no topo
   - **Screenshot:** `02-dashboard.png`

---

### ETAPA 2: Navegação até Contratos

4. **Acessar menu Influenciadoras:**
   - Clicar em "Influenciadoras" na sidebar esquerda
   - Aguardar carregamento da lista
   - **Screenshot:** `03-lista-influenciadoras.png`

5. **Selecionar @julianabeauty:**
   - Localizar card da Julia na lista
   - Clicar no card ou no botão "Ver detalhes"
   - Aguardar carregamento do perfil
   - **Screenshot:** `04-perfil-julia.png`

6. **Acessar aba Contratos:**
   - Localizar e clicar na aba "Contratos"
   - Verificar se há contratos listados
   - **Screenshot:** `05-tab-contratos.png`

7. **Selecionar contrato R$ 3.000:**
   - Localizar o contrato mensal de R$ 3.000
   - Clicar no card do contrato
   - Aguardar carregamento dos detalhes
   - **Screenshot:** `06-contrato-selecionado.png`

---

### ETAPA 3: Teste de Preview HTML

8. **Verificar preview HTML:**
   - ✅ Título do documento aparece ("Contrato de...")
   - ✅ Dados da influenciadora preenchidos (nome, CPF, endereço)
   - ✅ Dados da empresa preenchidos (YESlaser, CNPJ)
   - ✅ Valores do contrato (R$ 3.000, modalidade Mensal)
   - ✅ Cláusulas contratuais formatadas
   - ✅ Espaço para assinaturas ao final
   - **Screenshot:** `07-preview-html-topo.png`
   - **Screenshot:** `08-preview-html-meio.png`
   - **Screenshot:** `09-preview-html-rodape.png`

---

### ETAPA 4: Teste de Geração de PDF

9. **Verificar botão no header:**
   - Localizar botão "Imprimir/Salvar PDF" no topo da página
   - Verificar se está habilitado
   - **Screenshot:** `10-botao-header.png`

10. **Clicar em "Imprimir/Salvar PDF":**
    - Clicar no botão
    - Aguardar abertura da janela de impressão do navegador
    - **Screenshot:** `11-janela-impressao.png`

11. **Verificar preview de impressão:**
    - ✅ Documento formatado corretamente
    - ✅ Quebras de página adequadas
    - ✅ Margens corretas
    - ✅ Sem elementos de interface (sidebar, header)
    - **Screenshot:** `12-preview-impressao.png`

12. **Salvar como PDF:**
    - Selecionar "Salvar como PDF" no destino
    - Nome sugerido: `Contrato_Julia_Mensal_3000.pdf`
    - Salvar em local conhecido
    - **Arquivo PDF salvo:** `Contrato_Julia_Mensal_3000.pdf`

---

### ETAPA 5: Teste de Documento Gerado (Primeira Vez)

13. **Verificar botão "Visualizar e Imprimir":**
    - Se não houver documento gerado ainda:
      - Verificar se botão "Visualizar e Imprimir" aparece
      - Clicar no botão
      - **Screenshot:** `13-botao-visualizar.png`

14. **Verificar metadados no banco:**
    - Abrir Console do navegador (F12)
    - Ir para aba "Network"
    - Filtrar por "mt_influencer_contract_documents"
    - Verificar se houve INSERT
    - **Screenshot:** `14-network-insert.png`

---

### ETAPA 6: Verificação de Estado Persistido

15. **Recarregar página:**
    - Pressionar F5 para recarregar
    - Aguardar carregamento

16. **Verificar estado do documento:**
    - ✅ Botão "Visualizar e Imprimir" ainda presente
    - ✅ Documento continua salvo (não precisa gerar novamente)
    - ✅ Preview HTML ainda funcional
    - **Screenshot:** `15-documento-persistido.png`

---

### ETAPA 7: Teste de Link de Assinatura

17. **Verificar botão "Gerar Link de Assinatura":**
    - Após gerar documento, botão deve estar habilitado
    - Clicar no botão
    - Verificar toast de sucesso
    - **Screenshot:** `16-link-assinatura.png`

18. **Copiar e verificar link:**
    - Link deve ter formato: `http://localhost:8080/influenciadora/contrato/{id}/assinar?token=...`
    - Copiar link
    - **Screenshot:** `17-link-copiado.png`

---

## 📊 Checklist de Validação

### Preview HTML ✅
- [ ] Título do contrato correto
- [ ] Dados da influenciadora completos
- [ ] Dados da empresa (tenant) corretos
- [ ] Valores e modalidade exibidos
- [ ] Cláusulas contratuais formatadas
- [ ] Espaço para assinaturas

### Impressão/PDF ✅
- [ ] Janela de impressão abre
- [ ] Preview de impressão sem bugs visuais
- [ ] Margens adequadas (2cm)
- [ ] Quebras de página corretas
- [ ] Sem elementos de UI (sidebar, header)
- [ ] PDF gerado com qualidade

### Persistência de Dados ✅
- [ ] Documento salvo em `mt_influencer_contract_documents`
- [ ] Campos corretos: contract_id, generated_at, generated_by
- [ ] Documento persiste após reload
- [ ] Botão de assinatura habilitado após geração

### Funcionalidades ✅
- [ ] Botão "Imprimir/Salvar PDF" funcional
- [ ] Botão "Visualizar e Imprimir" funcional (se aplicável)
- [ ] Botão "Gerar Link de Assinatura" habilitado após documento
- [ ] Console sem erros críticos
- [ ] Network sem erros 4xx/5xx

---

## 🐛 Registro de Bugs/Issues

### Issues Encontrados
| # | Descrição | Severidade | Screenshot |
|---|-----------|------------|------------|
|   |           |            |            |

### Erros no Console
```
Colar aqui quaisquer erros do console do navegador
```

### Erros de Network
```
Colar aqui quaisquer erros de requisição (status 4xx/5xx)
```

---

## 📸 Screenshots Obrigatórios

1. `01-login-page.png` - Tela de login
2. `02-dashboard.png` - Dashboard após login
3. `03-lista-influenciadoras.png` - Lista de influenciadoras
4. `04-perfil-julia.png` - Perfil da Julia
5. `05-tab-contratos.png` - Aba de contratos
6. `06-contrato-selecionado.png` - Contrato R$ 3.000 aberto
7. `07-preview-html-topo.png` - Topo do preview HTML
8. `08-preview-html-meio.png` - Meio do preview HTML
9. `09-preview-html-rodape.png` - Rodapé do preview HTML
10. `10-botao-header.png` - Botão "Imprimir/Salvar PDF"
11. `11-janela-impressao.png` - Janela de impressão do navegador
12. `12-preview-impressao.png` - Preview de impressão
13. `13-botao-visualizar.png` - Botão "Visualizar e Imprimir" (se aplicável)
14. `14-network-insert.png` - Network tab mostrando INSERT
15. `15-documento-persistido.png` - Estado após reload
16. `16-link-assinatura.png` - Botão de link de assinatura
17. `17-link-copiado.png` - Link copiado

---

## 🔍 Verificação Final no Banco

```sql
-- Verificar documentos gerados
SELECT
  cd.id,
  cd.contract_id,
  c.modalidade,
  c.valor_mensal,
  cd.generated_at,
  cd.generated_by,
  u.nome as gerado_por
FROM mt_influencer_contract_documents cd
JOIN mt_influencer_contracts c ON c.id = cd.contract_id
JOIN mt_users u ON u.id = cd.generated_by
WHERE c.influencer_id = (
  SELECT id FROM mt_influencers WHERE codigo_indicacao = 'JULIANABEAUTY'
)
ORDER BY cd.generated_at DESC;
```

**Executar via:**
```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT cd.id, cd.contract_id, c.modalidade, c.valor_mensal, cd.generated_at, cd.generated_by, u.nome as gerado_por FROM mt_influencer_contract_documents cd JOIN mt_influencer_contracts c ON c.id = cd.contract_id JOIN mt_users u ON u.id = cd.generated_by WHERE c.influencer_id = (SELECT id FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'') ORDER BY cd.generated_at DESC LIMIT 5"}'
```

---

## ✅ Resultado Final

### Funcionalidades Testadas
- [ ] Preview HTML do contrato
- [ ] Impressão nativa do navegador
- [ ] Geração de PDF via Print
- [ ] Persistência de metadados
- [ ] Link de assinatura
- [ ] Estado após reload

### Status Geral
- [ ] ✅ Tudo funcionando
- [ ] ⚠️ Funcionando com issues menores
- [ ] ❌ Bugs críticos encontrados

### Observações Finais
```
Escrever aqui observações gerais sobre o teste,
sugestões de melhorias, ou quaisquer detalhes relevantes.
```

---

**Testador:** _____________
**Data:** 06/02/2026
**Duração do teste:** _______ minutos
