# FuegoCine plugin for Kino

A plugin for the Kino video app that brings [fuegocine.com](https://www.fuegocine.com) into Kino's
search, Home and player. One manifest, one JavaScript file, no build step.

## What it does

| Capability | How |
| --- | --- |
| `search` | Titles from fuegocine's public search feed (up to 100 answers at once): movies, series and episodes. An episode is listed as its own series (its label `id-<post>`), so "Neagley 1x8" puts the series card, not a loose chapter. |
| `home` | Thirteen rows straight from the site's labels: Estrenos, Películas, Series, Acción, Comedia, Terror, Drama, Suspenso, Ciencia ficción, Animación and the years 2024-2026, 40 titles each. Only rows with content are shown. |
| `browse` | "Ver más" on a Home row: the same label with Blogger's `start-index`, 50 titles per page, the next start as cursor (`"51"`, `"101"`, ...). |
| `episodes` | Every chapter of a series from its `id-<post>` label, sorted by season and episode (`Neagley 1x8`), with still, overview and air date. |
| `resolve` | The first server that answers, in order: FuegoCine's own links (direct mp4), OK.RU (the mp4 inside its embed page, or its HLS), videro (HLS), avcaption (token + HLS playlist) and playmate (HLS). Expiring links carry `expiresInSeconds` so Kino re-resolves when needed. |
| `download` | Declarative, no code: Kino offers the titles for offline viewing on phones and saves what `resolve` returns. HLS/DASH answers are streamed by the app; the direct mp4 files download whole. Installing or updating to a version with it shows "Puede descargar videos para verlos sin conexión". |

## Hosts, and why `streamHosts: "any"`

The manifest declares `www.fuegocine.com` (the only site it reads), `ok.ru`, `videro.my`,
`avcaption.com`, `playmate.to` and `plauymito.live`. The video files themselves live on rotating
CDNs (any `*.blogspot.com` player host, any `okcdn.ru`/`okcdn` node, any file host FuegoCine links
to), which change without notice, so the manifest uses `streamHosts: "any"` (apiVersion 5) and the
player trusts any host a resolved stream points at. Kino shows the list to the person before
installing.

## Install it in Kino

In Kino open Ajustes > Plugins and type the address of this repository:

```
JuanDEVYT/kino-plugin-fuegocine
```

Kino reads `kino-plugin.json` and `plugin.js` from the repository root, shows the hosts the plugin
will reach and asks for approval before anything runs.

## Run and test it on your computer

Node 18 or newer; the SDK uses the same `kino` API as the app:

```
node sdk/run.mjs . search "reacher"
node sdk/run.mjs . home
node sdk/run.mjs . browse peliculas 51
node sdk/run.mjs . episodes 975356002567026248
node sdk/run.mjs . resolve 4704724414518210721
node sdk/validate.mjs .
node --test "test/*.test.mjs"
```

`test/sources.test.mjs` runs everything offline against a fake source (the same shapes Blogger and
the five players answer), so it needs no network.

## Write your own plugin

- [`GUIDE.md`](GUIDE.md) is the authoring guide: file layout, manifest and settings, the five
  functions your code can export, the `kino` API, every limit, the quirks of the JavaScript engine
  and five cookbook recipes.
- [`contract.json`](contract.json) holds every number and rule Kino enforces, and
  [`kino.d.ts`](kino.d.ts) declares the `kino` API for your editor.
- [`sdk/`](sdk) lets you run and test a plugin on your computer with Node 18 or newer.

## License

The code in this repository is licensed under the [Apache License 2.0](LICENSE). Copyright 2026
JuanDEVYT; the plugin template comes from kinotvapp.

## License note

What this plugin plays is not ours to license: the videos belong to fuegocine.com and their
uploaders. Check a title's page before you reuse or redistribute it.
