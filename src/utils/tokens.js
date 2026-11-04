// src/utils/tokens.js
// Tokens criptográficos para QR; los anteriores siguen siendo válidos en la API.
export function makeToken() {
  return crypto.randomUUID();
}
