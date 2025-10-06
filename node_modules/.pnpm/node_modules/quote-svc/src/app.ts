// services/quote-svc/src/app.ts
import "dotenv/config";
import express from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import jsonLogic from "json-logic-js";

const app = express();
app.use(express.json());

/* -------------------------- Healthcheck -------------------------- */
app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "quote-svc", time: new Date().toISOString() });
});

/* -------------------- Tipos y helpers de normalización -------------------- */
type LogicAdj = { if: any; then: number };
type NewRuleBody = { basePrice?: number; minPrice?: number; adjustments?: LogicAdj[] };
type LegacyRuleBody = {
  basePrice?: number;
  minPrice?: number;
  adjustments?: {
    [key: string]:
      | { [option: string]: number }        // p.ej: pantalla: { intacta: 0, quebrada: -150 }
      | { perUnit?: number };               // p.ej: almacenamiento_gb: { perUnit: 2 }
  };
};

function normalizeRule(raw: any): {
  version: number;
  body: NewRuleBody & { __perUnit?: Record<string, number> };
} {
  const container = raw?.body ?? raw?.rule ?? raw ?? {};
  const version = Number(raw?.version ?? container?.version ?? 1);

  // Formato nuevo (ajustes ya en array json-logic)
  if (Array.isArray(container?.adjustments)) {
    return {
      version,
      body: {
        basePrice: Number(container.basePrice ?? 0),
        minPrice: Number(container.minPrice ?? 0),
        adjustments: container.adjustments as LogicAdj[],
      },
    };
  }

  // Formato legacy → convertir a json-logic + detectar perUnit
  const legacy = container as LegacyRuleBody;
  const basePrice = Number(legacy.basePrice ?? 0);
  const minPrice = Number(legacy.minPrice ?? 0);
  const adjList: LogicAdj[] = [];
  const perUnitBag: Record<string, number> = {};

  const adj = legacy.adjustments || {};
  for (const key of Object.keys(adj)) {
    const def = (adj as any)[key];

    if (def && typeof def === "object" && "perUnit" in def) {
      perUnitBag[key] = Number(def.perUnit ?? 0);
      // regla neutra (el perUnit se aplica aparte)
      adjList.push({ if: { var: key }, then: 0 });
    } else if (def && typeof def === "object") {
      for (const opt of Object.keys(def)) {
        const delta = Number(def[opt] ?? 0);
        const val = opt === "true" ? true : opt === "false" ? false : opt;
        adjList.push({
          if: { "==": [{ var: key }, val] },
          then: delta,
        });
      }
    }
  }

  return {
    version,
    body: {
      basePrice,
      minPrice,
      adjustments: adjList,
      __perUnit: Object.keys(perUnitBag).length ? perUnitBag : undefined,
    },
  };
}

/* ----------------------------- /price ---------------------------- */
/**
 * POST /price
 * body: { answers, registryRuleUrl }
 * - Formato NUEVO: { version, body: { basePrice, minPrice?, adjustments?: [{if, then}] } }
 * - Formato LEGACY: { version?, rule: { basePrice?, minPrice?, adjustments: {...} } } o { basePrice, ... }
 */
app.post("/price", async (req, res) => {
  try {
    const { answers, registryRuleUrl } = req.body || {};
    if (!registryRuleUrl) return res.status(400).send("registryRuleUrl required");

    const ruleRes = await fetch(registryRuleUrl);
    if (!ruleRes.ok) return res.status(502).send("Registry error");
    const rawRule = await ruleRes.json();
    if (!rawRule) return res.status(404).send("No active pricing rule (rule not found)");

    const norm = normalizeRule(rawRule);
    const body = norm.body;

    if (typeof body.basePrice !== "number") {
      return res.status(404).send("No active pricing rule (missing body/basePrice)");
    }

    let price = Number(body.basePrice ?? 0);

    // Ajustes json-logic
    const adjustments: LogicAdj[] = Array.isArray(body.adjustments) ? body.adjustments : [];
    for (const adj of adjustments) {
      try {
        if (jsonLogic.apply(adj.if, answers)) price += Number(adj.then ?? 0);
      } catch {
        // ignora regla malformada
      }
    }

    // Ajustes por unidad (legacy)
    if (body.__perUnit && typeof body.__perUnit === "object") {
      for (const key of Object.keys(body.__perUnit)) {
        const per = Number(body.__perUnit[key] ?? 0);
        const val = Number(answers?.[key] ?? 0);
        if (!Number.isNaN(per) && !Number.isNaN(val)) price += per * val;
      }
    }

    const minPrice = Number(body.minPrice ?? 0);
    if (!Number.isNaN(minPrice)) price = Math.max(price, minPrice);

    res.json({
      prelimPrice: Math.max(0, Math.round(price)),
      ruleVersion: norm.version,
      ruleSnapshot: body,
    });
  } catch (err) {
    console.error("[quote-svc] POST /price error", err);
    res.status(500).send("error");
  }
});

/* ---------------- Seguridad simple por header ---------------- */
function requireUserSub(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sub = String(req.header("x-user-sub") || "");
  if (!sub) return res.status(401).send("unauthorized");
  (req as any).userSub = sub;
  next();
}

/* ----------------------------- Crear cotización ----------------------------- */
/**
 * POST /quotes
 * body: (soporta ambos formatos)
 *   A) { device_type?, model_id_ext?, answers?, offered_price? }
 *   B) { model_id_ext?, answers?, prelim_price?, rule_version?, rule_snapshot? }
 * Requiere header x-user-sub (inyectado por el gateway).
 */
app.post("/quotes", requireUserSub, async (req, res) => {
  try {
    const sub = (req as any).userSub as string;
    const b = req.body || {};

    const doc = {
      userId: sub,
      deviceType: b.device_type || null,
      modelIdExt: b.model_id_ext || null,
      answers: b.answers && typeof b.answers === "object" ? b.answers : {},
      offeredPrice: typeof b.offered_price === "number" ? b.offered_price : null,
      prelimPrice: typeof b.prelim_price === "number" ? b.prelim_price : null,
      ruleVersion: b.rule_version ?? null,
      ruleSnapshot: b.rule_snapshot && typeof b.rule_snapshot === "object" ? b.rule_snapshot : {},
      status: "PENDING" as "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const r = await db.collection("quotes").insertOne(doc);
    res.json({ ok: true, id: String(r.insertedId) });
  } catch (err) {
    console.error("[quote-svc] POST /quotes error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Listar cotizaciones ----------------------------- */
/**
 * GET /quotes?mine=1&status=...
 * - Si mine=1 → requiere x-user-sub y filtra por ese usuario
 * - status opcional: PENDING|APPROVED|REJECTED|NEEDS_INFO
 * Devuelve últimos 200 por defecto.
 */
app.get("/quotes", async (req, res) => {
  try {
    const mine = String(req.query.mine || "") === "1";
    const status = String(req.query.status || "").toUpperCase();

    const db = await getDb();
    const q: any = {};

    if (mine) {
      const sub = String(req.header("x-user-sub") || "");
      if (!sub) return res.status(401).send("unauthorized");
      q.userId = sub;
    }

    if (["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"].includes(status)) {
      q.status = status;
    }

    const list = await db
      .collection("quotes")
      .find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    res.json(
      list.map((x) => ({
        _id: String(x._id),
        userId: x.userId,
        deviceType: x.deviceType ?? null,
        modelIdExt: x.modelIdExt ?? null,
        answers: x.answers || {},
        offeredPrice: x.offeredPrice ?? null,
        prelimPrice: x.prelimPrice ?? null,
        status: x.status,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
      }))
    );
  } catch (err) {
    console.error("[quote-svc] GET /quotes error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Obtener por id ----------------------------- */
/**
 * GET /quotes/:id
 */
app.get("/quotes/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return res.status(400).send("invalid id");

    const db = await getDb();
    const doc = await db.collection("quotes").findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).send("not found");

    res.json({
      _id: String(doc._id),
      userId: doc.userId,
      deviceType: doc.deviceType ?? null,
      modelIdExt: doc.modelIdExt ?? null,
      answers: doc.answers || {},
      offeredPrice: doc.offeredPrice ?? null,
      prelimPrice: doc.prelimPrice ?? null,
      ruleVersion: doc.ruleVersion ?? null,
      ruleSnapshot: doc.ruleSnapshot || {},
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("[quote-svc] GET /quotes/:id error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Actualizar estado ----------------------------- */
/**
 * PUT /quotes/:id/status
 * body: { status: "PENDING"|"APPROVED"|"REJECTED"|"NEEDS_INFO" }
 */
app.put("/quotes/:id/status", async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return res.status(400).send("invalid id");

    const allowed = ["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"];
    const status = String(req.body?.status || "").toUpperCase();
    if (!allowed.includes(status)) {
      return res.status(400).send("invalid status");
    }

    const db = await getDb();
    const result = await db.collection("quotes").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("not found");
    }

    res.json({ ok: true, id, status });
  } catch (err) {
    console.error("[quote-svc] PUT /quotes/:id/status error", err);
    res.status(500).send("error");
  }
});

/* ----------------------------- Serve ---------------------------- */
const PORT = process.env.PORT || 3021;
app.listen(PORT, () => console.log("quote-svc on :" + PORT));
