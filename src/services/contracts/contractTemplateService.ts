import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

// Configurar fontes do pdfMake
if (pdfFonts && typeof pdfFonts === 'object' && 'pdfMake' in pdfFonts) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
} else {
  // Fallback para importação direta
  (pdfMake as any).vfs = pdfFonts;
}

export interface ContractData {
  // Dados da Influenciadora
  influencer_nome: string;
  influencer_nome_artistico?: string;
  influencer_cpf: string;
  influencer_rg?: string;
  influencer_endereco?: string;
  influencer_cidade?: string;
  influencer_estado?: string;
  influencer_cep?: string;
  influencer_email: string;
  influencer_telefone: string;
  influencer_instagram?: string;
  influencer_seguidores?: number;

  // Dados do Contrato
  contract_numero: string;
  contract_tipo: 'mensal' | 'por_post' | 'comissao' | 'permuta' | 'misto';
  contract_data_inicio: string;
  contract_data_fim?: string;
  contract_valor_mensal?: number;
  contract_valor_por_post?: number;
  contract_percentual_comissao?: number;
  contract_valor_comissao_fixa?: number;
  contract_credito_permuta?: number;
  contract_posts_mes?: number;
  contract_stories_mes?: number;
  contract_reels_mes?: number;

  // Dados da Empresa/Tenant
  tenant_razao_social: string;
  tenant_nome_fantasia: string;
  tenant_cnpj: string;
  tenant_endereco?: string;
  tenant_cidade?: string;
  tenant_estado?: string;
  tenant_cep?: string;

  // Dados da Franquia (se aplicável)
  franchise_nome?: string;
  franchise_cnpj?: string;
  franchise_endereco?: string;
  franchise_cidade?: string;
  franchise_estado?: string;
}

export type TemplateType = 'contrato_normal' | 'contrato_permuta' | 'encerramento';

export class ContractTemplateService {

  /**
   * Formata dados para preenchimento do template
   */
  private formatTemplateData(data: ContractData) {
    return {
      // Influenciadora
      INFLUENCER_NOME: data.influencer_nome.toUpperCase(),
      INFLUENCER_NOME_ARTISTICO: data.influencer_nome_artistico || data.influencer_nome,
      INFLUENCER_CPF: this.formatCPF(data.influencer_cpf),
      INFLUENCER_RG: data.influencer_rg || 'NÃO INFORMADO',
      INFLUENCER_ENDERECO: data.influencer_endereco || 'NÃO INFORMADO',
      INFLUENCER_CIDADE: data.influencer_cidade || '',
      INFLUENCER_ESTADO: data.influencer_estado || '',
      INFLUENCER_CEP: this.formatCEP(data.influencer_cep || ''),
      INFLUENCER_EMAIL: data.influencer_email,
      INFLUENCER_TELEFONE: this.formatPhone(data.influencer_telefone),
      INFLUENCER_INSTAGRAM: data.influencer_instagram || '',
      INFLUENCER_SEGUIDORES: data.influencer_seguidores?.toLocaleString('pt-BR') || '0',

      // Contrato
      CONTRACT_NUMERO: data.contract_numero,
      CONTRACT_TIPO: this.getContractTypeLabel(data.contract_tipo),
      CONTRACT_DATA_INICIO: this.formatDate(data.contract_data_inicio),
      CONTRACT_DATA_FIM: data.contract_data_fim ? this.formatDate(data.contract_data_fim) : 'INDETERMINADO',
      CONTRACT_VALOR_MENSAL: this.formatCurrency(data.contract_valor_mensal),
      CONTRACT_VALOR_POR_POST: this.formatCurrency(data.contract_valor_por_post),
      CONTRACT_PERCENTUAL_COMISSAO: data.contract_percentual_comissao ? `${data.contract_percentual_comissao}%` : '',
      CONTRACT_VALOR_COMISSAO_FIXA: this.formatCurrency(data.contract_valor_comissao_fixa),
      CONTRACT_CREDITO_PERMUTA: this.formatCurrency(data.contract_credito_permuta),
      CONTRACT_POSTS_MES: data.contract_posts_mes || 0,
      CONTRACT_STORIES_MES: data.contract_stories_mes || 0,
      CONTRACT_REELS_MES: data.contract_reels_mes || 0,

      // Tenant
      TENANT_RAZAO_SOCIAL: data.tenant_razao_social.toUpperCase(),
      TENANT_NOME_FANTASIA: data.tenant_nome_fantasia,
      TENANT_CNPJ: this.formatCNPJ(data.tenant_cnpj),
      TENANT_ENDERECO: data.tenant_endereco || '',
      TENANT_CIDADE: data.tenant_cidade || '',
      TENANT_ESTADO: data.tenant_estado || '',
      TENANT_CEP: this.formatCEP(data.tenant_cep || ''),

      // Franquia (se aplicável)
      FRANCHISE_NOME: data.franchise_nome || data.tenant_nome_fantasia,
      FRANCHISE_CNPJ: data.franchise_cnpj ? this.formatCNPJ(data.franchise_cnpj) : data.tenant_cnpj,
      FRANCHISE_ENDERECO: data.franchise_endereco || data.tenant_endereco || '',

      // Data de geração
      DATA_GERACAO: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    };
  }

  /**
   * Gera contrato preenchido em PDF usando pdfMake
   */
  async generateDOCX(templateType: TemplateType, data: ContractData): Promise<ArrayBuffer> {
    try {
      console.log('[PDF] Iniciando geração do PDF...');
      const formattedData = this.formatTemplateData(data);
      console.log('[PDF] Dados formatados');
      const pdfContent = this.buildPDFContent(templateType, formattedData);
      console.log('[PDF] Conteúdo PDF construído');

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [60, 60, 60, 60],
        info: {
          title: `Contrato ${data.contract_numero}`,
          author: data.tenant_nome_fantasia,
          subject: `Contrato de Parceria - ${data.influencer_nome}`,
          keywords: 'contrato, influenciadora, parceria',
          creator: 'YESlaser System',
          producer: 'pdfMake',
        },
        content: pdfContent,
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
          lineHeight: 1.3,
        },
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 20],
          },
          subheader: {
            fontSize: 14,
            bold: true,
            margin: [0, 15, 0, 5],
          },
          label: {
            fontSize: 9,
            bold: true,
            color: '#666666',
          },
          value: {
            fontSize: 10,
            margin: [0, 0, 0, 10],
          },
          footer: {
            fontSize: 8,
            color: '#999999',
            italics: true,
          },
          signature: {
            alignment: 'center',
            margin: [0, 40, 0, 0],
          },
        },
      };

      // Gerar PDF e converter para ArrayBuffer
      console.log('[PDF] Criando Promise para geração...');
      return new Promise((resolve, reject) => {
        try {
          console.log('[PDF] Criando documento PDF com pdfMake...');
          const pdfDocGenerator = pdfMake.createPdf(docDefinition);
          console.log('[PDF] Documento criado, chamando getBlob...');

          // Timeout de 30 segundos
          const timeout = setTimeout(() => {
            console.error('[PDF] TIMEOUT: getBlob não respondeu em 30s');
            reject(new Error('Timeout na geração do PDF - getBlob não respondeu'));
          }, 30000);

          // getBlob funciona no browser (getBuffer é apenas para Node.js)
          pdfDocGenerator.getBlob((blob) => {
            clearTimeout(timeout);
            console.log('[PDF] Blob recebido!', {
              type: blob?.type,
              size: blob?.size,
              blobExists: !!blob
            });

            if (!blob) {
              console.error('[PDF] Blob é null ou undefined');
              reject(new Error('Blob do PDF é nulo'));
              return;
            }

            console.log('[PDF] Convertendo blob para ArrayBuffer...');
            // Converter Blob para ArrayBuffer
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('[PDF] Leitura do blob concluída');
              if (reader.result) {
                console.log('[PDF] ArrayBuffer gerado com sucesso!', {
                  byteLength: (reader.result as ArrayBuffer).byteLength
                });
                resolve(reader.result as ArrayBuffer);
              } else {
                console.error('[PDF] reader.result é null');
                reject(new Error('Falha ao ler o blob do PDF'));
              }
            };
            reader.onerror = (error) => {
              console.error('[PDF] Erro ao converter blob para ArrayBuffer:', error);
              reject(new Error('Erro ao converter blob para ArrayBuffer'));
            };
            console.log('[PDF] Iniciando readAsArrayBuffer...');
            reader.readAsArrayBuffer(blob);
          }, (error: any) => {
            // Error callback do getBlob (caso pdfMake retorne erro)
            clearTimeout(timeout);
            console.error('[PDF] Erro retornado pelo getBlob:', error);
            reject(new Error(`Erro no getBlob: ${error?.message || error}`));
          });
        } catch (error) {
          console.error('[PDF] Erro na Promise:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Falha ao gerar documento PDF');
    }
  }

  /**
   * Constrói o conteúdo do PDF com formatação profissional
   */
  private buildPDFContent(templateType: TemplateType, data: any): Content[] {
    const content: Content[] = [
      // Cabeçalho
      {
        text: 'CONTRATO DE PARCERIA',
        style: 'header',
      },
      {
        text: 'INFLUENCIADOR(A) DIGITAL',
        style: 'header',
        margin: [0, -10, 0, 5],
      },
      {
        text: data.CONTRACT_TIPO,
        style: 'subheader',
        alignment: 'center',
        color: '#E91E63',
        margin: [0, 0, 0, 20],
      },

      // Linha separadora
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#E91E63' }],
        margin: [0, 0, 0, 20],
      },

      // CONTRATANTE
      { text: 'CONTRATANTE', style: 'subheader' },
      { text: 'Razão Social:', style: 'label' },
      { text: data.TENANT_RAZAO_SOCIAL, style: 'value' },
      { text: 'CNPJ:', style: 'label' },
      { text: data.TENANT_CNPJ, style: 'value' },
      { text: 'Endereço:', style: 'label' },
      {
        text: `${data.TENANT_ENDERECO || 'Não informado'}, ${data.TENANT_CIDADE || ''} - ${data.TENANT_ESTADO || ''}\nCEP: ${data.TENANT_CEP || 'Não informado'}`,
        style: 'value',
      },

      // CONTRATADA
      { text: 'CONTRATADA (INFLUENCIADORA)', style: 'subheader' },
      { text: 'Nome Completo:', style: 'label' },
      { text: data.INFLUENCER_NOME, style: 'value' },
      { text: 'Nome Artístico:', style: 'label' },
      { text: data.INFLUENCER_NOME_ARTISTICO || data.INFLUENCER_NOME, style: 'value' },
      { text: 'CPF:', style: 'label' },
      { text: data.INFLUENCER_CPF, style: 'value' },
      { text: 'E-mail:', style: 'label' },
      { text: data.INFLUENCER_EMAIL, style: 'value' },
      { text: 'Telefone:', style: 'label' },
      { text: data.INFLUENCER_TELEFONE, style: 'value' },
      { text: 'Instagram:', style: 'label' },
      { text: data.INFLUENCER_INSTAGRAM || '@' + data.INFLUENCER_NOME_ARTISTICO, style: 'value' },
      { text: 'Seguidores:', style: 'label' },
      { text: data.INFLUENCER_SEGUIDORES, style: 'value' },

      // DADOS DO CONTRATO
      { text: 'DADOS DO CONTRATO', style: 'subheader' },
      { text: 'Número do Contrato:', style: 'label' },
      { text: data.CONTRACT_NUMERO, style: 'value' },
      { text: 'Período de Vigência:', style: 'label' },
      { text: `${data.CONTRACT_DATA_INICIO} até ${data.CONTRACT_DATA_FIM}`, style: 'value' },

      // Condições financeiras (condicional baseado no tipo)
      ...(data.CONTRACT_VALOR_MENSAL !== 'R$ 0,00' ? [
        { text: 'Valor Mensal:', style: 'label' },
        { text: data.CONTRACT_VALOR_MENSAL, style: 'value', bold: true, color: '#E91E63' },
      ] : []),

      ...(data.CONTRACT_VALOR_POR_POST !== 'R$ 0,00' ? [
        { text: 'Valor por Post:', style: 'label' },
        { text: data.CONTRACT_VALOR_POR_POST, style: 'value' },
      ] : []),

      ...(data.CONTRACT_PERCENTUAL_COMISSAO ? [
        { text: 'Comissão:', style: 'label' },
        { text: data.CONTRACT_PERCENTUAL_COMISSAO, style: 'value' },
      ] : []),

      ...(data.CONTRACT_CREDITO_PERMUTA !== 'R$ 0,00' ? [
        { text: 'Crédito de Permuta:', style: 'label' },
        { text: data.CONTRACT_CREDITO_PERMUTA, style: 'value' },
      ] : []),

      // METAS DE CONTEÚDO
      { text: 'METAS DE CONTEÚDO MENSAL', style: 'subheader' },
      {
        ul: [
          `Posts no Feed: ${data.CONTRACT_POSTS_MES} por mês`,
          `Stories: ${data.CONTRACT_STORIES_MES} por mês`,
          `Reels: ${data.CONTRACT_REELS_MES} por mês`,
        ],
        margin: [0, 5, 0, 15],
      },

      // Espaço para assinaturas
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#CCCCCC' }],
        margin: [0, 30, 0, 30],
      },

      // Assinaturas
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: '_____________________________', alignment: 'center', margin: [0, 40, 0, 5] },
              { text: 'CONTRATANTE', alignment: 'center', style: 'label' },
              { text: data.TENANT_RAZAO_SOCIAL, alignment: 'center', fontSize: 8 },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: '_____________________________', alignment: 'center', margin: [0, 40, 0, 5] },
              { text: 'CONTRATADA', alignment: 'center', style: 'label' },
              { text: data.INFLUENCER_NOME, alignment: 'center', fontSize: 8 },
            ],
          },
        ],
      },

      // Rodapé
      {
        text: `\nDocumento gerado digitalmente em ${data.DATA_GERACAO}`,
        style: 'footer',
        alignment: 'center',
        margin: [0, 30, 0, 0],
      },
      {
        text: 'Este contrato possui validade jurídica e está protegido por assinatura digital.',
        style: 'footer',
        alignment: 'center',
      },
    ];

    return content;
  }

  /**
   * Gera hash SHA-256 do documento
   */
  async generateDocumentHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Converte ArrayBuffer para Base64
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converte Base64 para ArrayBuffer
   */
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Gera número único de contrato
   */
  generateContractNumber(tenantSlug: string, influencerId: string): string {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${tenantSlug.toUpperCase()}-INF-${year}${month}-${random}`;
  }

  // ==========================================
  // FORMATADORES
  // ==========================================

  private formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  private formatCNPJ(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  private formatCEP(cep: string): string {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return cep;
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  }

  private formatCurrency(value?: number): string {
    if (!value && value !== 0) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  }

  private getContractTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      mensal: 'Mensal - Pagamento Fixo Mensal',
      por_post: 'Por Post - Valor por Conteúdo Produzido',
      comissao: 'Comissão - Percentual ou Valor Fixo por Conversão',
      permuta: 'Permuta - Troca por Procedimentos',
      misto: 'Misto - Combinação de Modalidades',
    };
    return labels[type] || type;
  }
}

// Singleton
export const contractTemplateService = new ContractTemplateService();
