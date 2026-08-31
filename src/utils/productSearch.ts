import type { Product } from '../store/useMarketStore';

/**
 * Localiza um produto pelo código de barras com duas etapas:
 * 1. Correspondência exata (code === scannedCode ou box_barcode === scannedCode)
 * 2. Correspondência flexível por raiz/prefixo caso tenha 12 ou 13 dígitos (scannedCode.slice(0, -2))
 */
export function findProductByBarcode(products: Product[], rawCode: string): Product | undefined {
  if (!rawCode) return undefined;
  const scanned = rawCode.trim();
  if (!scanned) return undefined;

  // Passo 1: Correspondência Exata
  const exactMatch = products.find(p => 
    p.code.trim() === scanned || 
    (p.box_barcode && p.box_barcode.trim() === scanned)
  );

  if (exactMatch) {
    return exactMatch;
  }

  // Passo 2: Correspondência Flexível por Raiz/Prefixo (para códigos de 12 ou 13 dígitos)
  if (scanned.length === 12 || scanned.length === 13) {
    const prefix = scanned.slice(0, -2); // primeiros 10 a 11 dígitos

    const prefixMatch = products.find(p => {
      const productCode = p.code.trim();
      const boxCode = p.box_barcode?.trim() || '';
      return productCode.startsWith(prefix) || (boxCode && boxCode.startsWith(prefix));
    });

    if (prefixMatch) {
      return prefixMatch;
    }
  }

  return undefined;
}
