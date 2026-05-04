import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
console.log('[WHATSAPP] Inicializando cliente...');
const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'chromium-browser'
  },
  authStrategy: new LocalAuth({
    clientId: "adminbarber",
    dataPath: './auth_data'
  })
});
client.on('qr', (qr) => {
  console.log('[WHATSAPP] 📱 Escaneie o QR Code abaixo com o seu WhatsApp:');
  qrcode.generate(qr, { small: true });
});
client.on('ready', () => {
  console.log('[WHATSAPP] ✅ Cliente conectado e pronto!');
});
client.on('auth_failure', (msg) => {
  console.error('[WHATSAPP] ❌ Falha na autenticação:', msg);
});
client.on('disconnected', (reason) => {
  console.warn('[WHATSAPP] 🔌 Desconectado. Motivo:', reason);
  console.log('[WHATSAPP] Tentando reconectar automaticamente...');
});
client.initialize();
export default client;