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

/* ----------------------------- ACK de notificaciones ---------------------------- */
/**
 * POST /inbox/:id/ack
 * Header: x-user-sub  (dueño del inbox)
 * body: {
 *   accept?: boolean,              // default true
 *   shipping?: {                   // requerido si action.key === 'approve_shipment' y accept === true
 *     fullName: string,
 *     addressLine1: string,
 *     addressLine2?: string,
 *     city: string,
 *     state?: string,
 *     postalCode?: string,
 *     phone?: string,
 *     notes?: string
 *   }
 * }
 * Efectos:
 *  - Marca la notificación como leída.
 *  - Si es una acción approve_shipment + accept === true → guarda confirmación en shipment_confirmations.
 */
app.post("/inbox/:id/ack", requireUserSub, async (req, res) => {
  try {
    const userSub = (req as any).userSub as string;
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return res.status(400).send("invalid id");

    const accept = req.body?.accept === undefined ? true : !!req.body.accept;
    const shipping = req.body?.shipping && typeof req.body.shipping === "object" ? req.body.shipping : null;

    const db = await getDb();
    const inbox = await db.collection("inbox").findOne({ _id: new ObjectId(id), userSub });
    if (!inbox) return res.status(404).send("not found");

    const meta = inbox.meta || {};
    const actionKey = meta?.action?.key || null;

    // 1) marcar como leído
    await db.collection("inbox").updateOne(
      { _id: new ObjectId(id), userSub },
      { $set: { isRead: true, read: true } }
    );

    // 2) si es approve_shipment y aceptó, validar y guardar confirmación
    if (accept && actionKey === "approve_shipment") {
      const required = ["fullName", "addressLine1", "city"];
      for (const k of required) {
        if (!shipping?.[k]) {
          return res.status(400).send(`shipping.${k} required`);
        }
      }

      const doc = {
        inboxId: String(inbox._id),
        userSub,
        quoteId: meta?.quoteId || null,
        reportId: meta?.reportId || null,
        modelIdExt: meta?.modelIdExt || null,
        address: {
          fullName: String(shipping.fullName),
          addressLine1: String(shipping.addressLine1),
          addressLine2: shipping.addressLine2 ? String(shipping.addressLine2) : "",
          city: String(shipping.city),
          state: shipping.state ? String(shipping.state) : "",
          postalCode: shipping.postalCode ? String(shipping.postalCode) : "",
          phone: shipping.phone ? String(shipping.phone) : "",
          notes: shipping.notes ? String(shipping.notes) : "",
        },
        status: "PENDING", // pendiente de que el admin lo procese y cree el kit
        createdAt: new Date(),
        processedAt: null,
      };

      const r = await db.collection("shipment_confirmations").insertOne(doc);
      return res.json({ ok: true, id: String(r.insertedId) });
    }

    // 3) para cualquier otra acción (o decline), basta con el read
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[notify-svc] POST /inbox/:id/ack error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Admin: Confirmaciones de envío ---------------------------- */
/**
 * GET /shipments/confirmations?search=&status=PENDING|PROCESSED
 * Lista (para admin): últimas 200
 */
app.get("/shipments/confirmations", async (req, res) => {
  try {
    const db = await getDb();
    const q: any = {};

    const status = String(req.query.status || "").toUpperCase();
    if (["PENDING", "PROCESSED"].includes(status)) q.status = status;

    const search = String(req.query.search || "").trim().toLowerCase();
    if (search) {
      q.$or = [
        { quoteId: { $regex: search, $options: "i" } },
        { userSub: { $regex: search, $options: "i" } },
        { "address.fullName": { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
        { modelIdExt: { $regex: search, $options: "i" } },
      ];
    }

    const list = await db
      .collection("shipment_confirmations")
      .find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    res.json(
      list.map((x: any) => ({
        _id: String(x._id),
        inboxId: x.inboxId || null,
        userSub: x.userSub,
        quoteId: x.quoteId || null,
        reportId: x.reportId || null,
        modelIdExt: x.modelIdExt || null,
        address: x.address,
        status: x.status,
        createdAt: x.createdAt,
        processedAt: x.processedAt,
      }))
    );
  } catch (err) {
    console.error("[notify-svc] GET /shipments/confirmations error", err);
    res.status(500).send("error");
  }
});

/**
 * PATCH /shipments/confirmations/:id/process
 * body: { processed?: boolean }  // default true
 * Marca una confirmación como procesada (para admin)
 */
app.patch("/shipments/confirmations/:id/process", async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return res.status(400).send("invalid id");

    const processed = req.body?.processed === undefined ? true : !!req.body.processed;

    const db = await getDb();
    const upd = await db.collection("shipment_confirmations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: processed ? "PROCESSED" : "PENDING",
          processedAt: processed ? new Date() : null,
        },
      }
    );

    if (upd.matchedCount === 0) return res.status(404).send("not found");
    res.json({ ok: true, id, processed });
  } catch (err) {
    console.error("[notify-svc] PATCH /shipments/confirmations/:id/process error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Serve ---------------------------- */
const PORT = process.env.PORT || 3061;
app.listen(PORT, () => console.log("notify-svc on :" + PORT));
