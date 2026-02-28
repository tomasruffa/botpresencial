require('dotenv').config();
const http = require('http');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const { procesarMensaje } = require('../bot');

// ─────────────────────────────────────────────
// HTTP HEALTH SERVER (for Fly.io / platforms that expect a listening port)
// ─────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;

// Último QR generado (data URL) para servir en /qr cuando corre en servidor
let lastQRDataUrl = null;

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'whatsapp-asistencia-bot' }));
    return;
  }

  if (req.url === '/qr' || req.url === '/qr/') {
    if (!lastQRDataUrl) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>QR WhatsApp</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:2rem;">
          <h1>📱 Conectar WhatsApp</h1>
          <p>Esperando código QR… Recargá esta página en unos segundos.</p>
          <p><small>En el servidor: el bot debe estar iniciado y esperando escaneo.</small></p>
        </body></html>
      `);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>QR WhatsApp</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:2rem;">
        <h1>📱 Conectar WhatsApp</h1>
        <p>Escaneá este código con <strong>WhatsApp → Dispositivos vinculados → Vincular dispositivo</strong>.</p>
        <p><img src="${lastQRDataUrl}" alt="QR" style="max-width:320px;" /></p>
        <p><small>Si el QR expiró, recargá la página.</small></p>
      </body></html>
    `);
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

// Mostrar QR para escanear (terminal + guardar para /qr en servidor)
client.on('qr', async (qr) => {
  console.log('\n📱 Escaneá este QR con WhatsApp > Dispositivos vinculados:\n');
  qrcodeTerminal.generate(qr, { small: true });
  try {
    lastQRDataUrl = await qrcode.toDataURL(qr);
  } catch (e) {
    console.error('Error generando QR para web:', e);
  }
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
