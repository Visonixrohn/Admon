import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://svpprgzklqwsnevejihu.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_kfq79EwWoGaQd13OxcHO4Q_pLQutDkB";
const PORT = process.env.PORT || 8787;

const app = express();
app.use(cors());
app.use(express.json());

function buildTargetUrl(originalUrl) {
  // Forward whatever path the client requested to the real Supabase base URL
  // originalUrl contains the leading slash and query string, e.g. /rest/v1/clientes?select=*
  return `${SUPABASE_URL}${originalUrl}`;
}

app.all("/api/supabase/*", async (req, res) => {
  try {
    // legacy proxy route: /api/supabase/clientes?select=* -> forward to SUPABASE_URL/rest/v1/clientes?select=*
    const withoutPrefix = req.originalUrl.replace(/^\/api\/supabase\//, "");
    const targetUrl = `${SUPABASE_URL}/rest/v1/${withoutPrefix}`;

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: req.headers.accept || "application/json",
    };

    // Forward some client headers for usability
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];

    const fetchOptions = {
      method: req.method,
      headers,
      // don't include body for GET/HEAD
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    };

    const r = await fetch(targetUrl, fetchOptions);
    const text = await r.text();

    // Try to parse JSON, otherwise send text
    const contentType = r.headers.get("content-type") || "";
    res.status(r.status);
    if (contentType.includes("application/json")) {
      try {
        return res.json(JSON.parse(text));
      } catch (e) {
        return res.send(text);
      }
    }
    return res.send(text);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Proxy error", err);
    return res.status(500).json({ error: "proxy_error", details: String(err) });
  }
});

// Allow the front-end to simply set VITE_SUPABASE_URL=http://localhost:8787
// and call the normal Supabase endpoints (/rest/v1/* and /auth/v1/*)
app.all("/rest/v1/*", async (req, res) => {
  try {
    const targetUrl = buildTargetUrl(req.originalUrl);
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: req.headers.accept || "application/json",
    };
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    const fetchOptions = {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    };
    const r = await fetch(targetUrl, fetchOptions);
    const text = await r.text();
    const contentType = r.headers.get("content-type") || "";
    res.status(r.status);
    if (contentType.includes("application/json")) {
      try {
        return res.json(JSON.parse(text));
      } catch (e) {
        return res.send(text);
      }
    }
    return res.send(text);
  } catch (err) {
    console.error("Proxy error", err);
    return res.status(500).json({ error: "proxy_error", details: String(err) });
  }
});

app.all("/auth/v1/*", async (req, res) => {
  try {
    const targetUrl = buildTargetUrl(req.originalUrl);
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: req.headers.accept || "application/json",
    };
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    const fetchOptions = {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    };
    const r = await fetch(targetUrl, fetchOptions);
    const text = await r.text();
    const contentType = r.headers.get("content-type") || "";
    res.status(r.status);
    if (contentType.includes("application/json")) {
      try {
        return res.json(JSON.parse(text));
      } catch (e) {
        return res.send(text);
      }
    }
    return res.send(text);
  } catch (err) {
    console.error("Proxy error", err);
    return res.status(500).json({ error: "proxy_error", details: String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Supabase proxy running on http://localhost:${PORT}`);
  console.log(`Forwarding to ${SUPABASE_URL}/rest/v1/*`);
});
