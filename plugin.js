const BASE = "https://www.fuegocine.com";
const FEED = BASE + "/feeds/posts/default";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ROW_SIZE = 40;
const PAGE_SIZE = 50;
const SEARCH_SIZE = 100;
const EPISODES_SIZE = 300;

const ROWS = [
  { id: "estrenos", label: "Estreno", title: "Estrenos", genre: "otros" },
  { id: "peliculas", label: "Movie", title: "Películas", genre: "peliculas" },
  { id: "series", label: "Serie", title: "Series", genre: "series" },
  { id: "accion", label: "Acción", title: "Acción" },
  { id: "comedia", label: "Comedia", title: "Comedia" },
  { id: "terror", label: "Terror", title: "Terror" },
  { id: "drama", label: "Drama", title: "Drama" },
  { id: "suspenso", label: "Suspenso", title: "Suspenso" },
  { id: "ciencia-ficcion", label: "Ciencia ficción", title: "Ciencia ficción" },
  { id: "animacion", label: "Animación", title: "Animación" },
  { id: "ano-2026", label: "2026", title: "Estrenos 2026" },
  { id: "ano-2025", label: "2025", title: "Estrenos 2025" },
  { id: "ano-2024", label: "2024", title: "Estrenos 2024" },
];

function log(...args) {
  try {
    kino.log(...args);
  } catch (e) {
    // nada que hacer
  }
}

function unent(s) {
  return String(s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entryOf(doc) {
  const list = (doc && (doc.entry || (doc.feed && doc.feed.entry))) || [];
  return Array.isArray(list) ? list[0] || null : list;
}

function feedEntries(doc) {
  const list = (doc && doc.feed && doc.feed.entry) || [];
  return Array.isArray(list) ? list : [];
}

function postId(e) {
  const m = /post-(\d+)$/.exec((e && e.id && e.id.$t) || "");
  return m ? m[1] : null;
}

function cats(e) {
  return ((e && e.category) || []).map((c) => c.term).filter(Boolean);
}

function attr(html, name) {
  const m = new RegExp(name + '="([^"]*)"').exec(html);
  return m ? m[1] : null;
}

function runtimeMinutes(s) {
  if (!s) return 0;
  const h = /(\d+)\s*h/.exec(s);
  const m = /(\d+)\s*m/.exec(s);
  const v = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return v >= 1 && v <= 1000 ? v : 0;
}

function synopsis(html) {
  const m = /id="tmdb-synopsis">([\s\S]*?)(?:<\/div>|<\/p>)/.exec(html);
  return m ? textOf(m[1]).slice(0, 2000) : "";
}

function itemFrom(e) {
  const id = postId(e);
  if (!id) return null;
  const c = cats(e);
  const html = (e.content && e.content.$t) || "";
  const pt = (/data-post-type="([a-z]+)"/.exec(html) || [])[1] || "";
  let kind = null;
  if (c.indexOf("Serie") >= 0 || pt === "serie") kind = "series";
  else if (c.indexOf("Movie") >= 0 || pt === "movie") kind = "movie";
  if (!kind) return null;
  const raw = String((e.title && e.title.$t) || "").trim().slice(0, 200);
  const year = attr(html, "data-year") || (/ \((\d{4})\)$/.exec(raw) || [])[1] || c.find((t) => /^(19|20)\d{2}$/.test(t)) || "";
  const title = year ? raw.replace(/\s*\(\d{4}\)$/, "") : raw;
  if (!title) return null;
  const item = { id, ref: id, title: title.slice(0, 200), kind };
  if (year) item.year = String(year).slice(0, 10);
  const poster = (/<img[^>]+src="(https:[^"]+)"/.exec(html) || [])[1];
  if (poster) item.poster = poster.slice(0, 2048);
  const backdrop = attr(html, "data-backdrop");
  if (backdrop && /^https:/.test(backdrop)) item.backdrop = backdrop.slice(0, 2048);
  const overview = synopsis(html);
  if (overview) item.overview = overview;
  const genres = attr(html, "data-genres");
  if (genres) {
    const g = genres
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((s) => s.slice(0, 30));
    if (g.length) item.genres = g;
  }
  const rating = Number(attr(html, "data-imdb"));
  if (rating >= 0 && rating <= 10) item.rating = Math.round(rating * 10) / 10;
  const runtime = runtimeMinutes(attr(html, "data-duartion") || attr(html, "data-duration"));
  if (runtime) item.runtimeMinutes = runtime;
  if (c.indexOf("Estreno") >= 0) item.badges = ["Estreno"];
  return item;
}

function seriesInfo(e) {
  const it = itemFrom(e);
  if (!it) return {};
  const s = {};
  if (it.title) s.title = it.title;
  if (it.poster) s.poster = it.poster;
  if (it.backdrop) s.backdrop = it.backdrop;
  if (it.overview) s.overview = it.overview;
  if (it.genres) s.genres = it.genres;
  if (it.year) s.year = it.year;
  return s;
}

function labelUrl(label, max, start) {
  return FEED + "/-/" + encodeURIComponent(label) + "?alt=json&max-results=" + max + "&start-index=" + start;
}

function natural(a, b) {
  const x = String(a).split(/(\d+)/);
  const y = String(b).split(/(\d+)/);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (i % 2 === 1) return Number(x[i]) - Number(y[i]);
    return x[i] < y[i] ? -1 : 1;
  }
  return x.length - y.length;
}

function svLinks(html) {
  const i = html.indexOf("_SV_LINKS");
  if (i < 0) return [];
  const seg = html.slice(i);
  const re = /lang:\s*"([^"]*)"\s*,\s*name:\s*"([^"]*)"\s*,\s*quality:\s*"([^"]*)"\s*,\s*url:\s*"([^"]*)"\s*,\s*tagVideo:\s*(true|false)/g;
  const out = [];
  let m = re.exec(seg);
  while (m) {
    out.push({ lang: m[1], name: unent(m[2]), quality: m[3], url: unent(m[4]) });
    m = re.exec(seg);
  }
  return out;
}

function fcStream(link) {
  const m = /[?&]link=([^&]+)/.exec(unent(link));
  if (!m) return null;
  let target = m[1];
  try {
    target = decodeURIComponent(target);
  } catch (e) {
    // se queda como está
  }
  if (!/^https?:\/\//.test(target)) return null;
  if (!/\.(mp4|m4v|webm|mkv)(\?|#|$)/i.test(target)) return null;
  return /\.mp4(\?|#|$)/i.test(target) ? { url: target, mime: "video/mp4" } : { url: target };
}

async function okStream(link) {
  const r = await kino.fetch(link, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("ok.ru respondió " + r.status);
  const h = unent(await r.text()).replace(/\\\//g, "/");
  const mp4 = /"videos":\[\s*\{[^}]*?"url":"([^"]+)"/.exec(h);
  if (mp4) {
    const url = mp4[1].replace(/\\u0026/g, "&").replace(/\\u003d/g, "=").replace(/\\u003f/g, "?");
    return { url, mime: "video/mp4", expiresInSeconds: 82800 };
  }
  const hls = /"ondemandHls":"([^"]+)"/.exec(h);
  if (hls) return { url: hls[1].replace(/\\u0026/g, "&"), expiresInSeconds: 82800 };
  throw new Error("ok.ru no entregó enlaces");
}

async function vrStream(link) {
  const u = unent(link);
  let vid = "";
  const direct = /videro\.my\/e\/([A-Za-z0-9]+)/.exec(u);
  if (direct) {
    vid = direct[1];
  } else {
    const m = /[?&]r=([A-Za-z0-9+/=_-]+)/.exec(u);
    if (!m) throw new Error("enlace de videro incompleto");
    let target = "";
    try {
      target = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
    } catch (e) {
      throw new Error("no se pudo leer el enlace de videro");
    }
    const wrapped = /videro\.my\/e\/([A-Za-z0-9]+)/.exec(target);
    if (!wrapped) throw new Error("destino de videro desconocido");
    vid = wrapped[1];
  }
  const r = await kino.fetch("https://videro.my/api/videos/public/" + vid, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("videro respondió " + r.status);
  const j = await r.json();
  if (!j || typeof j.hls_url !== "string" || !j.hls_url) throw new Error("videro no entregó video");
  const s = { url: /^https?:/.test(j.hls_url) ? j.hls_url : "https://videro.my" + j.hls_url };
  if (Array.isArray(j.tracks)) {
    const subs = [];
    for (const t of j.tracks.slice(0, 30)) {
      const u = t && (t.url || t.file || t.src);
      if (typeof u !== "string" || !u) continue;
      const abs = /^https?:/.test(u) ? u : "https://videro.my" + (u.charAt(0) === "/" ? u : "/" + u);
      const lang = String((t && (t.lang || t.language)) || "und").slice(0, 20);
      subs.push({ lang, url: abs, format: /\.srt(\?|#|$)/i.test(abs) ? "srt" : "vtt" });
    }
    if (subs.length) s.subtitles = subs;
  }
  return s;
}

async function avcStream(link) {
  const m = /\/watch\/([A-Za-z0-9]{16,64})/.exec(unent(link));
  if (!m) throw new Error("identificador de avcaption inválido");
  const r = await kino.fetch("https://avcaption.com/api/stream/" + m[1] + "/token", {
    headers: { "User-Agent": UA, Referer: "https://avcaption.com/" },
  });
  if (!r.ok) throw new Error("avcaption respondió " + r.status);
  const j = await r.json();
  const lines = String((j && j.master_m3u8) || "").split(/\r?\n/);
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("#EXT-X-STREAM-INF") !== 0) continue;
    const next = String(lines[i + 1] || "").trim();
    if (!next || next.charAt(0) === "#") continue;
    const bw = /BANDWIDTH=(\d+)/.exec(lines[i]);
    const n = bw ? Number(bw[1]) : 0;
    if (!best || n > best.bw) best = { bw: n, url: next };
  }
  if (!best) throw new Error("avcaption no entregó variantes");
  const s = {
    url: /^https?:/.test(best.url) ? best.url : "https://avcaption.com" + best.url,
    headers: { Referer: "https://avcaption.com/", "User-Agent": UA },
  };
  const exp = Number(j.expires_in);
  if (exp >= 30 && exp <= 86400) s.expiresInSeconds = exp;
  return s;
}

async function pmStream(link) {
  const m = /\/embed\/([A-Za-z0-9]{6,64})/.exec(unent(link));
  if (!m) throw new Error("código de playmate inválido");
  const code = m[1];
  const r = await kino.fetch("https://playmate.to/api/s", {
    method: "POST",
    headers: { "User-Agent": UA, Referer: "https://playmate.to/embed/" + code },
    body: { json: { c: code, d: "web" } },
  });
  if (!r.ok) throw new Error("playmate respondió " + r.status);
  const j = await r.json();
  const master = String((j && j.sx) || "");
  if (!/^https:\/\//.test(master)) throw new Error("playmate no entregó el manifiesto");
  const r2 = await kino.fetch(master, { headers: { "User-Agent": UA, Referer: "https://playmate.to/" } });
  if (!r2.ok) throw new Error("el manifiesto de playmate respondió " + r2.status);
  const txt = await r2.text();
  const lines = txt.split(/\r?\n/);
  let variant = "";
  for (const line of lines) {
    const t = line.trim();
    if (t && t.charAt(0) !== "#") {
      variant = t;
      break;
    }
  }
  if (!variant) throw new Error("playmate no entregó variantes");
  return {
    url: master.replace(/[^/]+$/, variant),
    headers: { Referer: "https://playmate.to/", "User-Agent": UA },
  };
}

const SERVERS = [
  { name: "FC", test: (u) => u.indexOf("repfuegocinefree.blogspot.com") >= 0, run: fcStream },
  { name: "OK.RU", test: (u) => /ok\.ru\//.test(u), run: okStream },
  { name: "VR", test: (u) => u.indexOf("blogfc13.blogspot.com") >= 0 || u.indexOf("videro.my/e/") >= 0, run: vrStream },
  { name: "AVC", test: (u) => u.indexOf("avcaption.com/") >= 0, run: avcStream },
  { name: "PM", test: (u) => u.indexOf("playmate.to/") >= 0, run: pmStream },
];

export async function search(query) {
  await null;
  const text = String((query && query.q) || "").trim();
  if (!text) return [];
  const r = await kino.fetch(FEED + "?alt=json&q=" + encodeURIComponent(text) + "&max-results=" + SEARCH_SIZE);
  if (!r.ok) throw kino.error(r.status === 429 ? "rate_limited" : "unavailable", "fuegocine respondió " + r.status);
  const items = [];
  const seen = new Set();
  const wanted = new Set();
  for (const e of feedEntries(await r.json())) {
    const c = cats(e);
    if (c.indexOf("Episode") >= 0) {
      const sid = c.find((t) => /^id-\d+$/.test(t));
      if (sid) wanted.add(sid.slice(3));
      continue;
    }
    const it = itemFrom(e);
    if (it && !seen.has(it.id)) {
      seen.add(it.id);
      items.push(it);
    }
  }
  const missing = Array.from(wanted)
    .filter((id) => !seen.has(id))
    .slice(0, 5);
  if (missing.length) {
    const docs = await Promise.all(
      missing.map((id) =>
        kino
          .fetch(FEED + "/" + id + "?alt=json")
          .then((x) => (x.ok ? x.json() : null))
          .then((d) => (d ? entryOf(d) : null))
          .catch(() => null)
      )
    );
    for (const e of docs) {
      if (!e) continue;
      const it = itemFrom(e);
      if (it && !seen.has(it.id)) {
        seen.add(it.id);
        items.push(it);
      }
    }
  }
  const type = query && query.type;
  if (type === "series" || type === "movie") {
    items.sort((a, b) => (a.kind === type ? 0 : 1) - (b.kind === type ? 0 : 1));
  }
  return items.slice(0, 100);
}

export async function home() {
  await null;
  const rows = await Promise.all(
    ROWS.map(async (row) => {
      try {
        const r = await kino.fetch(labelUrl(row.label, ROW_SIZE, 1));
        if (!r.ok) return null;
        const items = feedEntries(await r.json())
          .map(itemFrom)
          .filter(Boolean);
        if (!items.length) return null;
        const out = { id: row.id, title: row.title, ref: row.id, items };
        if (row.genre) out.genre = row.genre;
        return out;
      } catch (e) {
        log("home " + row.id + ": " + e.message);
        return null;
      }
    })
  );
  return rows.filter((r) => r !== null);
}

export async function browse(ref, cursor) {
  await null;
  const row = ROWS.find((r) => r.id === ref);
  if (!row) throw kino.error("not_found", "esa sección ya no existe");
  const start = cursor ? parseInt(String(cursor), 10) : 1;
  if (!start || start < 1 || start > 50000) throw kino.error("not_found", "página no válida");
  const r = await kino.fetch(labelUrl(row.label, PAGE_SIZE, start));
  if (!r.ok) throw kino.error(r.status === 429 ? "rate_limited" : "unavailable", "fuegocine respondió " + r.status);
  const list = feedEntries(await r.json());
  const out = { items: list.map(itemFrom).filter(Boolean) };
  if (list.length >= PAGE_SIZE) out.next = String(start + list.length);
  return out;
}

export async function episodes(ref) {
  await null;
  const id = String(ref || "");
  if (!/^\d{5,20}$/.test(id)) throw kino.error("not_found", "serie no válida");
  const rs = await Promise.all([
    kino.fetch(FEED + "/" + id + "?alt=json"),
    kino.fetch(FEED + "/-/id-" + id + "?alt=json&max-results=" + EPISODES_SIZE),
  ]);
  const sr = rs[0];
  if (!sr.ok) throw kino.error(sr.status === 404 ? "not_found" : "unavailable", "fuegocine respondió " + sr.status);
  const se = entryOf(await sr.json());
  if (!se) throw kino.error("not_found", "esa serie ya no existe");
  const info = seriesInfo(se);
  const st = String(info.title || "").toLowerCase();
  const list = rs[1].ok ? feedEntries(await rs[1].json()) : [];
  const seen = new Set();
  const parsed = [];
  const rest = [];
  for (const e of list) {
    const pid = postId(e);
    if (!pid) continue;
    const t = String((e.title && e.title.$t) || "").trim();
    const html = (e.content && e.content.$t) || "";
    const obj = { ref: pid, t, html, e };
    const m = /(\d+)\s*x\s*(\d+)/i.exec(t);
    if (m) {
      const season = Number(m[1]);
      const number = Number(m[2]);
      const key = season + "x" + number;
      if (season >= 1 && season <= 999 && number >= 1 && number <= 99999 && !seen.has(key)) {
        seen.add(key);
        obj.season = season;
        obj.number = number;
        const restTitle = t.replace(m[0], "").replace(/^[\s\-:]+|[\s\-:]+$/g, "");
        const rt = restTitle.toLowerCase();
        if (restTitle && !(st && (st.indexOf(rt) === 0 || rt.indexOf(st) === 0))) obj.title = restTitle.slice(0, 200);
        parsed.push(obj);
        continue;
      }
    }
    rest.push(obj);
  }
  rest.sort((a, b) => natural(a.t, b.t));
  let n = 1;
  for (const obj of rest) {
    while (seen.has("1x" + n)) n++;
    if (n > 99999) break;
    seen.add("1x" + n);
    obj.season = 1;
    obj.number = n++;
  }
  const all = parsed.concat(rest);
  all.sort((a, b) => a.season - b.season || a.number - b.number);
  const episodes = all.map((obj) => {
    const ep = { season: obj.season, number: obj.number, ref: obj.ref };
    if (obj.title) ep.title = obj.title;
    const still = (/<img[^>]+src="(https:[^"]+)"/.exec(obj.html) || [])[1];
    if (still) ep.still = still.slice(0, 2048);
    const ov = synopsis(obj.html);
    if (ov) ep.overview = ov;
    const air = String((obj.e.published && obj.e.published.$t) || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(air)) ep.airDate = air;
    return ep;
  });
  return { series: seriesInfo(se), episodes };
}

export async function resolve(ref) {
  await null;
  const id = String(ref || "");
  if (!/^\d{5,20}$/.test(id)) throw kino.error("not_found", "enlace no válido");
  const r = await kino.fetch(FEED + "/" + id + "?alt=json");
  if (!r.ok) throw kino.error(r.status === 404 ? "not_found" : "unavailable", "fuegocine respondió " + r.status);
  const e = entryOf(await r.json());
  if (!e) throw kino.error("not_found", "ese título ya no existe");
  const links = svLinks((e.content && e.content.$t) || "");
  if (!links.length) throw kino.error("unavailable", "este título no tiene servidores activos");
  for (const server of SERVERS) {
    for (const link of links) {
      if (!server.test(link.url)) continue;
      try {
        const s = await server.run(link.url);
        if (s && s.url) return s;
      } catch (err) {
        log("resolve " + server.name + ": " + err.message);
      }
    }
  }
  throw kino.error("unavailable", "ningún servidor respondió");
}

