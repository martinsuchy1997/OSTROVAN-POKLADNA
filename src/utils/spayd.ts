/**
 * Czech QR Platba (Short Payment Descriptor - SPAYD) utilities
 */

export function formatCzechAccount(acc: string): string {
  return acc.trim();
}

/**
 * Basic converter for Czech bank account to IBAN format (CZkk bbbb pppppp nnnnnnnnnn)
 * This enables Czech mobile banking apps to scan standard SPAYD QR codes.
 */
export function czechAccountToIban(accountStr: string): string {
  const clean = accountStr.trim();
  if (clean.toUpperCase().startsWith('CZ')) {
    return clean.replace(/\s+/g, '').toUpperCase();
  }

  // format: [prefix-]number/bankCode
  const slashIdx = clean.indexOf('/');
  if (slashIdx === -1) {
    return '';
  }

  const bankCode = clean.substring(slashIdx + 1).trim().padStart(4, '0');
  const accountPart = clean.substring(0, slashIdx).trim();

  let prefix = '000000';
  let number = accountPart;

  if (accountPart.includes('-')) {
    const dashParts = accountPart.split('-');
    prefix = dashParts[0].padStart(6, '0');
    number = dashParts[1].padStart(10, '0');
  } else {
    number = accountPart.padStart(10, '0');
  }

  const bban = `${bankCode}${prefix}${number}`;

  // Calculate check digits for CZ (C=12, Z=35 -> 123500)
  // Numeric string: bban + 123500
  const numericStr = `${bban}123500`;
  
  // Modulo 97 on large numeric string
  let remainder = 0;
  for (let i = 0; i < numericStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numericStr[i], 10)) % 97;
  }
  const checkDigits = (98 - remainder).toString().padStart(2, '0');

  return `CZ${checkDigits}${bban}`;
}

/**
 * Generate SPAYD format string for Czech banking apps
 */
export function generateSpaydString(params: {
  account: string;
  amount?: number;
  message?: string;
  variableSymbol?: string;
}): string {
  let iban = params.account.trim();
  if (!iban.toUpperCase().startsWith('CZ')) {
    iban = czechAccountToIban(iban);
  }

  if (!iban) return '';

  let spayd = `SPD*1.0*ACC:${iban}`;

  if (params.amount && params.amount > 0) {
    spayd += `*AM:${params.amount.toFixed(2)}`;
    spayd += `*CC:CZK`;
  }

  if (params.message) {
    // SPAYD messages can't contain asterisks and are best ASCII transliterated
    const cleanMsg = params.message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[*~]/g, ' ')
      .trim()
      .substring(0, 60);
    if (cleanMsg) {
      spayd += `*MSG:${cleanMsg}`;
    }
  }

  if (params.variableSymbol) {
    const vs = params.variableSymbol.replace(/\D/g, '').substring(0, 10);
    if (vs) {
      spayd += `*X-VS:${vs}`;
    }
  }

  spayd += '*';
  return spayd;
}
