/**
 * Gestiona el estado de conversación (FSM) por número de teléfono.
 * No persiste entre reinicios — es en memoria.
 */

const sesiones = new Map();

const ESTADOS = {
  INICIO: 'INICIO',
  ESPERANDO_LEGAJO: 'ESPERANDO_LEGAJO',
  MENU_PRINCIPAL: 'MENU_PRINCIPAL',
  // Registrar
  REG_ESPERANDO_FECHAS: 'REG_ESPERANDO_FECHAS',
  // Listar/Ver
  LIST_ESPERANDO_MES: 'LIST_ESPERANDO_MES',
  // Editar
  EDIT_ESPERANDO_MES: 'EDIT_ESPERANDO_MES',
  EDIT_ELIGIENDO_DIA: 'EDIT_ELIGIENDO_DIA',
  EDIT_NUEVA_NOTA: 'EDIT_NUEVA_NOTA',
  // Eliminar día
  DEL_ESPERANDO_MES: 'DEL_ESPERANDO_MES',
  DEL_ELIGIENDO_DIA: 'DEL_ELIGIENDO_DIA',
  DEL_CONFIRMAR: 'DEL_CONFIRMAR',
  // Eliminar mes completo
  DELMES_ESPERANDO_MES: 'DELMES_ESPERANDO_MES',
  DELMES_CONFIRMAR: 'DELMES_CONFIRMAR',
};

function getSesion(telefono) {
  if (!sesiones.has(telefono)) {
    sesiones.set(telefono, { estado: ESTADOS.INICIO, datos: {} });
  }
  return sesiones.get(telefono);
}

function setSesion(telefono, estado, datos = {}) {
  sesiones.set(telefono, { estado, datos });
}

function resetSesion(telefono) {
  sesiones.set(telefono, { estado: ESTADOS.INICIO, datos: {} });
}

module.exports = { getSesion, setSesion, resetSesion, ESTADOS };
