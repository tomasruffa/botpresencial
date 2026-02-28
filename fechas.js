const { format, parse, isValid, getMonth, getYear, startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth } = require('date-fns');
const { es } = require('date-fns/locale');

const DIAS_NOMBRE = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES_NOMBRE = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function hoy() {
  return new Date();
}

function mesActual() {
  const d = hoy();
  return { mes: d.getMonth() + 1, anio: d.getFullYear() };
}

/**
 * Convierte texto de fecha a 'YYYY-MM-DD'
 * Acepta: "lunes", "martes 5", "05/02", "5/2", "2025-02-05", "hoy"
 */
function parsearFecha(texto, refMes, refAnio) {
  texto = texto.trim().toLowerCase();

  if (texto === 'hoy') {
    return format(hoy(), 'yyyy-MM-dd');
  }

  // Formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const d = new Date(texto + 'T12:00:00');
    return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
  }

  // Formato DD/MM o DD/MM/YYYY
  const slashMatch = texto.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (slashMatch) {
    const dia = parseInt(slashMatch[1]);
    const mes = parseInt(slashMatch[2]);
    const anio = slashMatch[3] ? parseInt(slashMatch[3]) : refAnio;
    const d = new Date(anio, mes - 1, dia, 12);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
  }

  // Nombre de día (lunes, martes...) → próximo occurrencia en el mes de referencia
  const diaIndex = DIAS_NOMBRE.indexOf(texto.split(' ')[0]);
  if (diaIndex !== -1) {
    // Si viene "lunes 3" → tercer lunes del mes
    const partes = texto.split(' ');
    const nroOcurrencia = partes[1] ? parseInt(partes[1]) : 1;
    return encontrarDiaSemana(diaIndex, nroOcurrencia, refMes, refAnio);
  }

  // Número de día solo: "5" → día 5 del mes ref
  if (/^\d{1,2}$/.test(texto)) {
    const d = new Date(refAnio, refMes - 1, parseInt(texto), 12);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
  }

  return null;
}

function encontrarDiaSemana(diaSemana, ocurrencia, mes, anio) {
  // diaSemana: 0=dom...6=sab
  let count = 0;
  const diasEnMes = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anio, mes - 1, d, 12);
    if (fecha.getDay() === diaSemana) {
      count++;
      if (count === ocurrencia) return format(fecha, 'yyyy-MM-dd');
    }
  }
  return null;
}

/**
 * Cuenta cuántas semanas COMPLETAS (lun-vie) tiene el mes
 * Para el cálculo de cuántos días debería ir (semanas × 2)
 */
function semanasDelMes(mes, anio) {
  const inicio = startOfMonth(new Date(anio, mes - 1, 1));
  const fin = endOfMonth(new Date(anio, mes - 1, 1));
  const semanas = eachWeekOfInterval({ start: inicio, end: fin }, { weekStartsOn: 1 });
  return semanas.length;
}

function diasObligatorios(mes, anio) {
  return semanasDelMes(mes, anio) * 2;
}

/** Último día del mes en formato YYYY-MM-DD (para rangos en DB). */
function ultimoDiaDelMes(mes, anio) {
  const d = endOfMonth(new Date(anio, mes - 1, 1));
  return format(d, 'yyyy-MM-dd');
}

function formatFecha(fechaStr) {
  const d = new Date(fechaStr + 'T12:00:00');
  const nombre = DIAS_NOMBRE[d.getDay()];
  return `${nombre} ${d.getDate()}/${d.getMonth() + 1}`;
}

function nombreMes(mes) {
  return MESES_NOMBRE[mes - 1];
}

function parsearMesAnio(texto) {
  // "febrero 2025", "2/2025", "02/2025", "actual"
  texto = texto.trim().toLowerCase();
  if (texto === 'actual' || texto === 'este mes') {
    return mesActual();
  }
  const slashMatch = texto.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return { mes: parseInt(slashMatch[1]), anio: parseInt(slashMatch[2]) };
  }
  for (let i = 0; i < MESES_NOMBRE.length; i++) {
    if (texto.startsWith(MESES_NOMBRE[i])) {
      const anioMatch = texto.match(/\d{4}/);
      const anio = anioMatch ? parseInt(anioMatch[0]) : mesActual().anio;
      return { mes: i + 1, anio };
    }
  }
  return null;
}

module.exports = {
  hoy,
  mesActual,
  parsearFecha,
  semanasDelMes,
  diasObligatorios,
  formatFecha,
  nombreMes,
  parsearMesAnio,
  ultimoDiaDelMes,
  MESES_NOMBRE,
};
