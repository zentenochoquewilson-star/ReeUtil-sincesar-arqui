import "dotenv/config";
import express from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";

const app = express();
app.use(express.json());

/* -------------------------- Healthcheck -------------------------- */
app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "notify-svc", time: new Date().toISOString() });
});

/* -------------------------- Auth mínima -------------------------- */
/** Requiere que el Gateway envíe x-user-sub (ya lo hace al estar autenticado) */
function requireUserSub(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const sub = req.header("x-user-sub") || "";
  if (!sub) return res.status(401).send("unauthorized");
  (req as any).userSub = sub;
  next();
}

/* ----------------------------- EMAIL (demo) ---------------------------- */
// POST /send-email  { to, subject, body }
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).send("to, subject and body are required");
    }

    const db = await getDb();
    const r = await db.collection("messages").insertOne({
      kind: "email",
      to,
      subject,
      body,
      status: "SENT",
      createdAt: new Date(),
    });

    res.json({ id: String(r.insertedId) });
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

/* ----------------------------- INBOX (campanita) ---------------------------- */
/**
 * GET /inbox?unread=1
 * Header requerido: x-user-sub
 * Normaliza ambos esquemas: {isRead} y {read}.
 */
app.get("/inbox", requireUserSub, async (req, res) => {
  try {
    const userSub = (req as any).userSub as string;
    const onlyUnread = String(req.query.unread || "") === "1";

    const db = await getDb();
    const raw = await db
      .collection("inbox")
      .find({ userSub })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Normaliza campos y aplica filtro unread si se pide
    const list = raw
      .map((x: any) => ({
        _id: String(x._id),
        userSub: x.userSub,
        title: x.title,
        body: x.body,
        meta: x.meta || (x.link ? { link: x.link } : {}),
        link: x.link || null, // legacy, por si lo usa otro UI
        isRead: !!(x.isRead ?? x.read),
        createdAt: x.createdAt,
      }))
      .filter((x: any) => (onlyUnread ? !x.isRead : true));

    res.json(list);
  } catch (err) {
    console.error("[notify-svc] GET /inbox error", err);
    res.status(500).send("error");
  }
});

/**
 * PATCH /inbox/:id/read
 * body: { read?: boolean } // default true
 * Header requerido: x-user-sub (sólo dueño puede marcar)
 * Actualiza ambos campos: isRead y read (compatibilidad).
 */
app.patch("/inbox/:id/read", requireUserSub, async (req, res) => {
  try {
    const userSub = (req as any).userSub as string;
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return res.status(400).send("invalid id");

    const read = typeof req.body?.read === "boolean" ? !!req.body.read : true;

    const db = await getDb();
    const result = await db.collection("inbox").updateOne(
      { _id: new ObjectId(id), userSub },
      { $set: { isRead: read, read } }
    );

    if (result.matchedCount === 0) return res.status(404).send("not found");
    res.json({ ok: true, id, read });
  } catch (err) {
    console.error("[notify-svc] PATCH /inbox/:id/read error", err);
    res.status(500).send("error");
  }
});

/**
 * POST /send
 * body: { to_sub: string, title: string, body: string, meta?: any }
 * Inserta una notificación (formato nuevo con isRead/meta).
 */
app.post("/send", async (req, res) => {
  try {
    const { to_sub, title, body, meta } = req.body || {};
    if (!to_sub || !title || !body) {
      return res.status(400).send("to_sub, title and body are required");
    }
    const db = await getDb();
    const r = await db.collection("inbox").insertOne({
      userSub: String(to_sub),
      title: String(title),
      body: String(body),
      meta: meta && typeof meta === "object" ? meta : {},
      isRead: false,
      read: false, // compatibilidad
      createdAt: new Date(),
    });
    res.json({ ok: true, id: String(r.insertedId) });
  } catch (err) {
    console.error("[notify-svc] POST /send error", err);
    res.status(500).send("error");
  }
});

/**
 * POST /inbox (compatibilidad con código antiguo)
 * body: { user_sub: string, title: string, body: string, link?: string }
 */
app.post("/inbox", async (req, res) => {
  try {
    const { user_sub, title, body, link } = req.body || {};
    if (!user_sub || !title || !body) {
      return res.status(400).send("user_sub, title and body are required");
    }

    const db = await getDb();
    const r = await db.collection("inbox").insertOne({
      userSub: String(user_sub),
      title: String(title),
      body: String(body),
      link: link ? String(link) : null, // legacy
      meta: link ? { link: String(link) } : {},
      isRead: false,
      read: false, // compatibilidad
      createdAt: new Date(),
    });

    res.json({ ok: true, id: String(r.insertedId) });
  } catch (err) {
    console.error("[notify-svc] POST /inbox error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Serve ---------------------------- */
const PORT = process.env.PORT || 3061;
app.listen(PORT, () => console.log("notify-svc on :" + PORT));
