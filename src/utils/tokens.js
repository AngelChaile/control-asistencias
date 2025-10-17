// src/utils/tokens.js
// Helper para generar tokens simples y únicos
export function makeToken() {
  const rnd = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${rnd}-${Date.now().toString(36)}`;
}
