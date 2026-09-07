"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";

/**
 * Formulario clásico (sin useFormState/useActionState, que dependen de
 * una build "canary" de React): en caso de error redirigimos de vuelta a
 * /backoffice/login con un mensaje en la query string, que la página lee
 * como searchParams. Sencillo, robusto entre versiones, sin JavaScript de
 * cliente necesario.
 */
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/backoffice/dashboard");

  const fail = (mensaje: string) => {
    const url = new URL("/backoffice/login", "http://localhost");
    url.searchParams.set("error", mensaje);
    if (next) url.searchParams.set("next", next);
    redirect(url.pathname + url.search);
  };

  if (!email || !password) {
    fail("Introduce email y contraseña.");
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.activo || !verifyPassword(password, usuario.passwordHash)) {
    fail("Credenciales incorrectas.");
    return;
  }

  const token = await createSessionToken({
    sub: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });
  await setSessionCookie(token);

  redirect(next.startsWith("/backoffice") ? next : "/backoffice/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/backoffice/login");
}