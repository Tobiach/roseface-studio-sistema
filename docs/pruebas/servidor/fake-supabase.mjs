// Cliente de Supabase falso, en memoria, solo para probar la lógica del endpoint sin tocar producción.
export const db = (globalThis.__dbFalso ??= {});
export const log = [];

let contadorIds = 0;

class Consulta {
  constructor(tabla) {
    this.tabla = tabla;
    this.filtros = [];
    this.op = 'select';
    this.parche = null;
    this.uno = null;
    this.tope = null;
  }
  select() { return this; }
  eq(c, v) { this.filtros.push((r) => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.filtros.push((r) => String(r[c]) !== String(v)); return this; }
  // ilike sin comodines (%) se usa acá como "igual, sin importar mayúsculas" — alcanza para las pruebas.
  ilike(c, v) { this.filtros.push((r) => String(r[c] ?? '').toLowerCase() === String(v).toLowerCase()); return this; }
  limit(n) { this.tope = n; return this; }
  update(p) { this.op = 'update'; this.parche = p; return this; }
  insert(filas) { this.op = 'insert'; this.parche = Array.isArray(filas) ? filas : [filas]; return this; }
  delete() { this.op = 'delete'; return this; }
  single() { this.uno = 'single'; return this; }
  maybeSingle() { this.uno = 'maybe'; return this; }
  async _ejecutar() {
    const filas = (db[this.tabla] ??= []);
    if (this.op === 'insert') {
      const nuevas = this.parche.map((f) => ({ id: f.id ?? `${this.tabla}-${++contadorIds}`, ...f }));
      // Simula el índice único turno_unico_por_horario también al insertar.
      if (this.tabla === 'turnos') {
        for (const nueva of nuevas) {
          const choca = filas.some((o) => o.estado !== 'cancelado' && nueva.estado !== 'cancelado' && o.profesional_id === nueva.profesional_id && o.fecha === nueva.fecha && String(o.hora_inicio).slice(0, 5) === String(nueva.hora_inicio).slice(0, 5));
          if (choca) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "turno_unico_por_horario"' } };
        }
      }
      filas.push(...nuevas);
      log.push({ op: 'insert', tabla: this.tabla, filas: nuevas.length });
      const copia = (x) => structuredClone(x);
      if (this.uno) return { data: copia(nuevas[0]) ?? null, error: null };
      return { data: nuevas.map(copia), error: null };
    }
    let coinciden = filas.filter((r) => this.filtros.every((f) => f(r)));
    if (this.tope != null) coinciden = coinciden.slice(0, this.tope);
    if (this.op === 'update') {
      // Simula el índice único turno_unico_por_horario (misma profesional + fecha + hora de inicio, turnos no cancelados).
      if (this.tabla === 'turnos') {
        for (const fila of coinciden) {
          const futuro = { ...fila, ...this.parche };
          const choca = filas.some((o) => o.id !== fila.id && o.estado !== 'cancelado' && futuro.estado !== 'cancelado' && o.profesional_id === futuro.profesional_id && o.fecha === futuro.fecha && String(o.hora_inicio).slice(0, 5) === String(futuro.hora_inicio).slice(0, 5));
          if (choca) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "turno_unico_por_horario"' } };
        }
      }
      coinciden.forEach((r) => Object.assign(r, this.parche));
      log.push({ op: 'update', tabla: this.tabla, parche: this.parche, filas: coinciden.length });
    } else if (this.op === 'delete') {
      db[this.tabla] = filas.filter((r) => !coinciden.includes(r));
      log.push({ op: 'delete', tabla: this.tabla, filas: coinciden.length });
    }
    const copia = (x) => (x ? structuredClone(x) : x);
    if (this.uno) return { data: copia(coinciden[0]) ?? null, error: this.uno === 'single' && !coinciden[0] ? { message: 'sin filas' } : null };
    return { data: coinciden.map(copia), error: null };
  }
  then(resolve, reject) { return this._ejecutar().then(resolve, reject); }
}

export const createClient = () => ({ from: (tabla) => new Consulta(tabla) });
