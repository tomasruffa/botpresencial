-- =============================================
-- SCHEMA: Bot WhatsApp Asistencia Presencial
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- Tabla de empleados
CREATE TABLE IF NOT EXISTS empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legajo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) UNIQUE NOT NULL,
  -- Formato sin + ni espacios: 5491123456789
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de asistencia (un registro = un día que fue)
CREATE TABLE IF NOT EXISTS asistencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legajo VARCHAR(20) NOT NULL REFERENCES empleados(legajo) ON UPDATE CASCADE ON DELETE CASCADE,
  fecha DATE NOT NULL,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(legajo, fecha)
);

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asistencia_updated_at ON asistencia;
CREATE TRIGGER asistencia_updated_at
  BEFORE UPDATE ON asistencia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vista resumen por mes
CREATE OR REPLACE VIEW resumen_mensual AS
SELECT
  e.legajo,
  e.nombre,
  EXTRACT(MONTH FROM a.fecha)::INT AS mes,
  EXTRACT(YEAR  FROM a.fecha)::INT AS anio,
  COUNT(*)::INT                     AS dias_asistidos,
  array_agg(a.fecha ORDER BY a.fecha) AS fechas,
  array_agg(a.id    ORDER BY a.fecha) AS ids,
  array_agg(a.nota  ORDER BY a.fecha) AS notas
FROM asistencia a
JOIN empleados e ON e.legajo = a.legajo
GROUP BY e.legajo, e.nombre,
  EXTRACT(MONTH FROM a.fecha), EXTRACT(YEAR FROM a.fecha);

-- Datos de prueba (modificar con tu teléfono real)
INSERT INTO empleados (legajo, nombre, telefono) VALUES
  ('A447761', 'Tomas Ruffa', '5491138033513')
ON CONFLICT DO NOTHING;
