import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/** * GET /whatsapp/status * Retorna se o WhatsApp está conectado */
app.get('/whatsapp/status', (req, res) => {
  const sessionPath = path.join(__dirname, '../worker/auth_data/session.json');
  let connected = false;
  
  try {
    if (fs.existsSync(sessionPath)) {
      const stats = fs.statSync(sessionPath);
      if (stats.size > 100) connected = true;
    }
  } catch (e) {
    connected = false;
  }
  
  res.json({
    status: 'ok',
    whatsapp_connected: connected,
    message: connected ? 'WhatsApp conectado' : 'WhatsApp desconectado'
  });
});

/** * GET /whatsapp/qrcode * Retorna instruções para visualizar o QR Code */
app.get('/whatsapp/qrcode', (req, res) => {
  res.json({
    status: 'info',
    message: 'O QR Code é exibido nos logs do container "worker".',
    command: 'docker-compose logs -f worker'
  });
});

app.listen(PORT, () => {
  console.log(`[API] 🚀 Servidor rodando na porta ${PORT}`);
});