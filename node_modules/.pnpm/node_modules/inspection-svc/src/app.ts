import "dotenv/config";
import express from "express";
import { getDb } from "./db";
import { ObjectId } from "mongodb";

const app = express();
app.use(express.json());

/* Bases de otros servicios */
const QUOTE_BASE = process.env.QUOTE_BASE ?? "http://localhost:3021";
const NOTIFY_BASE = process.env.NOTIFY_BASE ?? "http://localhost:3061";

/* ---------------- utils ---------------- */
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  // FIX: fusionar timeoutMs dentro de init (en vez de pasar un 3er argumento)
  const r = await fetchWithTimeout(url, { ...(init as any), timeoutMs });
  if (!r.ok) throw new Error(String(r.status));
  return await r.json();
}

/* -------------------------- Healthcheck -------------------------- */
app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    service: "inspection-svc",
    time: new Date().toISOString(),
  });
});

/* ----------------------------- Create report ---------------------------- */
/**
 * POST /reports
 *
 * Acepta dos formatos:
 * A) { quote_id: string, model_id_ext?: string, answers?: object }
 * B) {
 *      quote_id_ext: string,
 *      findings?: object,
 *      photos?: string[],
 *      suggested_price?: number,
 *      decision?: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO"
 *    }
 * Además, lee "x-user-sub" desde el Gateway para asociar el reporte al usuario solicitante.
 */
app.post("/reports", async (req, res) => {
  try {
    const b = req.body || {};

    const hasA = typeof b.quote_id === "string";
    const hasB = typeof b.quote_id_ext === "string";
    if (!hasA && !hasB) {
      return res.status(400).send("quote_id or quote_id_ext required");
    }

    const quoteId: string | null = hasA ? String(b.quote_id) : null;
    const quoteIdExt: string | null = hasB ? String(b.quote_id_ext) : null;

    const modelIdExt: string | null =
      typeof b.model_id_ext === "string" ? b.model_id_ext : null;

    const answers = b.answers && typeof b.answers === "object" ? b.answers : {};
    const findings = b.findings && typeof b.findings === "object" ? b.findings : {};

    const photos: string[] = Array.isArray(b.photos) ? b.photos : [];
    const suggestedPrice =
      typeof b.suggested_price === "number" ? b.suggested_price : null;

    const allowed = ["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"] as const;
    const decisionRaw =
      typeof b.decision === "string" ? b.decision.toUpperCase() : "PENDING";
    const status = (allowed as readonly string[]).includes(decisionRaw)
      ? (decisionRaw as (typeof allowed)[number])
      : "PENDING";

    const requesterSub = String(req.header("x-user-sub") || "");

    const db = await getDb();
    const r = await db.collection("reports").insertOne({
      quoteId,        // A
      quoteIdExt,     // B
      modelIdExt,     // A
      answers,        // A
      findings,       // B
      photos,         // B
      suggestedPrice, // B
      status,
      inspectorId: "system",
      requesterSub: requesterSub || null, // quién envió la revisión
      createdAt: new Date(),
    });

    res.json({ ok: true, id: String(r.insertedId) });
  } catch (err) {
    console.error("[inspection-svc] POST /reports error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- List reports ---------------------------- */
/**
 * GET /reports?status=PENDING|APPROVED|REJECTED|NEEDS_INFO&search=...
 * Devuelve últimos 200 por defecto (ordenados por fecha desc).
 */
app.get("/reports", async (req, res) => {
  try {
    const db = await getDb();
    const q: any = {};

    if (req.query.status) {
      const st = String(req.query.status).toUpperCase();
      if (["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"].includes(st)) {
        q.status = st;
      }
    }

    if (req.query.search) {
      const s = String(req.query.search).trim();
      if (s) {
        q.$or = [{ quoteId: s }, { quoteIdExt: s }, { modelIdExt: s }];
      }
    }

    const list = await db
      .collection("reports")
      .find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    res.json(list);
  } catch (err) {
    console.error("[inspection-svc] GET /reports error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Update status ---------------------------- */
/**
 * PUT /reports/:id/status
 * body: { status: "PENDING"|"APPROVED"|"REJECTED"|"NEEDS_INFO" }
 * Efectos:
 *  - Actualiza el reporte
 *  - Notifica al usuario (prioridad: requesterSub; fallback: userId de la quote si está disponible)
 */
app.put("/reports/:id/status", async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return res.status(400).send("invalid id");

    const allowed = ["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"];
    const status = String(req.body?.status || "").toUpperCase();
    if (!allowed.includes(status)) {
      return res.status(400).send("invalid status");
    }

    const db = await getDb();

    // 1) update
    const upd = await db.collection("reports").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    if (upd.matchedCount === 0) return res.status(404).send("not found");

    // 2) read updated
    const doc = await db.collection("reports").findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).send("not found");

    // 3) notify (best-effort)
    try {
      // Determina destinatario
      let userSub: string | null = doc.requesterSub || null;

      // Fallback: buscar dueño de la cotización en quote-svc
      if (!userSub && doc.quoteId) {
        try {
          const q = await fetchJson(
            `${QUOTE_BASE}/quotes/${encodeURIComponent(String(doc.quoteId))}`,
            { method: "GET" }
          );
          if (q?.userId) userSub = String(q.userId);
        } catch {
          // si falla, no bloquea el flujo
        }
      }

      if (userSub) {
        let title = "Estado de tu cotización";
        let body = "";
        switch (status) {
          case "APPROVED":
            title = "✅ Cotización aprobada";
            body = "Tu cotización fue aprobada. Pronto nos pondremos en contacto para el siguiente paso.";
            break;
          case "REJECTED":
            title = "❌ Cotización rechazada";
            body = "Tu cotización fue rechazada. Si crees que hubo un error, puedes crear una nueva o contactarnos.";
            break;
          case "NEEDS_INFO":
            title = "ℹ️ Se requiere más información";
            body = "Necesitamos información adicional sobre tu dispositivo para continuar la revisión.";
            break;
          case "PENDING":
          default:
            title = "⏳ Cotización en revisión";
            body = "Tu cotización quedó en estado pendiente. Te avisaremos cuando haya una decisión.";
        }

        await fetchWithTimeout(`${NOTIFY_BASE}/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            to_sub: userSub,
            title,
            body,
            meta: {
              reportId: String(doc._id),
              quoteId: doc.quoteId || null,
              quoteIdExt: doc.quoteIdExt || null,
              modelIdExt: doc.modelIdExt || null,
              newStatus: status,
            },
          }),
          timeoutMs: 7000,
        });

        // Actualizar el estado de la cotización si existe
        if (doc.quoteId) {
          try {
            await fetchWithTimeout(`${QUOTE_BASE}/quotes/${encodeURIComponent(String(doc.quoteId))}/status`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status }),
              timeoutMs: 5000,
            });
          } catch (quoteUpdateErr) {
            console.warn("[inspection-svc] quote status update error (non-fatal)", quoteUpdateErr);
          }
        }
      }
    } catch (notifyErr) {
      console.warn("[inspection-svc] notify error (non-fatal)", notifyErr);
    }

    res.json({ ok: true, id, status: doc.status });
  } catch (err) {
    console.error("[inspection-svc] PUT /reports/:id/status error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Serve ---------------------------- */
const PORT = process.env.PORT || 3041;
app.listen(PORT, () => console.log("inspection-svc on :" + PORT));
