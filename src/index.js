require('dotenv').config();
const http = require('http');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { procesarMensaje } = require('../bot');

// ─────────────────────────────────────────────
// HTTP HEALTH SERVER (for Fly.io / platforms that expect a listening port)
// ─────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'whatsapp-asistencia-bot' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Health server listening on 0.0.0.0:${PORT}`);
});

// ─────────────────────────────────────────────
// CLIENTE WHATSAPP
// ─────────────────────────────────────────────

const puppeteerOpts = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--disable-gpu',
    '--disable-features=site-per-process',
  ],
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'asistencia-bot' }),
  puppeteer: puppeteerOpts,
});

// Mostrar QR para escanear
client.on('qr', (qr) => {
  console.log('\n📱 Escaneá este QR con WhatsApp > Dispositivos vinculados:\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Autenticado correctamente.');
});

client.on('ready', () => {
  console.log('🤖 Bot de asistencia listo y escuchando mensajes...');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Fallo de autenticación:', msg);
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Cliente desconectado:', reason);
});

// ─────────────────────────────────────────────
// PROCESAR MENSAJES ENTRANTES
// ─────────────────────────────────────────────

client.on('message', async (msg) => {
  // Ignorar mensajes de grupos
  if (msg.isGroupMsg) return;
  // Ignorar mensajes propios
  if (msg.fromMe) return;
  // Ignorar media sin texto
  if (!msg.body || msg.body.trim() === '') return;

  const telefono = msg.from.replace('@c.us', ''); // ej: 5491123456789
  const texto = msg.body.trim();

  console.log(`📨 [${telefono}] ${texto}`);

  try {
    const respuesta = await procesarMensaje(telefono, texto);
    if (respuesta) {
      await msg.reply(respuesta);
      console.log(`📤 [${telefono}] Respuesta enviada.`);
    }
  } catch (err) {
    console.error(`❌ Error procesando mensaje de ${telefono}:`, err);
    await msg.reply('⚠️ Ocurrió un error inesperado. Por favor intentá de nuevo.');
  }
});

// ─────────────────────────────────────────────
// ARRANCAR
// ─────────────────────────────────────────────

console.log('🚀 Iniciando bot de asistencia...');
client.initialize();
