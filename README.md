# 🤖 Bot WhatsApp — Asistencia Presencial

Bot de WhatsApp para registrar y hacer seguimiento de los días que vas a la oficina. 
Se conecta a Supabase como base de datos. Soporta CRUDL completo por mes.

---

## 📋 Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)
- WhatsApp en tu celular

---

## ⚙️ Instalación

```bash
# 1. Clonar / copiar el proyecto
cd whatsapp-asistencia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editá .env con tus credenciales de Supabase
```

---

## 🗄️ Configurar Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo
2. Andá a **SQL Editor** y ejecutá el contenido de `sql/schema.sql`
3. Copiá tu **Project URL** y **anon public key** desde *Settings > API*
4. Pegálos en tu archivo `.env`

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
TIMEZONE=America/Argentina/Buenos_Aires
```

5. Editá el empleado de prueba en el SQL con tu legajo y teléfono real:
```sql
INSERT INTO empleados (legajo, nombre, telefono) VALUES
  ('TU_LEGAJO', 'Tu Nombre', '549XXXXXXXXXX');
```
> ⚠️ El teléfono va **sin** el `+`, ejemplo: `5491123456789`

---

## ▶️ Arrancar el bot

```bash
npm start
# o para desarrollo con auto-reload:
npm run dev
```

Vas a ver un **QR en la terminal**. Escaneálo desde WhatsApp:  
`⋮ > Dispositivos vinculados > Vincular dispositivo`

---

## 💬 Cómo usar el bot

Escribile al número de WhatsApp vinculado:

### Flujo básico
1. El bot te identifica por tu número de teléfono automáticamente
2. Si no está registrado, te pide el legajo
3. Mostrará el menú principal

### Menú de opciones

| Opción | Comando | Descripción |
|--------|---------|-------------|
| **1** | `registrar` | Registrá los días que fuiste |
| **2** | `ver` | Resumen del mes actual |
| **3** | `listar` | Ver días de cualquier mes |
| **4** | `editar` | Editar nota de un día |
| **5** | `eliminar` | Borrar un día puntual |
| **6** | `borrar` | Borrar un mes completo |
| **7** | `historial` | Últimos 6 meses |

### Registrar días
Podés escribir las fechas en varios formatos separadas por coma:
```
hoy
5, 12, 19
05/02, 12/02
lunes, miércoles
```

### Objetivo mensual
El bot calcula automáticamente cuántos días debés ir:
- **2 días por cada semana del mes**
- Ejemplo: mes con 4 semanas → 8 días requeridos

---

## 🗂 Estructura del proyecto

```
whatsapp-asistencia/
├── src/
│   ├── index.js      ← Entry point, cliente WhatsApp
│   ├── bot.js        ← Lógica de conversación (FSM)
│   ├── supabase.js   ← Operaciones de base de datos
│   ├── fechas.js     ← Utilidades de fechas
│   └── sesiones.js   ← Estado de conversación por usuario
├── sql/
│   └── schema.sql    ← Tablas y vistas para Supabase
├── .env.example
├── package.json
└── README.md
```

---

## 🐛 Problemas comunes

**El QR no aparece / no conecta**  
→ Borrá la carpeta `.wwebjs_auth/` y reiniciá

**Error de Puppeteer en Linux**  
→ Instalá dependencias del sistema:
```bash
sudo apt-get install -y chromium-browser libgbm-dev
```

**"Legajo no encontrado"**  
→ Verificá que el teléfono en la DB no tiene `+` y coincide exactamente con el número que escribe

---

## 📌 Notas

- Las sesiones se guardan **en memoria**, se resetean al reiniciar el bot
- Los datos de asistencia persisten en Supabase
- Podés agregar más empleados directamente en la tabla `empleados` de Supabase
