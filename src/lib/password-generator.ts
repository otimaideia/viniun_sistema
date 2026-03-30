// =====================================================
// Password Generator Utility
// Pure client-side, uses crypto.getRandomValues()
// =====================================================

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

/**
 * Gera uma senha segura usando crypto.getRandomValues()
 */
export function generatePassword(options: Partial<PasswordOptions> = {}): string {
  const opts = { ...DEFAULT_PASSWORD_OPTIONS, ...options };
  const length = Math.max(4, Math.min(128, opts.length));

  let charset = '';
  if (opts.lowercase) charset += CHARSETS.lowercase;
  if (opts.uppercase) charset += CHARSETS.uppercase;
  if (opts.numbers) charset += CHARSETS.numbers;
  if (opts.symbols) charset += CHARSETS.symbols;

  // Fallback if nothing selected
  if (!charset) charset = CHARSETS.lowercase + CHARSETS.uppercase + CHARSETS.numbers;

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  // Ensure at least one char from each selected charset
  const required: string[] = [];
  if (opts.lowercase) required.push(randomChar(CHARSETS.lowercase));
  if (opts.uppercase) required.push(randomChar(CHARSETS.uppercase));
  if (opts.numbers) required.push(randomChar(CHARSETS.numbers));
  if (opts.symbols) required.push(randomChar(CHARSETS.symbols));

  // Replace first N chars with required chars (shuffled)
  const chars = password.split('');
  for (let i = 0; i < required.length && i < chars.length; i++) {
    chars[i] = required[i];
  }

  // Shuffle the result
  for (let i = chars.length - 1; i > 0; i--) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const j = randomValues[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function randomChar(charset: string): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return charset[array[0] % charset.length];
}

/**
 * Calcula a forca da senha (0-100)
 */
export function calculateStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  // Length scoring (max 45 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 24) score += 10;
  if (password.length >= 32) score += 5;

  // Character diversity (max 45 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // Unique characters ratio (max 10 points)
  const uniqueChars = new Set(password).size;
  const uniqueRatio = uniqueChars / password.length;
  if (uniqueRatio > 0.8) score += 10;
  else if (uniqueRatio > 0.6) score += 5;

  // Penalties
  if (/^[a-z]+$/.test(password)) score -= 10;
  if (/^[0-9]+$/.test(password)) score -= 15;
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated chars
  if (/^(123|abc|qwerty|password|senha)/i.test(password)) score -= 20;

  return Math.max(0, Math.min(100, score));
}

export interface StrengthInfo {
  score: number;
  label: string;
  color: string;
  textColor: string;
}

/**
 * Retorna label e cor baseado no score de forca
 */
export function getStrengthInfo(score: number): StrengthInfo {
  if (score < 20) return { score, label: 'Muito Fraca', color: '#EF4444', textColor: 'text-red-500' };
  if (score < 40) return { score, label: 'Fraca', color: '#F97316', textColor: 'text-orange-500' };
  if (score < 60) return { score, label: 'Razoavel', color: '#EAB308', textColor: 'text-yellow-500' };
  if (score < 80) return { score, label: 'Forte', color: '#22C55E', textColor: 'text-green-500' };
  return { score, label: 'Excelente', color: '#10B981', textColor: 'text-emerald-500' };
}

/**
 * Copia texto para clipboard e limpa apos timeout
 */
export async function copyToClipboard(text: string, clearAfterMs = 30_000): Promise<void> {
  await navigator.clipboard.writeText(text);

  if (clearAfterMs > 0) {
    setTimeout(async () => {
      try {
        // Only clear if clipboard still has our value
        const current = await navigator.clipboard.readText();
        if (current === text) {
          await navigator.clipboard.writeText('');
        }
      } catch {
        // Clipboard API may not be available after timeout
      }
    }, clearAfterMs);
  }
}
