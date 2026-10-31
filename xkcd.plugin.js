// xkcd — official webcomic archive for Harbor's manga/page reader.
// xkcd comics are authored by Randall Munroe. The source links to the official
// image files and does not rehost them. See https://xkcd.com/license.html.

const API = "https://xkcd.com";
const EXPLAIN = "https://www.explainxkcd.com/wiki/api.php";
let latestNumber = null;

async function getJson(url) {
  const response = await harbor.http(url, {
    responseType: "text",
    timeoutMs: 20000,
    headers: { "accept": "application/json" },
  });
  if (!response || !response.ok) throw new Error("xkcd HTTP " + (response && response.status));
  try { return JSON.parse(response.body); }
  catch (_) { throw new Error("xkcd returned invalid JSON."); }
}

async function getComic(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) throw new Error("Invalid xkcd comic number.");
  return getJson(API + "/" + n + "/info.0.json");
}

function summary(comic) {
  return {
    id: String(comic.num),
    title: String(comic.safe_title || comic.title || ("xkcd #" + comic.num)),
    cover: comic.img,
    description: comic.alt || comic.transcript || "",
    siteUrl: API + "/" + comic.num,
  };
}

function comicNumber(title) {
  const match = String(title || "").match(/^\s*(\d+)\s*:/);
  return match ? Number(match[1]) : null;
}

const plugin = {
  id: "xkcd-comics",
  name: "xkcd — Webcomic Archive",
  version: "1.0.0",

  async popular(offset) {
    if (!latestNumber) {
      const latest = await getJson(API + "/info.0.json");
      latestNumber = Number(latest.num);
    }
    const start = latestNumber - Math.max(0, Number(offset) || 0);
    const items = [];
    for (let n = start; n > 0 && items.length < 24; n--) {
      try { items.push(summary(await getComic(n))); }
      catch (_) { /* skip withdrawn or missing numbers */ }
    }
    return items;
  },

  async search(query, offset) {
    const url = EXPLAIN + "?action=query&list=search&srsearch=" +
      encodeURIComponent(String(query || "").trim()) + "&srlimit=30&format=json&origin=*";
    const data = await getJson(url);
    const rows = data.query && data.query.search ? data.query.search : [];
    const numbers = rows.map((row) => comicNumber(row.title)).filter(Boolean);
    const start = Math.max(0, Number(offset) || 0);
    const items = [];
    for (const number of numbers.slice(start, start + 24)) {
      try { items.push(summary(await getComic(number))); } catch (_) {}
    }
    return items;
  },

  async detail(id) {
    const comic = await getComic(id);
    return {
      id: String(comic.num),
      title: String(comic.safe_title || comic.title),
      cover: comic.img,
      description: [comic.alt, comic.transcript].filter(Boolean).join("\n\n"),
      siteUrl: API + "/" + comic.num,
    };
  },

  async chapters(id) {
    const comic = await getComic(id);
    return [{
      id: String(comic.num),
      title: String(comic.safe_title || comic.title),
      chapter: "#" + comic.num,
      pages: 1,
    }];
  },

  async pageUrls(chapterId) {
    const comic = await getComic(chapterId);
    if (!comic.img) throw new Error("This xkcd entry has no image.");
    return [comic.img];
  },
};

return plugin;
