// Funções utilitárias para formatação de dados WhatsApp

// Sanitizar strings com caracteres Unicode problemáticos (surrogate pairs inválidos)
// Isso evita erros de "no low surrogate in string" em APIs JSON
export function sanitizeUnicode(text: string | null | undefined): string {
  if (!text) return '';

  // Remove surrogate pairs inválidos (caracteres órfãos que causam erro JSON)
  // High surrogate: \uD800-\uDBFF, Low surrogate: \uDC00-\uDFFF
  // Um high surrogate deve sempre ser seguido por um low surrogate
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
}

// Verificar se é um JID de contato normal ou LID (Local ID)
export function isLidJid(jid: string): boolean {
  return jid.includes('@lid') || jid.includes('@g.us');
}

// Formatar telefone para exibição
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';

  // Se for um LID ou grupo, não tem número de telefone real
  if (phone.includes('@lid') || phone.includes('@g.us')) {
    return '';
  }

  const cleanPhone = phone
    .replace(/@c\.us$/i, '')
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/\D/g, '');

  if (!cleanPhone) return '';

  // Formato brasileiro: +55 (11) 99999-9999
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    const area = cleanPhone.slice(2, 4);
    const number = cleanPhone.slice(4);

    if (number.length === 9) {
      return `(${area}) ${number.slice(0, 5)}-${number.slice(5)}`;
    } else if (number.length === 8) {
      return `(${area}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }

  // Formato internacional genérico
  if (cleanPhone.length > 10) {
    return `+${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2)}`;
  }

  return cleanPhone;
}

// Formatar telefone para WhatsApp (com @c.us)
export function formatPhoneForWhatsApp(phone: string): string {
  let cleanPhone = phone.replace(/\D/g, '').replace('@c.us', '');

  // Adicionar código do Brasil se não tiver
  if (!cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone;
  }

  return `${cleanPhone}@c.us`;
}

// Extrair número do JID
export function extractPhoneFromJid(jid: string): string {
  return jid.replace('@c.us', '').replace('@s.whatsapp.net', '');
}

// Formatar data/hora da mensagem
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffDays === 0) {
    return timeStr;
  }

  if (diffDays === 1) {
    return `Ontem ${timeStr}`;
  }

  if (diffDays < 7) {
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    return `${dayName} ${timeStr}`;
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Formatar data da conversa para lista
export function formatConversationDate(dateString: string | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (diffDays === 1) {
    return 'Ontem';
  }

  if (diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

// Truncar texto de preview
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Formatar tamanho de arquivo
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Obter extensão do arquivo
export function getFileExtension(filename: string | null): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
}

// Obter ícone baseado no tipo de arquivo
export function getFileIcon(mimetype: string | null): string {
  if (!mimetype) return 'file';

  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'music';
  if (mimetype.includes('pdf')) return 'file-text';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'file-text';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'table';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'presentation';
  if (mimetype.includes('zip') || mimetype.includes('rar')) return 'archive';

  return 'file';
}

// Gerar iniciais do nome
export function getInitials(name: string | null): string {
  if (!name) return '?';

  // Sanitizar e remover emojis e caracteres especiais para evitar problemas de encoding
  // Remove emojis, símbolos e caracteres especiais Unicode
  const cleanName = sanitizeUnicode(name)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]/gu, '')
    .trim();

  const words = cleanName.split(' ').filter(word => word.length > 0);
  if (words.length === 0) return '?';

  if (words.length === 1) {
    // Pegar apenas caracteres ASCII para as iniciais
    const firstWord = words[0].replace(/[^a-zA-Z0-9]/g, '');
    if (firstWord.length === 0) return '?';
    return firstWord.slice(0, 2).toUpperCase();
  }

  // Pegar a primeira letra de cada palavra (apenas ASCII)
  const firstChar = words[0].replace(/[^a-zA-Z0-9]/g, '')[0] || '';
  const lastChar = words[words.length - 1].replace(/[^a-zA-Z0-9]/g, '')[0] || '';

  if (!firstChar && !lastChar) return '?';
  if (!firstChar) return lastChar.toUpperCase();
  if (!lastChar) return firstChar.toUpperCase();

  return (firstChar + lastChar).toUpperCase();
}

// Gerar cor de avatar baseado no nome
export function getAvatarColor(name: string | null): string {
  const colors = [
    '#3B82F6', // blue
    '#22C55E', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#EF4444', // red
    '#10B981', // emerald
    '#6366F1', // indigo
    '#EC4899', // pink
    '#F97316', // orange
    '#14B8A6', // teal
  ];

  if (!name) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
