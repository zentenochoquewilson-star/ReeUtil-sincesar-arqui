// services/shipment-svc/src/app.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";

/* ======================= CORS ======================= */
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-Sub",
    "x-user-sub",
  ],
  maxAge: 86400,
};

/* ======================= App ======================= */
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

/* ======================= ENV ======================= */
const NOTIFY_BASE = (process.env.NOTIFY_BASE || "http://localhost:3061").replace(/\/+$/, "");

/* ======================= Tipos ======================= */
type ShippingAddr = {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  notes?: string;
};

type ConfirmationDoc = {
  inboxId?: string | null;
  userSub: string | null;
  quoteId?: string | null;
  quoteIdExt?: string | null;
  reportId?: string | null;
  modelIdExt?: string | null;
  shipping: ShippingAddr;
  status: "PENDING" | "PROCESSED";
  createdAt: Date;
  processedAt?: Date | null;
};

/* ======================= Utils ======================= */
function requiredStr(v: any): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function pickShipping(body: any): ShippingAddr | null {
  const s = body?.shipping;
  if (!s || typeof s !== "object") return null;
  return {
    fullName: requiredStr(s.fullName),
    addressLine1: requiredStr(s.addressLine1),
    addressLine2: requiredStr(s.addressLine2) || undefined,
    city: requiredStr(s.city),
    state: requiredStr(s.state) || undefined,
    postalCode: requiredStr(s.postalCode) || undefined,
    country: requiredStr(s.country) || undefined,
    phone: requiredStr(s.phone) || undefined,
    notes: requiredStr(s.notes) || undefined,
  };
}

function validateShipping(s: ShippingAddr | null) {
  if (!s) return "shipping requerido";
  if (!s.fullName) return "fullName requerido";
  if (!s.addressLine1) return "addressLine1 requerido";
  if (!s.city) return "city requerido";
  return null;
}

function formatAddr(s?: ShippingAddr | null) {
  if (!s) return "—";
  const lines = [
    s.fullName,
    s.addressLine1,
    s.addressLine2,
    `${s.city || ""}${s.state ? ", " + s.state : ""} ${s.postalCode || ""}`.trim(),
    s.country,
    s.phone ? `Tel: ${s.phone}` : "",
    s.notes ? `Notas: ${s.notes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // @ts-ignore Node 18+ fetch global
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(to);
  }
}

/* ======================= Healthcheck ======================= */
app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    service: "shipment-svc",
    time: new Date().toISOString(),
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

/* ======================= POST /confirmations ======================= */
/**
 * Crea una confirmación de envío (panel admin).
 * body:
 *  {
 *    inbox_id?: string,
 *    quote_id?: string | null,
 *    quote_id_ext?: string | null,
 *    report_id?: string | null,
 *    model_id_ext?: string | null,
 *    shipping: { fullName, addressLine1, addressLine2?, city, state?, postalCode?, country?, phone?, notes? }
 *  }
 * header: x-user-sub (opcional)
 */
app.post("/confirmations", async (req, res) => {
  try {
    const userSub = requiredStr(req.header("x-user-sub") || req.body?.user_sub || "");
    const inboxId = requiredStr(req.body?.inbox_id);
    const quoteId = requiredStr(req.body?.quote_id) || null;
    const quoteIdExt = requiredStr(req.body?.quote_id_ext) || null;
    const reportId = requiredStr(req.body?.report_id) || null;
    const modelIdExt = requiredStr(req.body?.model_id_ext) || null;

    const shipping = pickShipping(req.body);
    const errShip = validateShipping(shipping);
    if (errShip) return res.status(400).json({ ok: false, error: errShip });

    const doc: ConfirmationDoc = {
      inboxId: inboxId || null,
      userSub: userSub || null,
      quoteId,
      quoteIdExt,
      reportId,
      modelIdExt,
      shipping: shipping!,
      status: "PENDING",
      createdAt: new Date(),
      processedAt: null,
    };

    const db = await getDb();
    const r = await db.collection("shipment_confirmations").insertOne(doc);

    res.json({ ok: true, id: String(r.insertedId) });
  } catch (err) {
    console.error("[shipment-svc] POST /confirmations error", err);
    res.status(500).json({ ok: false, error: "error" });
  }
});

/* ======================= POST /kits ======================= */
/**
 * Genera un “kit” (tracking) y opcionalmente crea la confirmación para el panel admin.
 * body:
 *  {
 *    quote_id_ext: string,
 *    quote_id?: string,
 *    report_id?: string,
 *    model_id_ext?: string,
 *    shipping?: { recipientName|fullName, phone, addressLine1, addressLine2?, city, state, postalCode, country, notes? }
 *  }
 * header: x-user-sub (opcional)
 */
app.post("/kits", async (req, res) => {
  try {
    const { quote_id_ext, quote_id, report_id, model_id_ext, shipping } = req.body || {};
    if (!quote_id_ext) return res.status(400).send("quote_id_ext required");
    const userSub = requiredStr(req.header("x-user-sub") || req.body?.user_sub || "");

    let shippingDoc: ShippingAddr | null = null;
    if (shipping && typeof shipping === "object") {
      const s = shipping as Record<string, any>;
      shippingDoc = {
        fullName: String(s.recipientName || s.fullName || ""),
        phone: requiredStr(s.phone) || undefined,
        addressLine1: String(s.addressLine1 || ""),
        addressLine2: requiredStr(s.addressLine2) || undefined,
        city: String(s.city || ""),
        state: requiredStr(s.state) || undefined,
        postalCode: requiredStr(s.postalCode) || undefined,
        country: requiredStr(s.country) || undefined,
        notes: requiredStr(s.notes) || undefined,
      };
      const errShip = validateShipping(shippingDoc);
      if (errShip) return res.status(400).json({ ok: false, error: errShip });
    }

    const db = await getDb();

    // 1) Crear el kit (tracking)
    const tracking = "TRK-" + randomUUID().slice(0, 8).toUpperCase();
    const kitIns = await db.collection("kits").insertOne({
      quoteIdExt: String(quote_id_ext),
      quoteId: requiredStr(quote_id) || null,
      reportId: requiredStr(report_id) || null,
      modelIdExt: requiredStr(model_id_ext) || null,
      shipping: shippingDoc,
      carrier: "DemoCarrier",
      trackingCode: tracking,
      labelUrl: "https://label.example/" + tracking,
      status: "CREATED",
      createdAt: new Date(),
    });

    // 2) Si vino shipping → crear también la confirmación para el panel admin
    if (shippingDoc) {
      const confDoc: ConfirmationDoc = {
        inboxId: null,
        userSub: userSub || null,
        quoteId: requiredStr(quote_id) || null,
        quoteIdExt: String(quote_id_ext),
        reportId: requiredStr(report_id) || null,
        modelIdExt: requiredStr(model_id_ext) || null,
        shipping: shippingDoc,
        status: "PENDING",
        createdAt: new Date(),
        processedAt: null,
      };
      await db.collection("shipment_confirmations").insertOne(confDoc);
    }

    res.json({ ok: true, id: String(kitIns.insertedId), trackingCode: tracking });
  } catch (err) {
    console.error("[shipment-svc] POST /kits error", err);
    res.status(500).send("error");
  }
});

/* ======================= Notificación ======================= */
/** Envía una notificación al notify-svc probando varios endpoints comunes */
async function sendInboxMessage(payload: {
  to_sub: string;
  title: string;
  body: string;
  meta?: any;
  link?: string | null;
}) {
  const endpoints = [
    `${NOTIFY_BASE}/notify/inbox`, // más común en tu stack
    `${NOTIFY_BASE}/inbox`,        // variante
    `${NOTIFY_BASE}/send`,         // fallback antiguo
  ];

  let lastErr: any = null;
  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        timeoutMs: 8000,
      });
      if (res.ok) return true;
      lastErr = new Error(`${res.status} ${res.statusText}`);
    } catch (e) {
      lastErr = e;
    }
  }
  console.warn("[shipment-svc] notify failed on all endpoints:", lastErr);
  return false;
}

async function notifyUserShipmentProcessed(
  userSub: string | null,
  confirmation: ConfirmationDoc & { _id?: ObjectId },
  trackingCode?: string | null
) {
  if (!userSub) {
    console.warn("[shipment-svc] skip notify: userSub empty");
    return;
  }

  const title = "📦 Kit de envío procesado";
  const dir = formatAddr(confirmation.shipping);

  const lines: string[] = [];
  lines.push(
    "Procesamos tu solicitud y el kit de envío ya fue gestionado.",
    "",
    "**Datos de entrega del kit:**",
    dir
  );
  if (trackingCode) {
    lines.push("", `**Número de seguimiento:** ${trackingCode}`);
  }
  lines.push(
    "",
    "**Instrucciones para devolver tu dispositivo:**",
    "1) Apaga el dispositivo y, si es posible, restablece a valores de fábrica.",
    "2) Protégelo con material de relleno (papel/espuma). No incluyas líquidos.",
    "3) Colócalo dentro de la caja del kit y **sella todas las solapas** con cinta resistente.",
    "4) Incluye una nota con tu *Quote ID* y *Reporte* (si lo tienes).",
    "",
    "⚠️ *Aviso:* El traslado lo realiza el operador logístico. ReeUtil no se responsabiliza por daños durante el transporte."
  );

  const meta: any = {
    kind: "SHIPMENT_PROCESSED",
    confirmationId: confirmation?._id ? String(confirmation._id) : null,
    quoteId: confirmation.quoteId || null,
    quoteIdExt: confirmation.quoteIdExt || null,
    modelIdExt: confirmation.modelIdExt || null,
    trackingCode: trackingCode || null,
  };

  await sendInboxMessage({
    to_sub: userSub,
    title,
    body: lines.join("\n"),
    meta,
    link: null,
  });
}

/* ======================= Listado admin ======================= */
/**
 * GET /admin/shipments/confirmations?status=PENDING|PROCESSED&search=...
 */
async function listConfirmations(req: Request, res: Response) {
  try {
    const db = await getDb();
    const q: any = {};
    const status = String(req.query?.status || "").toUpperCase();
    if (status === "PENDING" || status === "PROCESSED") q.status = status;

    const search = requiredStr(req.query?.search);
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [
        { _id: (() => { try { return new ObjectId(search); } catch { return undefined; } })() },
        { inboxId: rx },
        { userSub: rx },
        { quoteId: rx },
        { quoteIdExt: rx },
        { reportId: rx },
        { modelIdExt: rx },
        { "shipping.fullName": rx },
        { "shipping.city": rx },
        { "shipping.state": rx },
        { "shipping.addressLine1": rx },
        { "shipping.addressLine2": rx },
        { "shipping.postalCode": rx },
        { "shipping.phone": rx },
        { "shipping.notes": rx },
      ].filter((x) => (x as any)._id || Object.values(x as any)[0]);
    }

    const list = await db
      .collection("shipment_confirmations")
      .find(q)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    res.json(list);
  } catch (err) {
    console.error("[shipment-svc] GET /admin/shipments/confirmations error", err);
    res.status(500).json({ ok: false, error: "error" });
  }
}

app.get("/admin/shipments/confirmations", listConfirmations);
app.get("/admin/shipment-confirmations", listConfirmations); // alias legacy

/* ======================= Marcar procesado ======================= */
/**
 * PATCH /admin/shipments/confirmations/:id/process
 * body: { processed: boolean }
 *
 * Al pasar a PROCESSED → notifica al usuario con instrucciones y tracking (si existe).
 */
app.patch("/admin/shipments/confirmations/:id/process", async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "invalid id" });
    }

    const processed = !!req.body?.processed;
    const set: any = {
      status: processed ? "PROCESSED" : "PENDING",
      processedAt: processed ? new Date() : null,
    };

    const db = await getDb();
    const coll = db.collection("shipment_confirmations");

    // Actualizar estado
    const upd = await coll.updateOne({ _id: new ObjectId(id) }, { $set: set });
    if (upd.matchedCount === 0) {
      return res.status(404).json({ ok: false, error: "not found" });
    }

    // Leer doc actualizado
    const conf = (await coll.findOne({ _id: new ObjectId(id) })) as
      | (ConfirmationDoc & { _id: ObjectId })
      | null;

    if (!conf) return res.json({ ok: true, id, processed });

    // Notificar si fue procesado
    if (processed) {
      let tracking: string | null = null;
      try {
        const kitsQ: any = {};
        if (conf.quoteIdExt) kitsQ.quoteIdExt = conf.quoteIdExt;
        else if (conf.quoteId) kitsQ.quoteId = conf.quoteId;

        if (Object.keys(kitsQ).length) {
          const kit = await db
            .collection("kits")
            .find(kitsQ)
            .sort({ createdAt: -1 })
            .limit(1)
            .next();
          tracking = kit?.trackingCode || null;
        }
      } catch (e) {
        console.warn("[shipment-svc] search kit for tracking failed", e);
      }

      await notifyUserShipmentProcessed(conf.userSub || null, conf, tracking);
    }

    res.json({ ok: true, id, processed });
  } catch (err) {
    console.error("[shipment-svc] PATCH /admin/shipments/confirmations/:id/process error", err);
    res.status(500).json({ ok: false, error: "error" });
  }
});

/* ======================= Serve ======================= */
const PORT = process.env.PORT || 3031;
app.listen(PORT, () => console.log("shipment-svc on :" + PORT));
