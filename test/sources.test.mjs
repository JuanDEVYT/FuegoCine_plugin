// FuegoCine: todo offline, con un fetch falso que imita la fuente y los proveedores.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../sdk/validate.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "JuanDEVYT/kino-plugin-fuegocine";

const json = (v) => new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });
const html = (s) => new Response(s, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
const text = (s) => new Response(s, { status: 200, headers: { "content-type": "application/vnd.apple.mpegurl" } });

function post(id, title, terms, content) {
  return {
    id: { $t: "tag:blogger.com,1999:blog-1.post-" + id },
    title: { $t: title },
    category: terms.map((t) => ({ term: t })),
    content: { $t: content },
    published: { $t: "2026-01-05T12:00:00.000Z" },
  };
}

const movieContent =
  '<div data-post-type="movie"></div>' +
  '<img src="https://media.themoviedb.org/t/p/w440_and_h660_face/poster.jpg">' +
  '<div id="tmdb-synopsis">Una sinopsis de prueba.</div>' +
  '<ul class="post-details mb-4" data-backdrop="https://image.tmdb.org/t/p/original/back.jpg" data-imdb="7.4">' +
  '<li data-duartion="1h 42m"><span>Duración</span>1h 42m</li><li data-year="2024"><span>Año</span>2024</li></ul>' +
  '<div data-genres="Acción,Drama"></div>' +
  '<script>const _SV_LINKS = [{ lang: "lat", name: "FC✅", quality: "HD", url: "https://repfuegocinefree.blogspot.com/?player=fluidplayer&amp;link=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4", tagVideo: false }];</script>';

function svPost(id, title, terms, url) {
  const content =
    '<div data-post-type="movie"></div>' +
    '<img src="https://media.themoviedb.org/t/p/w440_and_h660_face/p2.jpg">' +
    '<div id="tmdb-synopsis">Sinopsis.</div>' +
    '<ul class="post-details mb-4" data-imdb="6"><li data-year="2025"></li></ul>' +
    '<div data-genres="Terror"></div>' +
    '<script>const _SV_LINKS = [{ lang: "lat", name: "X", quality: "HD", url: "' + url + '", tagVideo: false }];</script>';
  return post(id, title, terms, content);
}

const seriesPost = post(
  "9990001112223334445",
  "Gran Serie - Todas las Temporadas (2020 - 2026)",
  ["Serie", "2020", "Drama", "Estreno"],
  '<div data-post-type="serie"></div><img src="https://media.themoviedb.org/t/p/w440_and_h660_face/s.jpg">' +
    '<div id="tmdb-synopsis">Sobre una serie.</div><ul class="post-details mb-4" data-imdb="8.2"><li data-year="2020"></li></ul>' +
    '<div data-genres="Drama,Crimen"></div>'
);

const episode1 = post("1000000000000000001", "Gran Serie 1x1", ["Episode", "id-9990001112223334445"],
  '<div data-post-type="episode"></div><img src="https://www.themoviedb.org/t/p/w1280/still1.jpg">' +
  '<div id="tmdb-synopsis">Episodio uno.</div>');
const episode2 = post("1000000000000000002", "Gran Serie 1x2", ["Episode", "id-9990001112223334445"],
  '<div data-post-type="episode"></div><img src="https://www.themoviedb.org/t/p/w1280/still2.jpg">');

const movie = post("5000000000000000001", "Cine Prueba (2024)", ["Movie", "2024", "Acción", "Estreno"], movieContent);

function source(posts) {
  const asked = [];
  const fetchImpl = async (url, opts = {}) => {
    const u = new URL(String(url));
    asked.push(String(url));
    const path = decodeURIComponent(u.pathname);
    const method = String(opts.method || "GET").toUpperCase();

    if (u.hostname === "videro.my") {
      const m = /^\/api\/videos\/public\/([A-Za-z0-9]+)$/.exec(path);
      if (m) return json({ title: "t", share_id: m[1], hls_url: "/hls/aaa/index.m3u8", tracks: [] });
      return new Response("no", { status: 404 });
    }
    if (u.hostname === "avcaption.com") {
      const m = /^\/api\/stream\/([A-Za-z0-9]+)\/token$/.exec(path);
      if (m) {
        return json({
          expires_in: 14400,
          playlist_token: "tok",
          session_id: "s",
          master_m3u8:
            "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360\n" +
            "/api/stream/" + m[1] + "/playlist?token=tok&v=360p\n" +
            "#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1920x1080\n" +
            "/api/stream/" + m[1] + "/playlist?token=tok&v=1080p\n",
        });
      }
      return new Response("no", { status: 404 });
    }
    if (u.hostname === "playmate.to") {
      if (path === "/api/s" && method === "POST") {
        const body = String(opts.body || "");
        assert.ok(body.includes('"c":"CODE720"'), "el cuerpo lleva el filecode");
        return json({ sx: "https://frv2.plauymito.live/hls/xyz/master.txt" });
      }
      return new Response("no", { status: 404 });
    }
    if (u.hostname === "frv2.plauymito.live") {
      if (path === "/hls/xyz/master.txt")
        return text("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720\nindex_avc_720p.txt\n");
      return new Response("no", { status: 404 });
    }
    if (u.hostname === "ok.ru") {
      return html(
        '<script>var x = &quot;ondemandHls&quot;:&quot;https:\\/\\/vd.okcdn.ru\\/h.m3u8&quot;,' +
          '&quot;videos&quot;:[{&quot;name&quot;:&quot;full&quot;,&quot;url&quot;:&quot;https:\\/\\/vd524.okcdn.ru\\/?expires=1\\u0026sig=abc&quot;}]</script>'
      );
    }
    if (u.hostname !== "www.fuegocine.com") return new Response("?", { status: 404 });

    if (/^\/feeds\/posts\/default\/-\/.+/.test(path)) {
      const label = path.replace(/^\/feeds\/posts\/default\/-\//, "");
      const max = Number(u.searchParams.get("max-results") || "25");
      const start = Number(u.searchParams.get("start-index") || "1");
      const hits = posts.filter((p) => (p.category || []).some((c) => c.term === label));
      return json({ feed: { entry: hits.slice(start - 1, start - 1 + max) } });
    }
    const one = /^\/feeds\/posts\/default\/(\d+)$/.exec(path);
    if (one) {
      const found = posts.filter((p) => p.id.$t.endsWith("post-" + one[1]));
      return json(found.length ? { entry: found } : { feed: { entry: [] } });
    }
    if (path === "/feeds/posts/default" && u.searchParams.has("q")) {
      const q = (u.searchParams.get("q") || "").toLowerCase();
      const hits = posts.filter((p) => {
        const hay = ((p.title && p.title.$t) || "") + " " + ((p.content && p.content.$t) || "");
        return hay.toLowerCase().includes(q);
      });
      return json({ feed: { entry: hits.slice(0, Number(u.searchParams.get("max-results") || "25")) } });
    }
    return json({ feed: { entry: posts } });
  };
  return { fetchImpl, asked };
}

async function run(fn, args, fetchImpl) {
  const r = await validate(root, { run: fn, args, fetchImpl, repo: REPO });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.drops, []);
  return r.output;
}

test("el manifiesto cumple el contrato", async () => {
  const r = await validate(root, { repo: REPO });
  assert.deepEqual(r.problems, []);
  const m = JSON.parse(readFileSync(join(root, "kino-plugin.json"), "utf8"));
  assert.equal(m.id, "fuegocine");
  assert.equal(m.apiVersion, 5);
  assert.equal(m.entry, "plugin.js");
  assert.equal(m.icon, "icon.png");
  assert.equal(m.streamHosts, "any");
  assert.ok(m.capabilities.includes("download"));
  assert.ok(m.hosts.includes("www.fuegocine.com"));
  assert.ok(!m.entry.startsWith("./") && !m.icon.startsWith("./"));
});

test("search: los capítulos llevan a su serie y las películas quedan como películas", async () => {
  const { fetchImpl, asked } = source([episode1, movie, seriesPost]);
  const out = await run("search", ["1x1"], fetchImpl);
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].kind, "series");
  assert.equal(out.items[0].id, "9990001112223334445");
  assert.ok(asked.some((u) => u.includes("/9990001112223334445?")));

  const found = await run("search", ["Cine Prueba"], fetchImpl);
  assert.equal(found.items.length, 1);
  assert.equal(found.items[0].kind, "movie");
  assert.equal(found.items[0].year, "2024");
  assert.deepEqual(found.items[0].genres, ["Acción", "Drama"]);
  assert.equal(found.items[0].rating, 7.4);
  assert.equal(found.items[0].runtimeMinutes, 102);
  assert.deepEqual(found.items[0].badges, ["Estreno"]);

  const none = await run("search", ["   "], fetchImpl);
  assert.deepEqual(none.items, []);
});

test("home: solo quedan las filas con contenido, browse pagina con start-index", async () => {
  const many = [];
  for (let i = 0; i < 53; i++) {
    many.push(post(String(600000000000000 + i), "Película " + i + " (2025)", ["Movie", "2025"], movieContent));
  }
  const { fetchImpl } = source([movie, seriesPost, ...many]);
  const rows = await run("home", [], fetchImpl);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["estrenos", "peliculas", "series", "accion", "drama", "ano-2025", "ano-2024"]
  );
  assert.equal(rows[0].genre, "otros");
  assert.equal(rows[1].genre, "peliculas");
  assert.equal(rows[2].genre, "series");
  assert.ok(rows[1].items.length > 0);

  const page1 = await run("browse", ["peliculas", null], fetchImpl);
  assert.equal(page1.items.length, 50);
  assert.equal(page1.next, "51");
  const page2 = await run("browse", ["peliculas", "51"], fetchImpl);
  assert.equal(page2.items.length, 4);
  assert.equal(page2.next, null);
});

test("episodes: ordena por temporada y capítulo y quita el nombre de la serie repetido", async () => {
  const { fetchImpl } = source([seriesPost, episode2, episode1]);
  const out = await run("episodes", ["9990001112223334445"], fetchImpl);
  assert.equal(out.series.title, "Gran Serie - Todas las Temporadas (2020 - 2026)");
  assert.deepEqual(out.episodes.map((e) => [e.season, e.number]), [[1, 1], [1, 2]]);
  assert.equal(out.episodes[0].title, "");
  assert.equal(out.episodes[0].still, "https://www.themoviedb.org/t/p/w1280/still1.jpg");
  assert.equal(out.episodes[0].airDate, "2026-01-05");
});

test("resolve FC: enlace directo, sin tocar el servidor del enlace", async () => {
  const { fetchImpl, asked } = source([movie]);
  const s = await run("resolve", ["5000000000000000001"], fetchImpl);
  assert.equal(s.url, "https://cdn.example.com/video.mp4");
  assert.equal(s.mime, "video/mp4");
  assert.equal(asked.length, 1);
});

test("resolve VR: decodifica el enlace corto y usa el HLS de videro", async () => {
  const short = "https://blogfc13.blogspot.com/?m=1.html?r=" + Buffer.from("https://videro.my/e/abc123xyz").toString("base64");
  const p = svPost("5000000000000000002", "Pelicula VR (2025)", ["Movie", "2025"], short);
  const { fetchImpl } = source([p]);
  const s = await run("resolve", ["5000000000000000002"], fetchImpl);
  assert.equal(s.url, "https://videro.my/hls/aaa/index.m3u8");
});

test("resolve AVC: pide el token y elige la variante de mayor bitrate", async () => {
  const p = svPost("5000000000000000003", "Pelicula AVC (2025)", ["Movie", "2025"], "https://avcaption.com/watch/aaaabbbbccccdddd1111");
  const { fetchImpl } = source([p]);
  const s = await run("resolve", ["5000000000000000003"], fetchImpl);
  assert.equal(s.url, "https://avcaption.com/api/stream/aaaabbbbccccdddd1111/playlist?token=tok&v=1080p");
  assert.equal(s.expiresInSeconds, 14400);
  assert.equal(s.headers.Referer, "https://avcaption.com/");
});

test("resolve PM: consulta playmate y resuelve la variante del manifiesto", async () => {
  const p = svPost("5000000000000000004", "Pelicula PM (2025)", ["Movie", "2025"], "https://playmate.to/embed/CODE720");
  const { fetchImpl } = source([p]);
  const s = await run("resolve", ["5000000000000000004"], fetchImpl);
  assert.equal(s.url, "https://frv2.plauymito.live/hls/xyz/index_avc_720p.txt");
  assert.equal(s.headers.Referer, "https://playmate.to/");
});

test("resolve OK.RU: lee el mp4 del HTML escapado y recuerda cuándo vence", async () => {
  const p = svPost("5000000000000000005", "Pelicula OK (2025)", ["Movie", "2025"], "https://ok.ru/videoembed/12345");
  const { fetchImpl } = source([p]);
  const s = await run("resolve", ["5000000000000000005"], fetchImpl);
  assert.equal(s.url, "https://vd524.okcdn.ru/?expires=1&sig=abc");
  assert.equal(s.mime, "video/mp4");
  assert.equal(s.expiresInSeconds, 82800);
});
