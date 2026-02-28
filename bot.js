const db = require('./supabase');
const { mesActual, parsearFecha, parsearMesAnio, diasObligatorios, formatFecha, nombreMes, semanasDelMes } = require('./fechas');
const { getSesion, setSesion, resetSesion, ESTADOS } = require('./sesiones');

// ─────────────────────────────────────────────
// HELPERS DE TEXTO
// ─────────────────────────────────────────────

function menuPrincipal(nombre) {
  return (
    `👋 Hola *${nombre}*! ¿Qué querés hacer?\n\n` +
    `1️⃣ *Registrar* días que fui esta semana\n` +
    `2️⃣ *Ver* resumen del mes\n` +
    `3️⃣ *Listar* todos mis días registrados\n` +
    `4️⃣ *Editar* nota de un día\n` +
    `5️⃣ *Eliminar* un día puntual\n` +
    `6️⃣ *Borrar* mes completo\n` +
    `7️⃣ *Historial* últimos 6 meses\n\n` +
    `Respondé con el número o la palabra en negrita.\n` +
    `Escribí *salir* en cualquier momento para volver acá.`
  );
}

function resumenMes(diasAsistidos, mes, anio, fechas = []) {
  const obligatorios = diasObligatorios(mes, anio);
  const semanas = semanasDelMes(mes, anio);
  const faltantes = Math.max(0, obligatorios - diasAsistidos);
  const estado = diasAsistidos >= obligatorios ? '✅ Cumpliste el objetivo!' : `⚠️ Te faltan *${faltantes}* día(s)`;

  const listaFechas = fechas.length
    ? fechas.map(f => `  • ${formatFecha(f)}`).join('\n')
    : '  (ninguno registrado)';

  return (
    `📅 *${nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1)} ${anio}*\n\n` +
    `🗓 Semanas del mes: *${semanas}*\n` +
    `🎯 Días requeridos: *${obligatorios}* (${semanas} × 2)\n` +
    `✔️ Días registrados: *${diasAsistidos}*\n\n` +
    `${estado}\n\n` +
    `📋 Fechas:\n${listaFechas}`
  );
}

// ─────────────────────────────────────────────
// DISPATCHER PRINCIPAL
// ─────────────────────────────────────────────

async function procesarMensaje(telefono, texto) {
  const sesion = getSesion(telefono);
  const msg = texto.trim().toLowerCase();

  // Comando global: salir / cancelar / menú
  if (['salir', 'cancelar', 'menu', 'menú', 'inicio', '0'].includes(msg)) {
    const empleado = sesion.datos.empleado;
    if (empleado) {
      setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
      return menuPrincipal(empleado.nombre);
    } else {
      resetSesion(telefono);
      return '👋 Sesión reiniciada. Enviá tu legajo para comenzar.';
    }
  }

  switch (sesion.estado) {
    case ESTADOS.INICIO:
      return await handleInicio(telefono, texto, sesion);

    case ESTADOS.ESPERANDO_LEGAJO:
      return await handleLegajo(telefono, texto, sesion);

    case ESTADOS.MENU_PRINCIPAL:
      return await handleMenu(telefono, msg, sesion);

    case ESTADOS.REG_ESPERANDO_FECHAS:
      return await handleRegistrarFechas(telefono, texto, sesion);

    case ESTADOS.LIST_ESPERANDO_MES:
      return await handleListarMes(telefono, texto, sesion);

    case ESTADOS.EDIT_ESPERANDO_MES:
      return await handleEditarEsperandoMes(telefono, texto, sesion);
    case ESTADOS.EDIT_ELIGIENDO_DIA:
      return await handleEditarEligiendoDia(telefono, texto, sesion);
    case ESTADOS.EDIT_NUEVA_NOTA:
      return await handleEditarNuevaNota(telefono, texto, sesion);

    case ESTADOS.DEL_ESPERANDO_MES:
      return await handleEliminarEsperandoMes(telefono, texto, sesion);
    case ESTADOS.DEL_ELIGIENDO_DIA:
      return await handleEliminarEligiendoDia(telefono, texto, sesion);
    case ESTADOS.DEL_CONFIRMAR:
      return await handleEliminarConfirmar(telefono, msg, sesion);

    case ESTADOS.DELMES_ESPERANDO_MES:
      return await handleBorrarMesEsperando(telefono, texto, sesion);
    case ESTADOS.DELMES_CONFIRMAR:
      return await handleBorrarMesConfirmar(telefono, msg, sesion);

    default:
      resetSesion(telefono);
      return '🔄 Algo salió mal. Enviá tu legajo para empezar de nuevo.';
  }
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

async function handleInicio(telefono, texto, sesion) {
  // Primero intento autenticar por teléfono
  const empleado = await db.getEmpleadoPorTelefono(telefono);
  if (empleado) {
    setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
    return (
      `✅ Te reconocí por tu número!\n` +
      `Legajo: *${empleado.legajo}* — ${empleado.nombre}\n\n` +
      menuPrincipal(empleado.nombre)
    );
  }
  // Si no está registrado el teléfono, pido legajo
  setSesion(telefono, ESTADOS.ESPERANDO_LEGAJO, {});
  return (
    `👋 Hola! Soy el bot de asistencia presencial.\n\n` +
    `No encontré tu número en el sistema. ` +
    `¿Cuál es tu *número de legajo*?`
  );
}

async function handleLegajo(telefono, texto, sesion) {
  const empleado = await db.getEmpleadoPorLegajo(texto.trim().toUpperCase());
  if (!empleado) {
    return `❌ No encontré el legajo *${texto.trim().toUpperCase()}*. Revisá y reintentá.`;
  }
  setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
  return (
    `✅ Legajo encontrado: *${empleado.nombre}*\n\n` +
    menuPrincipal(empleado.nombre)
  );
}

async function handleMenu(telefono, msg, sesion) {
  const { empleado } = sesion.datos;

  if (['1', 'registrar', 'registro'].includes(msg)) {
    const { mes, anio } = mesActual();
    setSesion(telefono, ESTADOS.REG_ESPERANDO_FECHAS, { empleado, mes, anio });
    return (
      `📝 *Registrar asistencia*\n\n` +
      `Mes actual: *${nombreMes(mes)} ${anio}*\n\n` +
      `Escribí los días que fuiste a la oficina, separados por coma.\n\n` +
      `Formatos aceptados:\n` +
      `  • *hoy*\n` +
      `  • Número de día: *5, 12, 19*\n` +
      `  • DD/MM: *05/02, 12/02*\n` +
      `  • Nombre del día: *lunes, martes*\n\n` +
      `Ejemplo: _hoy, 5, 12_`
    );
  }

  if (['2', 'ver', 'resumen'].includes(msg)) {
    const { mes, anio } = mesActual();
    const { data } = await db.getAsistenciaMes(empleado.legajo, mes, anio);
    const fechas = data.map(r => r.fecha);
    return resumenMes(fechas.length, mes, anio, fechas);
  }

  if (['3', 'listar', 'lista'].includes(msg)) {
    setSesion(telefono, ESTADOS.LIST_ESPERANDO_MES, { empleado });
    return `📋 ¿De qué mes querés el listado?\nEjemplo: _actual_, _febrero 2025_, _2/2025_`;
  }

  if (['4', 'editar', 'edit'].includes(msg)) {
    setSesion(telefono, ESTADOS.EDIT_ESPERANDO_MES, { empleado });
    return `✏️ ¿De qué mes querés editar?\nEjemplo: _actual_, _febrero 2025_`;
  }

  if (['5', 'eliminar', 'borrar día', 'borrar dia'].includes(msg)) {
    setSesion(telefono, ESTADOS.DEL_ESPERANDO_MES, { empleado });
    return `🗑 ¿De qué mes es el día a eliminar?\nEjemplo: _actual_, _enero 2025_`;
  }

  if (['6', 'borrar mes', 'borrar'].includes(msg)) {
    setSesion(telefono, ESTADOS.DELMES_ESPERANDO_MES, { empleado });
    return `⚠️ ¿Qué mes querés borrar completo?\nEjemplo: _actual_, _enero 2025_`;
  }

  if (['7', 'historial'].includes(msg)) {
    const { data } = await db.getHistorialMeses(empleado.legajo);
    if (!data.length) return '📭 No tenés registros todavía.';

    const texto = data.map(r => {
      const ob = diasObligatorios(r.mes, r.anio);
      const emoji = r.dias_asistidos >= ob ? '✅' : '⚠️';
      return `${emoji} *${nombreMes(r.mes)} ${r.anio}*: ${r.dias_asistidos}/${ob} días`;
    }).join('\n');

    return `📊 *Últimos 6 meses*\n\n${texto}`;
  }

  return menuPrincipal(empleado.nombre);
}

// ── REGISTRAR ──

async function handleRegistrarFechas(telefono, texto, sesion) {
  const { empleado, mes, anio } = sesion.datos;

  const partes = texto.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const fechasParsed = [];
  const errores = [];

  for (const parte of partes) {
    const f = parsearFecha(parte, mes, anio);
    if (f) {
      fechasParsed.push(f);
    } else {
      errores.push(parte);
    }
  }

  if (!fechasParsed.length) {
    return (
      `❌ No pude interpretar ninguna fecha.\n` +
      `Intentá con: *hoy*, *5*, *05/02*, *lunes*\n` +
      `O escribí *salir* para cancelar.`
    );
  }

  const { data, error } = await db.registrarDias(empleado.legajo, fechasParsed);

  if (error) {
    console.error(error);
    return `❌ Error al guardar: ${error.message}`;
  }

  const guardadas = fechasParsed.map(f => `  ✔ ${formatFecha(f)}`).join('\n');
  const advertencia = errores.length
    ? `\n⚠️ No pude interpretar: _${errores.join(', ')}_` : '';

  // Mostrar resumen actualizado
  const { data: todos } = await db.getAsistenciaMes(empleado.legajo, mes, anio);
  const totalDias = todos ? todos.length : fechasParsed.length;
  const obligatorios = diasObligatorios(mes, anio);
  const faltantes = Math.max(0, obligatorios - totalDias);
  const estadoFinal = totalDias >= obligatorios
    ? '🎉 Completaste el objetivo del mes!'
    : `Todavía te faltan *${faltantes}* día(s) este mes.`;

  setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
  return (
    `✅ *Registrado!*\n\n${guardadas}${advertencia}\n\n` +
    `📊 Total en ${nombreMes(mes)}: *${totalDias}/${obligatorios}* días\n` +
    `${estadoFinal}\n\n` +
    `_(Escribí *menú* para más opciones)_`
  );
}

// ── LISTAR ──

async function handleListarMes(telefono, texto, sesion) {
  const { empleado } = sesion.datos;
  const parsedMes = parsearMesAnio(texto);
  if (!parsedMes) {
    return `❌ No entendí el mes. Probá: _actual_, _febrero 2025_, _2/2025_`;
  }

  const { mes, anio } = parsedMes;
  const { data } = await db.getAsistenciaMes(empleado.legajo, mes, anio);
  const fechas = data.map(r => r.fecha);

  setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
  return resumenMes(fechas.length, mes, anio, fechas);
}

// ── EDITAR ──

async function handleEditarEsperandoMes(telefono, texto, sesion) {
  const { empleado } = sesion.datos;
  const parsedMes = parsearMesAnio(texto);
  if (!parsedMes) return `❌ No entendí el mes. Probá: _actual_, _febrero 2025_`;

  const { mes, anio } = parsedMes;
  const { data } = await db.getAsistenciaMes(empleado.legajo, mes, anio);

  if (!data.length) {
    setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
    return `📭 No tenés días registrados en ${nombreMes(mes)} ${anio}.`;
  }

  const lista = data.map((r, i) =>
    `${i + 1}. ${formatFecha(r.fecha)}${r.nota ? ` — _${r.nota}_` : ''}`
  ).join('\n');

  setSesion(telefono, ESTADOS.EDIT_ELIGIENDO_DIA, { empleado, mes, anio, dias: data });
  return (
    `✏️ *Días en ${nombreMes(mes)} ${anio}:*\n\n${lista}\n\n` +
    `¿Qué número de día querés editar?`
  );
}

async function handleEditarEligiendoDia(telefono, texto, sesion) {
  const { empleado, mes, anio, dias } = sesion.datos;
  const num = parseInt(texto.trim());
  if (isNaN(num) || num < 1 || num > dias.length) {
    return `❌ Ingresá un número entre 1 y ${dias.length}.`;
  }
  const diaSeleccionado = dias[num - 1];
  setSesion(telefono, ESTADOS.EDIT_NUEVA_NOTA, { empleado, mes, anio, dias, diaSeleccionado });
  return (
    `✏️ Día seleccionado: *${formatFecha(diaSeleccionado.fecha)}*\n\n` +
    `Escribí la nueva nota (o *-* para borrarla):`
  );
}

async function handleEditarNuevaNota(telefono, texto, sesion) {
  const { empleado, mes, anio, diaSeleccionado } = sesion.datos;
  const nota = texto.trim() === '-' ? null : texto.trim();
  const { error } = await db.editarNotaDia(empleado.legajo, diaSeleccionado.fecha, nota);

  setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
  if (error) return `❌ Error al editar: ${error.message}`;
  return `✅ Nota actualizada en *${formatFecha(diaSeleccionado.fecha)}*.`;
}

// ── ELIMINAR DÍA ──

async function handleEliminarEsperandoMes(telefono, texto, sesion) {
  const { empleado } = sesion.datos;
  const parsedMes = parsearMesAnio(texto);
  if (!parsedMes) return `❌ No entendí el mes. Probá: _actual_, _enero 2025_`;

  const { mes, anio } = parsedMes;
  const { data } = await db.getAsistenciaMes(empleado.legajo, mes, anio);

  if (!data.length) {
    setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
    return `📭 No tenés días registrados en ${nombreMes(mes)} ${anio}.`;
  }

  const lista = data.map((r, i) => `${i + 1}. ${formatFecha(r.fecha)}`).join('\n');
  setSesion(telefono, ESTADOS.DEL_ELIGIENDO_DIA, { empleado, mes, anio, dias: data });
  return (
    `🗑 *Días en ${nombreMes(mes)} ${anio}:*\n\n${lista}\n\n` +
    `¿Qué número querés eliminar?`
  );
}

async function handleEliminarEligiendoDia(telefono, texto, sesion) {
  const { empleado, mes, anio, dias } = sesion.datos;
  const num = parseInt(texto.trim());
  if (isNaN(num) || num < 1 || num > dias.length) {
    return `❌ Ingresá un número entre 1 y ${dias.length}.`;
  }
  const diaSeleccionado = dias[num - 1];
  setSesion(telefono, ESTADOS.DEL_CONFIRMAR, { empleado, diaSeleccionado });
  return (
    `⚠️ ¿Confirmas eliminar *${formatFecha(diaSeleccionado.fecha)}*?\n\n` +
    `Respondé *sí* o *no*.`
  );
}

async function handleEliminarConfirmar(telefono, msg, sesion) {
  const { empleado, diaSeleccionado } = sesion.datos;
  setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });

  if (!['si', 'sí', 'yes', 's'].includes(msg)) {
    return `❌ Eliminación cancelada.`;
  }
  const { error } = await db.eliminarDia(empleado.legajo, diaSeleccionado.fecha);
  if (error) return `❌ Error al eliminar: ${error.message}`;
  return `✅ *${formatFecha(diaSeleccionado.fecha)}* eliminado correctamente.`;
}

// ── BORRAR MES ──

async function handleBorrarMesEsperando(telefono, texto, sesion) {
  const { empleado } = sesion.datos;
  const parsedMes = parsearMesAnio(texto);
  if (!parsedMes) return `❌ No entendí el mes.`;

  const { mes, anio } = parsedMes;
  const { data } = await db.getAsistenciaMes(empleado.legajo, mes, anio);

  if (!data.length) {
    setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });
    return `📭 No tenés registros en ${nombreMes(mes)} ${anio}.`;
  }

  setSesion(telefono, ESTADOS.DELMES_CONFIRMAR, { empleado, mes, anio, total: data.length });
  return (
    `⚠️ Vas a borrar *${data.length} días* de *${nombreMes(mes)} ${anio}*.\n\n` +
    `Esta acción no se puede deshacer. ¿Confirmás? Respondé *sí* o *no*.`
  );
}

async function handleBorrarMesConfirmar(telefono, msg, sesion) {
  const { empleado, mes, anio, total } = sesion.datos;
  setSesion(telefono, ESTADOS.MENU_PRINCIPAL, { empleado });

  if (!['si', 'sí', 'yes', 's'].includes(msg)) {
    return `❌ Borrado cancelado.`;
  }
  const { error } = await db.eliminarMes(empleado.legajo, mes, anio);
  if (error) return `❌ Error: ${error.message}`;
  return `✅ Se borraron *${total} días* de *${nombreMes(mes)} ${anio}*.`;
}

module.exports = { procesarMensaje };
