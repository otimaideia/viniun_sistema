/**
 * Utilitários para validação e formatação de CPF
 */

/**
 * Remove caracteres não numéricos do CPF
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata o CPF no padrão 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const cleaned = cleanCPF(cpf);

  if (cleaned.length !== 11) {
    return cpf;
  }

  return cleaned.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    '$1.$2.$3-$4'
  );
}

/**
 * Valida se o CPF é válido usando o algoritmo oficial
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);

  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned.charAt(9))) {
    return false;
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned.charAt(10))) {
    return false;
  }

  return true;
}

/**
 * Máscara o CPF para exibição parcial (ex: 123.***.***-45)
 */
export function maskCPF(cpf: string): string {
  const cleaned = cleanCPF(cpf);

  if (cleaned.length !== 11) {
    return cpf;
  }

  return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
}

/**
 * Verifica se a string parece ser um CPF (11 dígitos)
 */
export function isCPFFormat(value: string): boolean {
  const cleaned = cleanCPF(value);
  return cleaned.length === 11;
}

/**
 * Aplica máscara de CPF enquanto o usuário digita
 */
export function applyCPFMask(value: string): string {
  const cleaned = cleanCPF(value);

  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  }
  if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  }
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}
