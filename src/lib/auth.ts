import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  type SessionPayload,
} from "./session";

export type { SessionPayload };
export { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME };

// --- Contraseñas (solo se usa en Server Actions / Route Handlers, nunca en
// middleware, así que node:crypto es seguro aquí) --------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, 64);
  if (candidate.length !== hashBuffer.length) return false;
  return timingSafeEqual(candidate, hashBuffer);
}

// --- Cookie de sesión --------------------------------------------------------

/** Solo se puede llamar desde un Server Action o un Route Handler.
 *
 * Nota: usamos `await cookies()` aunque en Next 14 la documentación oficial
 * dice que `cookies()` es síncrona (solo pasó a ser asíncrona oficialmente
 * en Next 15) — en la práctica, el parche de seguridad 14.2.35 cambió el
 * valor devuelto internamente (algunas instalaciones ven un objeto normal,
 * otras una promesa). `await` sobre un valor que no es una promesa no hace
 * nada raro, así que esta forma funciona en ambos casos y es la misma que
 * recomienda la documentación de Next 15 por compatibilidad futura. */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Solo se puede llamar desde un Server Action o un Route Handler. */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Se puede llamar desde Server Components, Server Actions y Route Handlers. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}