function crc16(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < data.length; i++) {
    const b = data.charCodeAt(i);
    for (let offset = 0; offset < 8; offset++) {
      const bit = ((b >> (7 - offset)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }
  
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEMV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePixPayload(key: string, name: string, city: string, amount: number): string {
  // Clean special characters from name and city
  const cleanName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .substring(0, 25);
    
  const cleanCity = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .substring(0, 15);

  const gui = formatEMV('00', 'br.gov.bcb.pix');
  const pixKey = formatEMV('01', key.trim());
  const merchantAccount = formatEMV('26', gui + pixKey);
  
  const merchantCategory = formatEMV('52', '0000');
  const currency = formatEMV('53', '986');
  const transAmount = formatEMV('54', amount.toFixed(2));
  const country = formatEMV('58', 'BR');
  const merchantName = formatEMV('59', cleanName || 'MINIMERCADO');
  const merchantCity = formatEMV('60', cleanCity || 'SAO PAULO');
  
  const txid = formatEMV('05', '***');
  const additionalData = formatEMV('62', txid);
  
  const payloadPart = 
    formatEMV('00', '01') +
    merchantAccount +
    merchantCategory +
    currency +
    transAmount +
    country +
    merchantName +
    merchantCity +
    additionalData +
    '6304';
    
  const crc = crc16(payloadPart);
  return payloadPart + crc;
}
