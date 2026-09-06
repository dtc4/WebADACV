import type { Rol } from "@prisma/client";

/**
 * Firma y verificación de la cookie de sesión usando Web Crypto
 * (`crypto.subtle`), disponible tanto en Node.js (18+) como en el Edge
 * Runtime donde corre el middleware. Deliberadamente NO se usa el módulo
 * `node:crypto` aquí (createHmac, timingSafeEqual) porque ese módulo no
 * está garantizado en el Edge Runtime — este fichero es el único que
 * importa src/middleware.ts, así que tiene que funcionar en ambos sitios.
 *
 * El hashing de contraseñas (que sí puede usar `node:crypto` porque solo
 * se ejecuta en Server Actions / Route Handlers, nunca en middleware)
 * vive en src/lib/auth.ts.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export type SessionPayload = {
  sub: string; // id de usuario
  nombre: string;
  rol: Rol;
  exp: number; // epoch seconds
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url + "===".slice((b64url.length + 3) % 4);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Falta la variable de entorno SESSION_SECRET. Copia .env.example a .env y define un valor (openssl rand -base64 32)."
    );
  }
  return secret;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signData(data: string): Promise<string> {
  const key = await getHmacKey();
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifyData(data: string, signatureB64Url: string): Promise<boolean> {
  const key = await getHmacKey();
  const enc = new TextEncoder();
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signatureB64Url) as BufferSource,
      enc.encode(data)
    );
  } catch {
    return false;
  }
}

export async function createSessionToken(payload: Omit<SessionPayload, "exp">): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const data = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(full)));
  const signature = await signData(data);
  return `${data}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const valid = await verifyData(data, signature);
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(data));
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "adacv_session";
export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
