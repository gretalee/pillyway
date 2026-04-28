import {
  getKindeServerSession,
} from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function GET() {
  const { isAuthenticated, getAccessTokenRaw, getIdTokenRaw, getRoles, getClaim } =
    getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const [accessTokenRaw, idTokenRaw] = await Promise.all([
    getAccessTokenRaw(),
    getIdTokenRaw(),
  ]);

  const accessTokenPayload = accessTokenRaw
    ? decodeJwtPayload(accessTokenRaw)
    : null;
  const idTokenPayload = idTokenRaw ? decodeJwtPayload(idTokenRaw) : null;

  const [rolesViaGetRoles, rolesClaim, rolesIdToken] = await Promise.all([
    getRoles(),
    getClaim("roles"),
    getClaim("roles", "id_token"),
  ]);

  return NextResponse.json({
    getRoles: rolesViaGetRoles,
    getClaim_roles_accessToken: rolesClaim,
    getClaim_roles_idToken: rolesIdToken,
    accessToken: {
      claims: Object.keys(accessTokenPayload ?? {}),
      payload: accessTokenPayload,
    },
    idToken: {
      claims: Object.keys(idTokenPayload ?? {}),
      payload: idTokenPayload,
    },
  });
}
