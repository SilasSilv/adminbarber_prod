export function normalizePixText(value: string): string {
  return value
    .normalize("NFD")                // separa acentos
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "")   // remove caracteres especiais
    .toUpperCase()                   // converte para maiúsculas
    .trim();
}

export function generatePixCode(payload: {
  pixKey: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  txid?: string;
}): string {
  // 1. NÃO modificar a chave Pix - apenas trim
  const key = payload.pixKey.trim();

  // 2. Normalizar nome e cidade para o padrão Pix: maiúsculas, sem acentos, sem caracteres especiais
  const name = normalizePixText(payload.merchantName).slice(0, 25);
  const city = normalizePixText(payload.merchantCity).slice(0, 15);

  // 3. TXID obrigatório - usar "***" se não fornecido
  const txid = payload.txid ?? "***";

  // 4. Helper TLV correto
  const tlv = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, "0");
    return id + len + value;
  };

  // 5. Merchant Account Information (campo 26)
  const merchantAccountInfo =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", key);

  // 6. Montar campos na ordem correta
  const fields = [
    tlv("00", "01"),                           // Payload Format Indicator
    tlv("01", "11"),                          // Point of Initiation Method
    tlv("26", merchantAccountInfo),           // Merchant Account Information
    tlv("52", "0000"),                        // Merchant Category Code
    tlv("53", "986"),                         // Currency (BRL)
    tlv("54", payload.amount.toFixed(2)),     // Amount
    tlv("58", "BR"),                          // Country Code
    tlv("59", name),                          // Merchant Name
    tlv("60", city),                          // City
    tlv("62", tlv("05", txid))               // Additional Data Field Template (com TXID)
  ];

  // 7. Concatenar e adicionar "6304" antes do CRC
  const payloadString = fields.join("") + "6304";

  // 8. Calcular CRC16-CCITT padrão EMV
  const crc = crc16CCITT(payloadString);

  // 9. Payload final
  const finalPayload = payloadString + crc;

  // 10. Debug temporário
  console.log("PIX PAYLOAD:", finalPayload);

  return finalPayload;
}

// CRC16-CCITT (initial value 0xFFFF, polynomial 0x1021) - padrão EMV
function crc16CCITT(str: string): string {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}