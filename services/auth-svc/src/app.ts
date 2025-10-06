import "dotenv/config";
import express from "express";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify, JWTPayload, SignJWT } from "jose";
import { getDb } from "./db";
import bcrypt from "bcryptjs";

const app = express();
app.use(cors()); // si quieres restringir: cors({ origin: "http://localhost:5173" })
app.use(express.json());

// ----- Config -----
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""; // Requerido para aud
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const PORT = Number(process.env.PORT || 3071);
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev-secret-change";
const AUTH_ISSUER = "auth-svc";
const secretBytes = new TextEncoder().encode(AUTH_JWT_SECRET);

// ----- Tipos -----
type Role = "admin" | "staff" | "user";
type UserDoc = {
  _id?: any;
  sub: string;               // ID único de Google
  email?: string;
  name?: string;
  picture?: string;
  roles: Role[];             // roles en BD
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
};

type Authed = {
  claims: JWTPayload & { sub: string; email?: string; name?: string; picture?: string };
  user: UserDoc;
};

// ----- Helpers -----
async function verifyGoogleToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: CLIENT_ID || undefined, // si está vacío, no valida aud
  });
  return payload as JWTPayload & { sub: string; email?: string; name?: string; picture?: string };
}

async function signLocalToken(user: UserDoc) {
  const payload: JWTPayload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    roles: user.roles as any,
    iss: AUTH_ISSUER,
  } as any;
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(AUTH_ISSUER)
    .setSubject(String(user.sub))
    .setExpirationTime("7d")
    .sign(secretBytes);
  return jwt;
}

async function upsertUserFromClaims(
  claims: { sub: string; email?: string; name?: string; picture?: string }
): Promise<UserDoc> {
  const db = await getDb();
  const now = new Date();
  const col = db.collection<UserDoc>("users");
  const existing = await col.findOne({ sub: claims.sub });

  if (existing) {
    const update: Partial<UserDoc> = {
      email: claims.email ?? existing.email,
      name: claims.name ?? existing.name,
      picture: claims.picture ?? existing.picture,
      updatedAt: now,
    };
    await col.updateOne({ sub: claims.sub }, { $set: update });
    return { ...existing, ...update };
  }

  const doc: UserDoc = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
    roles: ["user"], // por defecto
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}


function hasAnyRole(user: UserDoc, roles: Role[]) {
  return user.roles.some((r) => roles.includes(r));
}

// ----- Middlewares -----
async function requireAuth(req: any, res: any, next: any) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });
    let claims: any;
    let user: UserDoc;
    try {
      // 1) Intentar Google ID Token
      claims = await verifyGoogleToken(token);
      user = await upsertUserFromClaims(claims);
    } catch {
      // 2) Intentar JWT local HS256
      const { payload } = await jwtVerify(token, secretBytes, {
        issuer: AUTH_ISSUER,
      });
      claims = payload as any;
      // Para tokens locales, upsert por sub/email si no existe
      const db = await getDb();
      const col = db.collection<UserDoc>("users");
      const existing = await col.findOne({ sub: claims.sub });
      if (existing) {
        user = existing;
      } else {
        const now = new Date();
        const doc: UserDoc = {
          sub: claims.sub,
          email: claims.email,
          name: claims.name,
          picture: claims.picture,
          roles: Array.isArray(claims.roles) ? (claims.roles as any) : ["user"],
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        await col.insertOne(doc);
        user = doc;
      }
    }
    if (user.status === "disabled") return res.status(403).json({ error: "User disabled" });
    (req as any).auth = { claims, user } as Authed;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(roles: Role[]) {
  return (req: any, res: any, next: any) => {
    const a: Authed | undefined = (req as any).auth;
    if (!a) return res.status(401).json({ error: "Unauthenticated" });
    if (!hasAnyRole(a.user, roles)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// ----- Rutas -----
app.get("/healthz", (_req, res) =>
  res.json({ ok: true, service: "auth-svc", time: new Date().toISOString() })
);

app.get("/me", requireAuth, (req, res) => {
  const { user } = (req as any).auth as Authed;
  const { sub, email, name, picture, roles, status } = user;
  res.json({ sub, email, name, picture, roles, status });
});

// ----- Auth local (email/password) -----
app.post("/local/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const db = await getDb();
    const col = db.collection<UserDoc>("users");
    const existing = await col.findOne({ email: String(email).toLowerCase() });
    if (existing && (existing as any).passwordHash) {
      return res.status(409).json({ error: "email already registered" });
    }
    const now = new Date();
    const passwordHash = await bcrypt.hash(String(password), 10);
    const sub = `local:${String(email).toLowerCase()}`;
    const doc: UserDoc & { passwordHash?: string } = {
      sub,
      email: String(email).toLowerCase(),
      name: name || undefined,
      picture: undefined,
      roles: ["user"],
      status: "active",
      createdAt: now,
      updatedAt: now,
      passwordHash,
    };
    if (existing) {
      await col.updateOne({ _id: (existing as any)._id }, { $set: doc });
    } else {
      await col.insertOne(doc);
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/local/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const db = await getDb();
    const col = db.collection<UserDoc & { passwordHash?: string }>("users");
    const user = await col.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const token = await signLocalToken(user as any);
    res.json({ token });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/users", requireAuth, requireRole(["admin", "staff"]), async (_req, res) => {
  const db = await getDb();
  const users = await db
    .collection<UserDoc>("users")
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(users);
});

app.put("/users/:sub/roles", requireAuth, requireRole(["admin"]), async (req, res) => {
  const { sub } = req.params as { sub: string };
  const roles = Array.isArray(req.body?.roles) ? (req.body.roles as Role[]) : null;
  if (!roles || roles.some((r) => !["admin", "staff", "user"].includes(r))) {
    return res.status(400).json({ error: "roles must be array of ['admin','staff','user']" });
  }
  const db = await getDb();
  const result = await db.collection<UserDoc>("users").findOneAndUpdate(
    { sub },
    { $set: { roles, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  const doc = (result as any)?.value;
  if (!doc) return res.status(404).json({ error: "User not found" });
  const { email, name, picture, status } = doc as UserDoc;
  res.json({ sub, email, name, picture, roles, status });
});

app.put("/users/:sub/status", requireAuth, requireRole(["admin"]), async (req, res) => {
  const { sub } = req.params as { sub: string };
  const status = req.body?.status as "active" | "disabled";
  if (!["active", "disabled"].includes(status))
    return res.status(400).json({ error: "status must be 'active' | 'disabled'" });
  const db = await getDb();
  const result = await db.collection<UserDoc>("users").findOneAndUpdate(
    { sub },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  const doc = (result as any)?.value;
  if (!doc) return res.status(404).json({ error: "User not found" });
  const { email, name, picture, roles } = doc as UserDoc;
  res.json({ sub, email, name, picture, roles, status });
});

app.listen(PORT, () => console.log("auth-svc on :" + PORT));
