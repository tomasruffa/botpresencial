const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { ultimoDiaDelMes } = require('./fechas');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────
// EMPLEADOS
// ─────────────────────────────────────────────

async function getEmpleadoPorTelefono(telefono) {
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('telefono', telefono)
    .eq('activo', true)
    .single();
  if (error) return null;
  return data;
}

async function getEmpleadoPorLegajo(legajo) {
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('legajo', legajo.toUpperCase())
    .eq('activo', true)
    .single();
  if (error) return null;
  return data;
}

// ─────────────────────────────────────────────
// ASISTENCIA — CREATE
// ─────────────────────────────────────────────

async function registrarDias(legajo, fechas, nota = null) {
  // fechas: array de strings 'YYYY-MM-DD'
  const rows = fechas.map(f => ({ legajo, fecha: f, nota }));
  const { data, error } = await supabase
    .from('asistencia')
    .upsert(rows, { onConflict: 'legajo,fecha', ignoreDuplicates: false })
    .select();
  return { data, error };
}

// ─────────────────────────────────────────────
// ASISTENCIA — READ / LIST
// ─────────────────────────────────────────────

async function getAsistenciaMes(legajo, mes, anio) {
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const hasta = ultimoDiaDelMes(mes, anio);

  const { data, error } = await supabase
    .from('asistencia')
    .select('*')
    .eq('legajo', legajo)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true });

  return { data: data || [], error };
}

async function getResumenMensual(legajo, mes, anio) {
  const { data, error } = await supabase
    .from('resumen_mensual')
    .select('*')
    .eq('legajo', legajo)
    .eq('mes', mes)
    .eq('anio', anio)
    .single();
  return { data, error };
}

async function getHistorialMeses(legajo) {
  const { data, error } = await supabase
    .from('resumen_mensual')
    .select('mes, anio, dias_asistidos, fechas')
    .eq('legajo', legajo)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })
    .limit(6);
  return { data: data || [], error };
}

// ─────────────────────────────────────────────
// ASISTENCIA — UPDATE (editar nota de un día)
// ─────────────────────────────────────────────

async function editarNotaDia(legajo, fecha, nota) {
  const { data, error } = await supabase
    .from('asistencia')
    .update({ nota })
    .eq('legajo', legajo)
    .eq('fecha', fecha)
    .select()
    .single();
  return { data, error };
}

// ─────────────────────────────────────────────
// ASISTENCIA — DELETE
// ─────────────────────────────────────────────

async function eliminarDia(legajo, fecha) {
  const { data, error } = await supabase
    .from('asistencia')
    .delete()
    .eq('legajo', legajo)
    .eq('fecha', fecha)
    .select()
    .single();
  return { data, error };
}

async function eliminarMes(legajo, mes, anio) {
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const hasta = ultimoDiaDelMes(mes, anio);
  const { data, error } = await supabase
    .from('asistencia')
    .delete()
    .eq('legajo', legajo)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .select();
  return { data: data || [], error };
}

module.exports = {
  getEmpleadoPorTelefono,
  getEmpleadoPorLegajo,
  registrarDias,
  getAsistenciaMes,
  getResumenMensual,
  getHistorialMeses,
  editarNotaDia,
  eliminarDia,
  eliminarMes,
};
