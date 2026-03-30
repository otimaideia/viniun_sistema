import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TemplateTipo = "contrato_normal" | "contrato_permuta" | "encerramento" | "aditivo" | "distrato";

// Serviços disponíveis para permuta
export const SERVICOS_DEPILACAO = [
  { id: "axila", label: "Depilação a Laser – Axila" },
  { id: "virilha", label: "Depilação a Laser – Virilha" },
  { id: "meia_perna", label: "Depilação a Laser – Meia Perna" },
];

export const SERVICOS_ESTETICA = [
  { id: "drenagem", label: "Drenagem Linfática" },
  { id: "revitalizacao_facial", label: "Revitalização Facial" },
  { id: "limpeza_pele", label: "Limpeza de Pele" },
  { id: "pump_gluteo", label: "Pump de Glúteo" },
];

export const TODOS_SERVICOS = [...SERVICOS_DEPILACAO, ...SERVICOS_ESTETICA];

export interface ContratoData {
  // Template
  template_tipo?: TemplateTipo;

  // Dados da Influenciadora
  influenciadora_nome: string;
  influenciadora_cpf?: string;
  influenciadora_rg?: string;
  influenciadora_email?: string;
  influenciadora_telefone?: string;
  influenciadora_cidade?: string;
  influenciadora_estado?: string;
  influenciadora_cep?: string;
  influenciadora_rua?: string;
  influenciadora_numero?: string;
  influenciadora_bairro?: string;
  influenciadora_estado_civil?: string;
  influenciadora_profissao?: string;
  influenciadora_naturalidade?: string;

  // Dados do Contrato
  contrato_numero: string;
  contrato_tipo: string;
  data_inicio: string;
  data_fim?: string | null;
  valor_mensal?: number | null;
  valor_por_post?: number | null;
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  credito_permuta?: number | null;
  posts_mes?: number | null;
  stories_mes?: number | null;
  reels_mes?: number | null;
  servicos_permuta?: string[]; // IDs dos serviços de permuta selecionados

  // Dados da Empresa (Tenant/Franqueadora)
  empresa_nome: string;
  empresa_cnpj?: string;
  empresa_endereco?: string;
  empresa_cidade?: string;
  empresa_estado?: string;
  empresa_representante?: string;
  empresa_representante_cargo?: string;
  empresa_representante_cpf?: string;

  // Franquia/Unidade (opcional)
  franquia_nome?: string;
  franquia_cnpj?: string;
  franquia_endereco?: string;
  franquia_cidade?: string;
  franquia_estado?: string;
  franquia_cep?: string;

  // Aditivo contratual
  aditivo_numero?: number;
  aditivo_descricao?: string;
  aditivo_dados_anteriores?: Record<string, any>;
  aditivo_dados_novos?: Record<string, any>;

  // Menor de Idade / Responsável Legal
  eh_menor?: boolean;
  responsavel_legal_nome?: string;
  responsavel_legal_cpf?: string;
  responsavel_legal_rg?: string;
  responsavel_legal_parentesco?: string;

  // Distrato (cancelamento bilateral)
  motivo_empresa?: string;
  motivo_influenciadora?: string;
  contrato_original_numero?: string;
  contrato_original_data?: string;
  dias_vigencia?: number;
  dentro_prazo_arrependimento?: boolean;
  obrigacoes_pendentes?: string;
}

interface ContratoTemplateProps {
  data: ContratoData;
  hideButtons?: boolean;
}

const ESTILOS = `
  @media print {
    .no-print { display: none !important; }
    .contrato-template { padding: 40px; max-width: 100%; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .contrato-template {
    background: white; padding: 48px; max-width: 900px; margin: 0 auto;
    font-family: 'Georgia', serif; color: #1a1a1a; line-height: 1.8;
  }
  .contrato-header {
    text-align: center; border-bottom: 3px solid #662E8E;
    padding-bottom: 24px; margin-bottom: 32px;
  }
  .contrato-header h1 {
    font-size: 24px; font-weight: bold; color: #662E8E;
    margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;
  }
  .contrato-header .numero { font-size: 13px; color: #666; font-family: 'Arial', sans-serif; }
  .contrato-section { margin-bottom: 28px; }
  .section-title {
    font-size: 16px; font-weight: bold; color: #662E8E;
    margin-bottom: 14px; padding-bottom: 6px;
    border-bottom: 2px solid #f3f4f6;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .contrato-texto {
    font-size: 13.5px; text-align: justify; margin-bottom: 14px;
  }
  .destaque { font-weight: bold; color: #1a1a1a; }
  .clausula { margin-bottom: 20px; }
  .clausula-numero { font-weight: bold; color: #662E8E; margin-bottom: 6px; font-size: 14px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .info-item { display: flex; flex-direction: column; }
  .info-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .info-value { font-size: 13.5px; font-weight: 600; color: #1a1a1a; }
  .servicos-lista {
    background: #f9f5ff; border: 1px solid #e9d5ff; border-radius: 8px;
    padding: 16px; margin: 12px 0;
  }
  .servicos-lista h4 { font-size: 13px; font-weight: bold; color: #662E8E; margin: 0 0 8px 0; }
  .servicos-lista ul { margin: 0; padding-left: 20px; }
  .servicos-lista li { font-size: 13px; margin-bottom: 4px; }
  .assinatura-area { margin-top: 48px; padding-top: 24px; border-top: 2px solid #f3f4f6; }
  .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 32px; }
  .assinatura-campo { text-align: center; }
  .assinatura-linha { border-top: 2px solid #1a1a1a; margin-bottom: 8px; height: 60px; }
  .assinatura-nome { font-weight: bold; font-size: 13.5px; }
  .assinatura-doc { font-size: 12px; color: #666; margin-top: 4px; }
  .assinatura-responsavel {
    display: flex; justify-content: center; margin-top: 40px;
  }
  .assinatura-responsavel .assinatura-campo { width: 50%; }
  .rodape {
    margin-top: 40px; padding-top: 20px; border-top: 2px solid #f3f4f6;
    text-align: center; font-size: 11.5px; color: #666;
  }
  .blank { border-bottom: 1px solid #999; display: inline-block; min-width: 120px; height: 18px; }
  .notificacao-cabecalho { border: 2px solid #662E8E; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
`;

export function ContratoTemplate({ data }: ContratoTemplateProps) {
  const templateTipo = data.template_tipo ?? (
    data.contrato_tipo === "permuta" ? "contrato_permuta" : "contrato_normal"
  );

  const formatCurrency = (value?: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return <span className="blank" />;
    try {
      return format(new Date(dateString + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Resolve label dos serviços de permuta
  const servicosLabels = (data.servicos_permuta ?? []).map(id => {
    const found = TODOS_SERVICOS.find(s => s.id === id);
    return found?.label ?? id;
  });

  // Endereço da contratante (franquia tem preferência)
  const contratanteNome = data.franquia_nome || data.empresa_nome;
  const contratanteCNPJ = data.franquia_cnpj || data.empresa_cnpj;
  const contratanteEndereco = data.franquia_endereco || data.empresa_endereco;
  const contratanteCidade = data.franquia_cidade || data.empresa_cidade;
  const contratanteEstado = data.franquia_estado || data.empresa_estado;

  // Endereço da influenciadora formatado
  const enderecoInfluenciadora = [
    data.influenciadora_rua,
    data.influenciadora_numero ? `nº ${data.influenciadora_numero}` : null,
    data.influenciadora_bairro,
  ].filter(Boolean).join(", ");

  const cidadeEstado = data.influenciadora_cidade && data.influenciadora_estado
    ? `${data.influenciadora_cidade}/${data.influenciadora_estado}`
    : (data.influenciadora_cidade || data.influenciadora_estado || null);

  const Blank = ({ size = 120 }: { size?: number }) => (
    <span style={{
      borderBottom: "1px solid #666",
      display: "inline-block",
      minWidth: size,
      height: 18,
      marginLeft: 2,
      marginRight: 2,
    }} />
  );

  // ─── ADITIVO CONTRATUAL ──────────────────────────────────────────────────────
  if (templateTipo === "aditivo") {
    const dadosAnt = data.aditivo_dados_anteriores || {};
    const dadosNov = data.aditivo_dados_novos || {};

    // Calcular campos alterados
    const camposAlterados: { campo: string; antes: string; depois: string }[] = [];
    const labelMap: Record<string, string> = {
      tipo: "Tipo de contrato",
      valor_mensal: "Valor mensal",
      valor_por_post: "Valor por post",
      percentual_comissao: "Percentual de comissão",
      valor_comissao_fixa: "Valor fixo de comissão",
      credito_permuta: "Crédito de permuta",
      data_inicio: "Data de início",
      data_fim: "Data de término",
      posts_mes: "Posts por mês",
      stories_mes: "Stories por mês",
      reels_mes: "Reels por mês",
      servicos_permuta: "Procedimentos de permuta",
      status: "Status",
    };

    Object.keys(dadosNov).forEach(key => {
      if (labelMap[key] && JSON.stringify(dadosAnt[key]) !== JSON.stringify(dadosNov[key])) {
        const formatVal = (v: any) => {
          if (v === null || v === undefined) return "—";
          if (Array.isArray(v)) return v.map(id => TODOS_SERVICOS.find(s => s.id === id)?.label || id).join(", ");
          if (typeof v === "number") return key.includes("valor") || key.includes("credito") ? formatCurrency(v) : String(v);
          if (key.includes("data")) return String(formatDate(v));
          return String(v);
        };
        camposAlterados.push({
          campo: labelMap[key],
          antes: formatVal(dadosAnt[key]),
          depois: formatVal(dadosNov[key]),
        });
      }
    });

    return (
      <div className="contrato-template">
        <style>{ESTILOS}</style>

        <div className="contrato-header">
          <h1>Aditivo Contratual nº {data.aditivo_numero || 1}</h1>
          <div className="numero">Ref. Contrato nº {data.contrato_numero}</div>
        </div>

        <div className="contrato-section">
          <div className="contrato-texto">
            Pelo presente instrumento particular de <span className="destaque">ADITIVO CONTRATUAL</span>,
            as partes abaixo qualificadas resolvem alterar as condições do contrato de parceria
            nº <span className="destaque">{data.contrato_numero}</span>,
            firmado em {formatDate(data.data_inicio)}, conforme cláusulas a seguir:
          </div>
        </div>

        {/* DAS PARTES */}
        <div className="contrato-section">
          <div className="section-title">DAS PARTES</div>
          <div className="contrato-texto">
            <span className="destaque">CONTRATANTE:</span>{" "}
            <span className="destaque">{contratanteNome}</span>
            {contratanteCNPJ && `, CNPJ nº ${contratanteCNPJ}`}
            {contratanteEndereco && `, com sede em ${contratanteEndereco}`}
            {contratanteCidade && `, ${contratanteCidade}`}
            {contratanteEstado && `/${contratanteEstado}`}
            {data.empresa_representante && `, neste ato representada por ${data.empresa_representante}`}
            .
          </div>
          <div className="contrato-texto">
            <span className="destaque">CONTRATADO(A):</span>{" "}
            <span className="destaque">{data.influenciadora_nome}</span>
            {data.influenciadora_cpf && `, CPF nº ${data.influenciadora_cpf}`}
            .
          </div>
        </div>

        {/* DAS ALTERAÇÕES */}
        <div className="contrato-section">
          <div className="section-title">CLÁUSULA PRIMEIRA – DAS ALTERAÇÕES</div>

          {data.aditivo_descricao && (
            <div className="contrato-texto">
              <span className="destaque">Motivo:</span> {data.aditivo_descricao}
            </div>
          )}

          {camposAlterados.length > 0 ? (
            <div className="contrato-texto">
              <p style={{ marginBottom: 12 }}>As partes acordam as seguintes alterações:</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #662E8E" }}>
                    <th style={{ textAlign: "left", padding: "8px", color: "#662E8E" }}>Cláusula</th>
                    <th style={{ textAlign: "left", padding: "8px", color: "#662E8E" }}>Antes</th>
                    <th style={{ textAlign: "left", padding: "8px", color: "#662E8E" }}>Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {camposAlterados.map((alt, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px", fontWeight: "bold" }}>{alt.campo}</td>
                      <td style={{ padding: "8px", textDecoration: "line-through", color: "#999" }}>{alt.antes}</td>
                      <td style={{ padding: "8px", fontWeight: "bold" }}>{alt.depois}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="contrato-texto">
              As alterações foram registradas conforme acordado entre as partes.
            </div>
          )}
        </div>

        {/* DISPOSIÇÕES GERAIS */}
        <div className="contrato-section">
          <div className="section-title">CLÁUSULA SEGUNDA – DAS DISPOSIÇÕES GERAIS</div>
          <div className="contrato-texto">
            As demais cláusulas e condições do contrato original nº {data.contrato_numero} permanecem
            inalteradas e em pleno vigor, salvo no que foi expressamente modificado por este aditivo.
          </div>
          <div className="contrato-texto">
            Este aditivo entra em vigor na data de sua assinatura por ambas as partes.
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="contrato-section" style={{ marginTop: 48 }}>
          <div className="contrato-texto" style={{ textAlign: "center", marginBottom: 32 }}>
            {contratanteCidade || data.influenciadora_cidade || "Local"},{" "}
            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>

          <div className="assinaturas-container">
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{contratanteNome}</div>
              <div className="assinatura-doc">CONTRATANTE</div>
              {contratanteCNPJ && <div className="assinatura-doc">CNPJ: {contratanteCNPJ}</div>}
            </div>
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.influenciadora_nome}</div>
              <div className="assinatura-doc">CONTRATADO(A)</div>
              {data.influenciadora_cpf && <div className="assinatura-doc">CPF: {data.influenciadora_cpf}</div>}
            </div>
          </div>

          {data.eh_menor && data.responsavel_legal_nome && (
            <div className="assinatura-responsavel">
              <div className="assinatura-campo">
                <div className="assinatura-linha" />
                <div className="assinatura-nome">{data.responsavel_legal_nome}</div>
                <div className="assinatura-doc">REPRESENTANTE LEGAL</div>
                {data.responsavel_legal_parentesco && <div className="assinatura-doc">{data.responsavel_legal_parentesco}</div>}
                {data.responsavel_legal_cpf && <div className="assinatura-doc">CPF: {data.responsavel_legal_cpf}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="rodape">
          Aditivo Contratual nº {data.aditivo_numero || 1} | Ref. {data.contrato_numero}<br />
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    );
  }

  // ─── ENCERRAMENTO ────────────────────────────────────────────────────────────
  if (templateTipo === "encerramento") {
    return (
      <div className="contrato-template">
        <style>{ESTILOS}</style>

        <div className="contrato-header">
          <h1>Notificação de Encerramento de Parceria de Permuta</h1>
          <div className="numero">Ref.: Contrato nº {data.contrato_numero}</div>
        </div>

        <div className="notificacao-cabecalho">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">À Sr(a).</div>
              <div className="info-value">{data.influenciadora_nome}</div>
            </div>
            {data.influenciadora_cpf && (
              <div className="info-item">
                <div className="info-label">CPF nº</div>
                <div className="info-value">{data.influenciadora_cpf}</div>
              </div>
            )}
          </div>
          {data.influenciadora_email && (
            <div className="info-item" style={{ marginTop: 8 }}>
              <div className="info-label">E-mail</div>
              <div className="info-value">{data.influenciadora_email}</div>
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: "bold" }}>
            Assunto: Encerramento de parceria de permuta
          </div>
        </div>

        <div className="contrato-section">
          <div className="contrato-texto">
            Prezad{data.influenciadora_nome ? "a" : "o(a)"} Sra./Sr. <span className="destaque">{data.influenciadora_nome}</span>,
          </div>
          <div className="contrato-texto">
            <span className="destaque">{contratanteNome}</span>
            {contratanteCNPJ && `, CNPJ nº ${contratanteCNPJ}`}, por meio desta, vem formalizar o encerramento da parceria de permuta anteriormente estabelecida para fins de divulgação dos serviços da marca <span className="destaque">YESLASER</span>, realizada mediante concessão de procedimentos estéticos, sem contrapartida financeira, em troca de publicações e ações de divulgação nas redes sociais.
          </div>
          <div className="contrato-texto">
            Informamos que, com a reestruturação do grupo de Embaixadoras YESLASER, a empresa está reorganizando suas parcerias de divulgação, razão pela qual não haverá continuidade das colaborações vigentes sob o formato de permuta.
          </div>
          <div className="contrato-texto">
            Dessa forma, consideramos encerradas, de forma definitiva e amigável, todas as tratativas e obrigações anteriormente mantidas, não restando quaisquer pendências financeiras, contratuais ou de outra natureza entre as partes.
          </div>
        </div>

        <div className="contrato-section">
          <div className="section-title">Declaramos, ainda, que:</div>
          <div className="contrato-texto">
            • Todas as divulgações e postagens referentes à marca YESLASER já realizadas até o momento são consideradas suficientes para cumprimento da parceria;<br />
            • Caso existam conteúdos pendentes de publicação, consideram-se dispensados, sem necessidade de execução ou compensação adicional.
          </div>
        </div>

        <div className="contrato-texto">
          Agradecemos pela parceria, dedicação e profissionalismo durante o período de colaboração, desejando sucesso contínuo em seus projetos e novas oportunidades.
        </div>

        <div className="contrato-texto" style={{ marginTop: 24 }}>
          Atenciosamente,
        </div>

        <div className="assinatura-area">
          <div className="assinatura-grid">
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">
                {data.empresa_representante || contratanteNome}
              </div>
              {data.empresa_representante_cargo && (
                <div className="assinatura-doc">{data.empresa_representante_cargo}</div>
              )}
              <div className="assinatura-doc">{contratanteNome}</div>
              {contratanteCidade && (
                <div className="assinatura-doc">
                  {contratanteCidade}{contratanteEstado ? `/${contratanteEstado}` : ""}, {formatDate(data.data_inicio)}
                </div>
              )}
            </div>
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.influenciadora_nome}</div>
              <div className="assinatura-doc">PARCEIRA</div>
              {data.influenciadora_cpf && <div className="assinatura-doc">CPF: {data.influenciadora_cpf}</div>}
            </div>
          </div>
          {data.eh_menor && data.responsavel_legal_nome && (
            <div className="assinatura-responsavel">
              <div className="assinatura-campo">
                <div className="assinatura-linha" />
                <div className="assinatura-nome">{data.responsavel_legal_nome}</div>
                <div className="assinatura-doc">REPRESENTANTE LEGAL</div>
                {data.responsavel_legal_parentesco && <div className="assinatura-doc">{data.responsavel_legal_parentesco}</div>}
                {data.responsavel_legal_cpf && <div className="assinatura-doc">CPF: {data.responsavel_legal_cpf}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="rodape">
          Documento nº {data.contrato_numero} | Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    );
  }

  // ─── DISTRATO (CANCELAMENTO BILATERAL) ────────────────────────────────────────
  if (templateTipo === "distrato") {
    const refContrato = data.contrato_original_numero || data.contrato_numero;
    const refData = data.contrato_original_data || data.data_inicio;
    const dentroCDC = data.dentro_prazo_arrependimento;

    return (
      <div className="contrato-template">
        <style>{ESTILOS}</style>

        <div className="contrato-header">
          <h1>Termo de Distrato Contratual</h1>
          <div className="numero">Ref.: Contrato nº {refContrato}</div>
        </div>

        <div className="contrato-section">
          <div className="contrato-texto">
            Pelo presente instrumento particular de <span className="destaque">DISTRATO CONTRATUAL</span>, as partes abaixo identificadas:
          </div>

          <div className="clausula">
            <div className="clausula-numero">CONTRATANTE:</div>
            <div className="contrato-texto">
              <span className="destaque">{contratanteNome}</span>
              {contratanteCNPJ && <>, inscrita no CNPJ sob nº <span className="destaque">{contratanteCNPJ}</span></>}
              {contratanteEndereco && <>, com sede em {contratanteEndereco}</>}
              {contratanteCidade && contratanteEstado && <>, {contratanteCidade}/{contratanteEstado}</>}
              , neste ato representada por {data.empresa_representante || <Blank />}
              {data.empresa_representante_cargo && <>, {data.empresa_representante_cargo}</>}.
            </div>
          </div>

          <div className="clausula">
            <div className="clausula-numero">CONTRATADA:</div>
            <div className="contrato-texto">
              <span className="destaque">{data.influenciadora_nome}</span>
              {data.influenciadora_cpf && <>, CPF nº <span className="destaque">{data.influenciadora_cpf}</span></>}
              {data.influenciadora_rg && <>, RG nº {data.influenciadora_rg}</>}
              {enderecoInfluenciadora && <>, residente em {enderecoInfluenciadora}</>}
              {cidadeEstado && <>, {cidadeEstado}</>}
              {data.influenciadora_cep && <>, CEP {data.influenciadora_cep}</>}
              {data.influenciadora_email && <>, e-mail: {data.influenciadora_email}</>}
              {data.influenciadora_telefone && <>, telefone: {data.influenciadora_telefone}</>}.
            </div>
          </div>
        </div>

        <div className="contrato-section">
          <div className="section-title">Cláusula 1ª — Do Objeto</div>
          <div className="contrato-texto">
            As partes resolvem, de <span className="destaque">comum acordo</span>, promover o DISTRATO do Contrato de Parceria de {data.contrato_tipo === "permuta" ? "Permuta" : "Influenciador Digital"} nº <span className="destaque">{refContrato}</span>, firmado em <span className="destaque">{formatDate(refData)}</span>, com vigência de <span className="destaque">{data.dias_vigencia ?? "___"} dia(s)</span>, encerrando-se todas as obrigações dele decorrentes.
          </div>
        </div>

        <div className="contrato-section">
          <div className="section-title">Cláusula 2ª — Do Fundamento Legal</div>
          <div className="contrato-texto">
            {dentroCDC ? (
              <>
                O presente distrato é celebrado com base no <span className="destaque">Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/90)</span>, que assegura o direito de arrependimento no prazo de 7 (sete) dias a contar da assinatura do contrato firmado fora do estabelecimento comercial, sem necessidade de justificativa e sem aplicação de multa ou penalidade.
              </>
            ) : (
              <>
                O presente distrato é celebrado com base na <span className="destaque">Cláusula 7ª do contrato original</span>, que prevê a possibilidade de rescisão por qualquer das partes mediante aviso prévio de 30 (trinta) dias, sem aplicação de multa, salvo nos casos de descumprimento das cláusulas de exclusividade.
              </>
            )}
          </div>
        </div>

        {(data.motivo_empresa || data.motivo_influenciadora) && (
          <div className="contrato-section">
            <div className="section-title">Cláusula 3ª — Dos Motivos</div>
            {data.motivo_empresa && (
              <div className="clausula">
                <div className="clausula-numero">3.1 — Motivo apresentado pela CONTRATANTE:</div>
                <div className="contrato-texto">{data.motivo_empresa}</div>
              </div>
            )}
            {data.motivo_influenciadora && (
              <div className="clausula">
                <div className="clausula-numero">3.2 — Motivo apresentado pela CONTRATADA:</div>
                <div className="contrato-texto">{data.motivo_influenciadora}</div>
              </div>
            )}
          </div>
        )}

        <div className="contrato-section">
          <div className="section-title">Cláusula {data.motivo_empresa || data.motivo_influenciadora ? "4ª" : "3ª"} — Das Obrigações Pendentes</div>
          <div className="contrato-texto">
            {data.obrigacoes_pendentes ? (
              <>{data.obrigacoes_pendentes}</>
            ) : (
              <>As partes declaram que não existem obrigações pendentes entre si, sejam de natureza financeira, de prestação de serviços, de entrega de conteúdos ou de qualquer outra natureza, nada havendo a reclamar uma da outra a qualquer título ou em qualquer época.</>
            )}
          </div>
          {data.contrato_tipo === "permuta" && data.servicos_permuta && data.servicos_permuta.length > 0 && (
            <div className="servicos-lista">
              <h4>Procedimentos acordados que serão encerrados:</h4>
              <ul>
                {servicosLabels.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="contrato-section">
          <div className="section-title">Cláusula {data.motivo_empresa || data.motivo_influenciadora ? "5ª" : "4ª"} — Da Quitação Mútua</div>
          <div className="contrato-texto">
            As partes concedem-se reciprocamente <span className="destaque">plena, geral, irrevogável e irretratável quitação</span> de todas e quaisquer obrigações decorrentes do contrato original, nada mais tendo a reclamar uma da outra, a qualquer título ou em qualquer época, seja a que pretexto for, por si, seus herdeiros ou sucessores.
          </div>
        </div>

        <div className="contrato-section">
          <div className="section-title">Cláusula {data.motivo_empresa || data.motivo_influenciadora ? "6ª" : "5ª"} — Do Direito de Imagem</div>
          <div className="contrato-texto">
            Com o presente distrato, a CONTRATANTE declara que <span className="destaque">não mais utilizará</span> a imagem, nome ou voz da CONTRATADA em novas publicações, campanhas ou materiais promocionais a partir da data de assinatura deste termo. Os conteúdos já publicados durante a vigência contratual poderão permanecer nas plataformas onde foram originalmente veiculados pelo prazo máximo de <span className="destaque">30 (trinta) dias</span> após a assinatura deste distrato, devendo ser removidos após este período, caso solicitado pela CONTRATADA.
          </div>
        </div>

        <div className="contrato-section">
          <div className="contrato-texto">
            E, por estarem justas e acordadas, as partes firmam o presente instrumento de distrato em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas, para que produza os efeitos legais.
          </div>
        </div>

        <div className="contrato-texto" style={{ textAlign: "center", marginTop: 24 }}>
          {contratanteCidade || <Blank />}{contratanteEstado ? `/${contratanteEstado}` : ""}, {formatDate(new Date().toISOString().split("T")[0])}
        </div>

        <div className="assinatura-area">
          <div className="assinatura-grid">
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.empresa_representante || contratanteNome}</div>
              {data.empresa_representante_cargo && (
                <div className="assinatura-doc">{data.empresa_representante_cargo}</div>
              )}
              <div className="assinatura-doc">{contratanteNome}</div>
              <div className="assinatura-doc">CONTRATANTE</div>
            </div>
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.influenciadora_nome}</div>
              {data.influenciadora_cpf && <div className="assinatura-doc">CPF: {data.influenciadora_cpf}</div>}
              <div className="assinatura-doc">CONTRATADA</div>
            </div>
          </div>
          {data.eh_menor && data.responsavel_legal_nome && (
            <div className="assinatura-responsavel">
              <div className="assinatura-campo">
                <div className="assinatura-linha" />
                <div className="assinatura-nome">{data.responsavel_legal_nome}</div>
                <div className="assinatura-doc">REPRESENTANTE LEGAL</div>
                {data.responsavel_legal_parentesco && <div className="assinatura-doc">{data.responsavel_legal_parentesco}</div>}
                {data.responsavel_legal_cpf && <div className="assinatura-doc">CPF: {data.responsavel_legal_cpf}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="contrato-section" style={{ marginTop: 32 }}>
          <div className="section-title">Testemunhas</div>
          <div className="assinatura-grid">
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-doc">Nome: <Blank size={150} /></div>
              <div className="assinatura-doc">CPF: <Blank size={150} /></div>
            </div>
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-doc">Nome: <Blank size={150} /></div>
              <div className="assinatura-doc">CPF: <Blank size={150} /></div>
            </div>
          </div>
        </div>

        <div className="rodape">
          Termo de Distrato | Ref. Contrato nº {refContrato}<br />
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    );
  }

  // ─── CONTRATO DE PERMUTA ─────────────────────────────────────────────────────
  if (templateTipo === "contrato_permuta") {
    return (
      <div className="contrato-template">
        <style>{ESTILOS}</style>

        <div className="contrato-header">
          <h1>Contrato de Parceria para Divulgação com Influenciador Digital</h1>
          <div style={{ color: "#662E8E", fontWeight: "bold", marginTop: 4, fontSize: 14 }}>
            Modalidade: Permuta de Serviços Estéticos
          </div>
          <div className="numero">Contrato nº {data.contrato_numero}</div>
        </div>

        {/* Partes */}
        <div className="contrato-section">
          <div className="section-title">Das Partes</div>

          <div className="contrato-texto">
            <span className="destaque">CONTRATANTE:</span>{" "}
            <span className="destaque">{contratanteNome}</span>
            {contratanteCNPJ && `, CNPJ nº ${contratanteCNPJ}`}
            {contratanteEndereco && `, situada na ${contratanteEndereco}`}
            {contratanteCidade && contratanteEstado && `, ${contratanteCidade}/${contratanteEstado}`}
            {", "}
            neste ato representada por{" "}
            <span className="destaque">{data.empresa_representante || <Blank />}</span>
            {data.empresa_representante_cargo && `, ${data.empresa_representante_cargo}`}
            {data.empresa_representante_cpf && `, CPF nº ${data.empresa_representante_cpf}`}
            {", "}
            doravante denominado simplesmente <span className="destaque">CONTRATANTE</span>.
          </div>

          <div className="contrato-texto">
            <span className="destaque">CONTRATADO(A):</span>{" "}
            <span className="destaque">{data.influenciadora_nome}</span>
            {data.influenciadora_estado_civil && `, ${data.influenciadora_estado_civil}`}
            {data.influenciadora_profissao && `, ${data.influenciadora_profissao}`}
            {data.influenciadora_naturalidade && `, natural de ${data.influenciadora_naturalidade}`}
            {data.influenciadora_rg && `, portador(a) do RG nº ${data.influenciadora_rg}`}
            {data.influenciadora_cpf && `, inscrito(a) no CPF/MF sob o nº ${data.influenciadora_cpf}`}
            {enderecoInfluenciadora && `, residente e domiciliado(a) na ${enderecoInfluenciadora}`}
            {data.influenciadora_cep && `, CEP ${data.influenciadora_cep}`}
            {cidadeEstado && `, ${cidadeEstado}`}
            {data.influenciadora_telefone && `, telefone ${data.influenciadora_telefone}`}
            {data.influenciadora_email && `, e-mail: ${data.influenciadora_email}`}
            {", "}
            doravante denominado(a) simplesmente <span className="destaque">CONTRATADO(A)</span>.
          </div>

          {data.eh_menor && data.responsavel_legal_nome && (
            <div className="contrato-texto">
              <span className="destaque">REPRESENTANTE LEGAL:</span>{" "}
              <span className="destaque">{data.responsavel_legal_nome}</span>
              {data.responsavel_legal_parentesco && `, ${data.responsavel_legal_parentesco.toLowerCase()} do(a) CONTRATADO(A)`}
              {data.responsavel_legal_rg && `, portador(a) do RG nº ${data.responsavel_legal_rg}`}
              {data.responsavel_legal_cpf && `, inscrito(a) no CPF/MF sob o nº ${data.responsavel_legal_cpf}`}
              , neste ato representando legalmente o(a) menor acima qualificado(a), autorizando expressamente a celebração do presente contrato.
            </div>
          )}

          <div className="contrato-texto">
            As partes acima identificadas têm, entre si, justo e acertado o presente <span className="destaque">CONTRATO DE PARCERIA PARA DIVULGAÇÃO COM INFLUENCIADOR DIGITAL E USO DE IMAGEM</span>, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente:
          </div>
        </div>

        {/* Objeto */}
        <div className="contrato-section">
          <div className="section-title">Do Objeto do Contrato</div>
          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA PRIMEIRA – DO OBJETO</div>
            <div className="contrato-texto">
              O presente CONTRATO tem como objeto a realização de uma parceria e autorização de uso de imagem para divulgação dos serviços do segmento da CONTRATANTE em <span className="destaque">depilação a laser e estética em geral</span>, através de todas as redes sociais do(a) CONTRATADO(A), marcando sempre as redes sociais da CONTRATANTE.
            </div>

            <div className="contrato-texto">
              <strong>PARÁGRAFO ÚNICO.</strong> A presente parceria ocorrerá sob a forma de <span className="destaque">permuta</span>, mediante a concessão, pela CONTRATANTE, dos seguintes procedimentos gratuitos à CONTRATADA, conforme negociação e aprovação prévia da equipe de marketing:
            </div>

            {servicosLabels.length > 0 ? (
              <div className="servicos-lista">
                <h4>Procedimentos incluídos nesta permuta:</h4>
                <ul>
                  {servicosLabels.map((s, i) => (
                    <li key={i}><strong>{s}</strong></li>
                  ))}
                </ul>
                {data.credito_permuta && (
                  <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#444' }}>
                    Valor estimado total da permuta: <strong>R$ {data.credito_permuta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="contrato-texto">
                Os procedimentos serão definidos individualmente entre a CONTRATADA e o setor responsável, observadas as condições e a disponibilidade da CONTRATANTE, não gerando qualquer obrigação de pagamento, contraprestação financeira ou conversão em valores monetários.
              </div>
            )}

            <div className="contrato-texto">
              Tais procedimentos não geram qualquer obrigação de pagamento, contraprestação financeira ou conversão em valores monetários.
            </div>
          </div>

          <div className="clausula">
            <div className="clausula-numero">CESSÃO DE DIREITOS DE IMAGEM</div>
            <div className="contrato-texto">
              Ficam também incluídas neste objeto: a <span className="destaque">cessão temporária e limitada dos direitos de imagem</span> conforme estipulado neste contrato e a utilização de sua imagem, voz, nome, conteúdo e demais elementos de identificação pessoal em materiais publicitários, campanhas institucionais e promocionais relacionadas à marca da CONTRATANTE – <span className="destaque">YESLASER</span>, em qualquer formato ou meio de comunicação, especialmente mídias digitais pagas.
            </div>
          </div>
        </div>

        {/* Vigência */}
        <div className="contrato-section">
          <div className="section-title">Do Prazo Contratual</div>
          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA SEGUNDA – DO PRAZO</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Início do Contrato</div>
                <div className="info-value">{formatDate(data.data_inicio)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Término do Contrato</div>
                <div className="info-value">{data.data_fim ? formatDate(data.data_fim) : "Indeterminado"}</div>
              </div>
            </div>
            <div className="contrato-texto">
              Este contrato vigorará pelo prazo indicado acima, podendo ser prorrogado mediante acordo entre as partes por meio de aditivo contratual.
            </div>
            <div className="contrato-texto">
              <strong>PARÁGRAFO PRIMEIRO:</strong> Após o término deste contrato, a CONTRATANTE poderá manter, por até 02 (dois) anos, a veiculação de imagens, vídeos e conteúdos já publicados durante a vigência contratual, sem que isso implique nova autorização ou contraprestação adicional ao(à) CONTRATADO(A).
            </div>
          </div>
        </div>

        {/* Obrigações CONTRATANTE */}
        <div className="contrato-section">
          <div className="section-title">Das Obrigações das Partes</div>

          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA TERCEIRA – OBRIGAÇÕES DA CONTRATANTE</div>
            <div className="contrato-texto">
              A CONTRATANTE dará ao(à) CONTRATADO(A), durante a vigência do contrato, a execução dos procedimentos estéticos listados na Cláusula Primeira, conforme negociação e aprovação prévia da equipe de marketing.
            </div>
            <div className="contrato-texto">
              • Fornecer à CONTRATADA todas as informações necessárias para a execução do trabalho;<br />
              • Garantir infraestrutura adequada para realização das atividades;<br />
              • Realizar os serviços conforme estipulado neste contrato.
            </div>
          </div>

          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA QUARTA – OBRIGAÇÕES DA CONTRATADA</div>
            <div className="contrato-texto">
              Durante a vigência do presente instrumento, a CONTRATADA deverá:
            </div>
            <div className="contrato-texto">
              • Realizar uma presença a cada 15 (quinze) dias nas unidades da CONTRATANTE, ou, no mínimo, uma presença mensal, para produção de conteúdo;<br />
              {(data.stories_mes ?? 0) > 0 ? (
                <span>• Publicar <span className="destaque">{data.stories_mes} stories</span> por mês, mencionando os serviços da CONTRATANTE e reforçando o cupom de desconto de forma criativa e natural;<br /></span>
              ) : (
                <span>• Publicar <span className="destaque">stories semanais orgânicos</span>, mencionando os serviços da CONTRATANTE e reforçando o cupom de desconto de forma criativa e natural;<br /></span>
              )}
              {(data.posts_mes ?? 0) > 0 && (
                <span>• Publicar <span className="destaque">{data.posts_mes} post(s)</span> no feed por mês;<br /></span>
              )}
              {(data.reels_mes ?? 0) > 0 && (
                <span>• Publicar <span className="destaque">{data.reels_mes} Reels</span> por mês;<br /></span>
              )}
              • Ceder sua imagem, voz, nome e conteúdo à CONTRATANTE para utilização conforme previsto neste contrato, inclusive em anúncios patrocinados;<br />
              • Manter boa apresentação pessoal e conduta compatível com a imagem da campanha;<br />
              • Comprometer-se com exclusividade no segmento de clínica de estética durante a vigência deste contrato, sob pena de multa de R$ 20.000,00 (vinte mil reais).
            </div>
          </div>
        </div>

        {/* Propriedade Intelectual */}
        <div className="contrato-section">
          <div className="section-title">Da Propriedade Intelectual</div>
          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA QUINTA – DIREITOS DE IMAGEM</div>
            <div className="contrato-texto">
              Para fins de publicidade, o(a) CONTRATADO(A) cede, neste ato, a título gratuito, os direitos de imagem à CONTRATANTE, ficando esta autorizada a utilizar imagens do(a) CONTRATADO(A) para fins exclusivos de divulgação e propaganda da marca YESLASER em jornais, Internet, redes sociais, TV e demais meios de comunicação, pelo período de vigência do contrato.
            </div>
          </div>
          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA SEXTA – PROPRIEDADE DO CONTEÚDO</div>
            <div className="contrato-texto">
              Todos os conteúdos e materiais criados pela CONTRATADA em decorrência deste Contrato serão de propriedade exclusiva da CONTRATANTE.
            </div>
          </div>
        </div>

        {/* Representação Legal do Menor (condicional) */}
        {data.eh_menor && data.responsavel_legal_nome && (
          <div className="contrato-section">
            <div className="section-title">Da Representação Legal do Menor</div>
            <div className="clausula">
              <div className="clausula-numero">CLÁUSULA SÉTIMA – DA REPRESENTAÇÃO LEGAL DO MENOR</div>
              <div className="contrato-texto">
                O(A) CONTRATADO(A), por ser menor de 18 (dezoito) anos de idade, é neste ato assistido(a) e representado(a) por seu/sua {data.responsavel_legal_parentesco?.toLowerCase() || "responsável legal"}, Sr(a). <span className="destaque">{data.responsavel_legal_nome}</span>, CPF nº <span className="destaque">{data.responsavel_legal_cpf || "___.___.___-__"}</span>, que autoriza expressamente a celebração do presente contrato e a cessão dos direitos de imagem, assumindo solidariamente as obrigações contratuais.
              </div>
              <div className="contrato-texto">
                <strong>PARÁGRAFO ÚNICO:</strong> O(A) representante legal declara estar ciente de todas as cláusulas e condições deste contrato, concordando integralmente com seus termos.
              </div>
            </div>
          </div>
        )}

        {/* Rescisão */}
        <div className="contrato-section">
          <div className="section-title">Da Rescisão Contratual</div>
          <div className="clausula">
            <div className="clausula-numero">{data.eh_menor ? "CLÁUSULA OITAVA" : "CLÁUSULA SÉTIMA"} – RESCISÃO</div>
            <div className="contrato-texto">
              Este contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias, sem aplicação de multa, salvo nos casos de descumprimento de cláusulas contratuais, especialmente as de exclusividade.
            </div>
          </div>
        </div>

        {/* Foro */}
        <div className="contrato-section">
          <div className="clausula">
            <div className="clausula-numero">{data.eh_menor ? "CLÁUSULA NONA" : "CLÁUSULA OITAVA"} – FORO</div>
            <div className="contrato-texto">
              As partes elegem o foro da comarca de <span className="destaque">{contratanteCidade || "[CIDADE]"}/{contratanteEstado || "CE"}</span> para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato.
            </div>
          </div>
        </div>

        {/* Assinaturas */}
        <div className="assinatura-area">
          <div className="contrato-texto" style={{ textAlign: "center", marginBottom: 16 }}>
            E por estarem assim justas e contratadas, as partes assinam o presente contrato em {data.eh_menor ? "três" : "duas"} vias de igual teor.
          </div>
          <div className="contrato-texto" style={{ textAlign: "center", color: "#666", fontSize: 13, marginBottom: 32 }}>
            {contratanteCidade || data.empresa_cidade || "_____________"}, {formatDate(data.data_inicio)}
          </div>
          <div className="assinatura-grid">
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.empresa_representante || contratanteNome}</div>
              {data.empresa_representante_cargo && (
                <div className="assinatura-doc">{data.empresa_representante_cargo}</div>
              )}
              <div className="assinatura-doc">CONTRATANTE</div>
              {contratanteCNPJ && <div className="assinatura-doc">CNPJ: {contratanteCNPJ}</div>}
            </div>
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.influenciadora_nome}</div>
              <div className="assinatura-doc">CONTRATADO(A)</div>
              {data.influenciadora_cpf && <div className="assinatura-doc">CPF: {data.influenciadora_cpf}</div>}
              {data.influenciadora_rg && <div className="assinatura-doc">RG: {data.influenciadora_rg}</div>}
            </div>
          </div>
          {data.eh_menor && data.responsavel_legal_nome && (
            <div className="assinatura-responsavel">
              <div className="assinatura-campo">
                <div className="assinatura-linha" />
                <div className="assinatura-nome">{data.responsavel_legal_nome}</div>
                <div className="assinatura-doc">REPRESENTANTE LEGAL</div>
                {data.responsavel_legal_parentesco && <div className="assinatura-doc">{data.responsavel_legal_parentesco}</div>}
                {data.responsavel_legal_cpf && <div className="assinatura-doc">CPF: {data.responsavel_legal_cpf}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="rodape">
          Contrato gerado digitalmente. Documento nº {data.contrato_numero} |{" "}
          {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    );
  }

  // ─── CONTRATO NORMAL (padrão) ────────────────────────────────────────────────
  return (
    <div className="contrato-template">
      <style>{ESTILOS}</style>

      <div className="contrato-header">
        <h1>Contrato de Parceria para Divulgação com Influenciador Digital</h1>
        <div className="numero">Contrato nº {data.contrato_numero}</div>
      </div>

      {/* Partes */}
      <div className="contrato-section">
        <div className="section-title">Das Partes</div>

        <div className="contrato-texto">
          <span className="destaque">CONTRATANTE:</span>{" "}
          <span className="destaque">{contratanteNome}</span>
          {contratanteCNPJ && `, CNPJ nº ${contratanteCNPJ}`}
          {contratanteEndereco && `, situada na ${contratanteEndereco}`}
          {contratanteCidade && contratanteEstado && `, ${contratanteCidade}/${contratanteEstado}`}
          {", "}
          neste ato representada por{" "}
          <span className="destaque">{data.empresa_representante || <Blank />}</span>
          {data.empresa_representante_cargo && `, ${data.empresa_representante_cargo}`}
          {", "}
          doravante denominado simplesmente <span className="destaque">CONTRATANTE</span>.
        </div>

        <div className="contrato-texto">
          <span className="destaque">CONTRATADO(A):</span>{" "}
          <span className="destaque">{data.influenciadora_nome}</span>
          {data.influenciadora_estado_civil && `, ${data.influenciadora_estado_civil}`}
          {data.influenciadora_profissao && `, ${data.influenciadora_profissao}`}
          {data.influenciadora_rg && `, portador(a) do RG nº ${data.influenciadora_rg}`}
          {data.influenciadora_cpf && `, CPF nº ${data.influenciadora_cpf}`}
          {enderecoInfluenciadora && `, residente e domiciliado(a) na ${enderecoInfluenciadora}`}
          {data.influenciadora_cep && `, CEP ${data.influenciadora_cep}`}
          {cidadeEstado && `, ${cidadeEstado}`}
          {data.influenciadora_telefone && `, tel. ${data.influenciadora_telefone}`}
          {data.influenciadora_email && `, e-mail: ${data.influenciadora_email}`}
          {", "}
          doravante denominado(a) simplesmente <span className="destaque">CONTRATADO(A)</span>.
        </div>

        {data.eh_menor && data.responsavel_legal_nome && (
          <div className="contrato-texto">
            <span className="destaque">REPRESENTANTE LEGAL:</span>{" "}
            <span className="destaque">{data.responsavel_legal_nome}</span>
            {data.responsavel_legal_parentesco && `, ${data.responsavel_legal_parentesco.toLowerCase()} do(a) CONTRATADO(A)`}
            {data.responsavel_legal_rg && `, portador(a) do RG nº ${data.responsavel_legal_rg}`}
            {data.responsavel_legal_cpf && `, inscrito(a) no CPF/MF sob o nº ${data.responsavel_legal_cpf}`}
            , neste ato representando legalmente o(a) menor acima qualificado(a), autorizando expressamente a celebração do presente contrato.
          </div>
        )}
      </div>

      {/* Objeto */}
      <div className="contrato-section">
        <div className="section-title">Do Objeto</div>
        <div className="clausula">
          <div className="clausula-numero">CLÁUSULA PRIMEIRA – DO OBJETO</div>
          <div className="contrato-texto">
            O presente CONTRATO tem como objeto a realização de uma parceria e autorização de uso de imagem para divulgação dos serviços do segmento da CONTRATANTE em <span className="destaque">depilação a laser e estética em geral</span>, através de todas as redes sociais do(a) CONTRATADO(A), marcando sempre as redes sociais da CONTRATANTE, nos termos abaixo:
          </div>
          <div className="contrato-texto">
            • Depilação a laser em até três áreas, escolhidas pela CONTRATADA, acompanhada da publicação de stories apresentando o processo;<br />
            • Realização de sessões de estética corporal, com a entrega de Reels ao término das sessões;<br />
            • Uma visita presencial por mês para produção de conteúdo e divulgação das instalações;<br />
            • Publicação de um story semanal voltado à divulgação dos serviços e da marca;<br />
            • Cessão temporária e limitada dos direitos de imagem conforme estipulado neste contrato.
          </div>
        </div>
      </div>

      {/* Vigência */}
      <div className="contrato-section">
        <div className="section-title">Do Prazo Contratual</div>
        <div className="clausula">
          <div className="clausula-numero">CLÁUSULA SEGUNDA – DO PRAZO</div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Data de Início</div>
              <div className="info-value">{formatDate(data.data_inicio)}</div>
            </div>
            {data.data_fim && (
              <div className="info-item">
                <div className="info-label">Data de Término</div>
                <div className="info-value">{formatDate(data.data_fim)}</div>
              </div>
            )}
          </div>
          <div className="contrato-texto">
            Este contrato vigorará pelo prazo indicado acima, podendo ser prorrogado mediante acordo entre as partes por meio de aditivo contratual.
          </div>
        </div>
      </div>

      {/* Obrigações e Valores */}
      <div className="contrato-section">
        <div className="section-title">Das Obrigações e Valores</div>

        <div className="clausula">
          <div className="clausula-numero">CLÁUSULA TERCEIRA – OBRIGAÇÕES DA CONTRATANTE</div>

          {data.contrato_tipo === "mensal" && data.valor_mensal && (
            <div className="contrato-texto">
              A CONTRATANTE pagará ao(à) CONTRATADO(A), durante a vigência do contrato, o valor fixo mensal de{" "}
              <span className="destaque">{formatCurrency(data.valor_mensal)}</span>{" "}
              ({data.valor_mensal && new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor_mensal).replace("R$\u00a0", "")} reais), além da execução de procedimentos estéticos conforme combinado.
            </div>
          )}

          {data.contrato_tipo === "por_post" && data.valor_por_post && (
            <div className="contrato-texto">
              A CONTRATANTE pagará ao(à) CONTRATADO(A) o valor de{" "}
              <span className="destaque">{formatCurrency(data.valor_por_post)}</span>{" "}
              por conteúdo publicado aprovado, com entrega mínima de {data.posts_mes || 0} posts mensais.
            </div>
          )}

          {data.contrato_tipo === "comissao" && (
            <div className="contrato-texto">
              A CONTRATADA receberá comissão de{" "}
              {data.percentual_comissao && <span className="destaque">{data.percentual_comissao}%</span>}
              {data.valor_comissao_fixa && <span className="destaque"> ou {formatCurrency(data.valor_comissao_fixa)}</span>}
              {" "}sobre cada conversão realizada através de seu código de indicação, depositados no 5º (quinto) dia útil após cada conversão.
            </div>
          )}

          <div className="contrato-texto">
            • Fornecer ao(à) CONTRATADO(A) todas as informações necessárias para a execução do trabalho;<br />
            • Garantir infraestrutura adequada para realização das atividades;<br />
            • Efetuar o pagamento conforme estipulado neste contrato.
          </div>
        </div>

        <div className="clausula">
          <div className="clausula-numero">CLÁUSULA QUARTA – OBRIGAÇÕES DA CONTRATADA</div>
          <div className="contrato-texto">
            Durante a vigência do presente instrumento, a CONTRATADA deverá realizar publicações em sua rede social Instagram, comentando sobre promoções, serviços e produtos da CONTRATANTE:
          </div>
          <div className="contrato-texto">
            • Stories sobre os serviços de depilação a laser (à escolha da CONTRATADA), descrevendo a experiência;<br />
            • Inserção da marcação do endereço social da clínica (@yeslaserbrasil ou de suas franqueadas);<br />
            • Link "arraste pra cima" para o canal de atendimento da CONTRATANTE;<br />
            {(data.posts_mes ?? 0) > 0 && (
              <span>• <span className="destaque">{data.posts_mes} post(s)</span> no feed por mês;<br /></span>
            )}
            {(data.stories_mes ?? 0) > 0 && (
              <span>• <span className="destaque">{data.stories_mes} stories</span> por mês;<br /></span>
            )}
            {(data.reels_mes ?? 0) > 0 && (
              <span>• <span className="destaque">{data.reels_mes} Reels</span> por mês.<br /></span>
            )}
          </div>
        </div>
      </div>

      {/* Propriedade Intelectual */}
      <div className="contrato-section">
        <div className="section-title">Da Propriedade Intelectual e Imagem</div>
        <div className="clausula">
          <div className="clausula-numero">CLÁUSULA QUINTA – DIREITOS DE IMAGEM</div>
          <div className="contrato-texto">
            O(a) CONTRATADO(A) cede, a título gratuito, os direitos de imagem à CONTRATANTE para fins exclusivos de divulgação e propaganda da marca YESLASER em Internet, redes sociais, TV e demais meios de comunicação, pelo período de vigência do contrato.
          </div>
        </div>
        <div className="clausula">
          <div className="clausula-numero">CLÁUSULA SEXTA – EXCLUSIVIDADE</div>
          <div className="contrato-texto">
            O(a) CONTRATADO(A) compromete-se com exclusividade no segmento de clínica de estética durante a vigência deste contrato, sob pena de multa no valor de <span className="destaque">R$ 20.000,00 (vinte mil reais)</span>.
          </div>
        </div>
      </div>

      {/* Representação Legal do Menor (condicional) */}
      {data.eh_menor && data.responsavel_legal_nome && (
        <div className="contrato-section">
          <div className="section-title">Da Representação Legal do Menor</div>
          <div className="clausula">
            <div className="clausula-numero">CLÁUSULA SÉTIMA – DA REPRESENTAÇÃO LEGAL DO MENOR</div>
            <div className="contrato-texto">
              O(A) CONTRATADO(A), por ser menor de 18 (dezoito) anos de idade, é neste ato assistido(a) e representado(a) por seu/sua {data.responsavel_legal_parentesco?.toLowerCase() || "responsável legal"}, Sr(a). <span className="destaque">{data.responsavel_legal_nome}</span>, CPF nº <span className="destaque">{data.responsavel_legal_cpf || "___.___.___-__"}</span>, que autoriza expressamente a celebração do presente contrato e a cessão dos direitos de imagem, assumindo solidariamente as obrigações contratuais.
            </div>
            <div className="contrato-texto">
              <strong>PARÁGRAFO ÚNICO:</strong> O(A) representante legal declara estar ciente de todas as cláusulas e condições deste contrato, concordando integralmente com seus termos.
            </div>
          </div>
        </div>
      )}

      {/* Rescisão */}
      <div className="contrato-section">
        <div className="section-title">Da Rescisão</div>
        <div className="clausula">
          <div className="clausula-numero">{data.eh_menor ? "CLÁUSULA OITAVA" : "CLÁUSULA SÉTIMA"} – RESCISÃO</div>
          <div className="contrato-texto">
            Este contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias, sem aplicação de multa, salvo nos casos de descumprimento das cláusulas de exclusividade.
          </div>
        </div>
      </div>

      {/* Foro */}
      <div className="contrato-section">
        <div className="clausula">
          <div className="clausula-numero">{data.eh_menor ? "CLÁUSULA NONA" : "CLÁUSULA OITAVA"} – FORO</div>
          <div className="contrato-texto">
            As partes elegem o foro da comarca de <span className="destaque">{contratanteCidade || "[CIDADE]"}/{contratanteEstado || "CE"}</span> para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato.
          </div>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="assinatura-area">
        <div className="contrato-texto" style={{ textAlign: "center", marginBottom: 16 }}>
          E por estarem assim justas e contratadas, as partes assinam o presente contrato em {data.eh_menor ? "três" : "duas"} vias de igual teor.
        </div>
        <div className="contrato-texto" style={{ textAlign: "center", color: "#666", fontSize: 13, marginBottom: 32 }}>
          {contratanteCidade || data.empresa_cidade || "_____________"}, {formatDate(data.data_inicio)}
        </div>
        <div className="assinatura-grid">
          <div className="assinatura-campo">
            <div className="assinatura-linha" />
            <div className="assinatura-nome">{data.empresa_representante || contratanteNome}</div>
            {data.empresa_representante_cargo && (
              <div className="assinatura-doc">{data.empresa_representante_cargo}</div>
            )}
            <div className="assinatura-doc">CONTRATANTE</div>
            {contratanteCNPJ && <div className="assinatura-doc">CNPJ: {contratanteCNPJ}</div>}
          </div>
          <div className="assinatura-campo">
            <div className="assinatura-linha" />
            <div className="assinatura-nome">{data.influenciadora_nome}</div>
            <div className="assinatura-doc">CONTRATADO(A)</div>
            {data.influenciadora_cpf && <div className="assinatura-doc">CPF: {data.influenciadora_cpf}</div>}
          </div>
        </div>
        {data.eh_menor && data.responsavel_legal_nome && (
          <div className="assinatura-responsavel">
            <div className="assinatura-campo">
              <div className="assinatura-linha" />
              <div className="assinatura-nome">{data.responsavel_legal_nome}</div>
              <div className="assinatura-doc">REPRESENTANTE LEGAL</div>
              {data.responsavel_legal_parentesco && <div className="assinatura-doc">{data.responsavel_legal_parentesco}</div>}
              {data.responsavel_legal_cpf && <div className="assinatura-doc">CPF: {data.responsavel_legal_cpf}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="rodape">
        Contrato gerado digitalmente e possui validade jurídica.<br />
        Documento nº {data.contrato_numero} | {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </div>
    </div>
  );
}
