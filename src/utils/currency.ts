/**
 * Utility functions for Indian Rupee (INR) formatting and manipulation
 */

export function formatINR(amount: number | null | undefined, options: { showDecimals?: boolean; showSymbol?: boolean } = {}): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return options.showSymbol !== false ? '₹0' : '0';
  }

  const { showDecimals = false, showSymbol = true } = options;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const roundedAmount = showDecimals ? absAmount.toFixed(2) : Math.round(absAmount).toString();
  const [integerPart, decimalPart] = roundedAmount.split('.');

  // Indian numbering system formatting (e.g., 1,00,000)
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = decimalPart !== undefined && showDecimals 
    ? `${formattedInteger}.${decimalPart}` 
    : formattedInteger;

  const symbol = showSymbol ? '₹' : '';
  return isNegative ? `-${symbol}${result}` : `${symbol}${result}`;
}

/**
 * Format short amount (e.g. ₹1.5L, ₹50k)
 */
export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `₹${amount}`;
}

/**
 * Convert number to Indian words representation (e.g. 100000 -> One Lakh Rupees)
 */
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees';
  
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  }

  let n = Math.floor(amount);
  let output = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore > 0) output += numToWords(crore) + 'Crore ';
  if (lakh > 0) output += numToWords(lakh) + 'Lakh ';
  if (thousand > 0) output += numToWords(thousand) + 'Thousand ';
  if (hundred > 0) output += numToWords(hundred) + 'Hundred ';
  if (n > 0) {
    if (output !== '') output += 'and ';
    output += numToWords(n);
  }

  return output.trim() + ' Rupees Only';
}
