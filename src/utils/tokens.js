// Helpers para generar tokens simples.
// Podemos usar crypto si está disponible, pero string uuid simple:
export function makeToken() {
  // 16 bytes base36 + timestamp
  const rnd = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${rnd}-${Date.now().toString(36)}`;
}
