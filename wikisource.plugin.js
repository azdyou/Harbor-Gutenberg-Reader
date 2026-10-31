// Wikisource — public-domain eBook source for Harbor.
// Uses the MediaWiki API to search works, read their table of contents, and fetch chapter text.

const API = "https://en.wikisource.org/w/api.php";
const popularCache = { value: null };

async function getJson(params) {
  const url = API + "?" + Object.keys(params).map((key) =>
    encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
  ).join("&");
  const response = await harbor.http(url, { responseType: "text" });
  if (!response || !response.ok) throw new Error("Wikisource HTTP " + (response && response.status));
  try { return JSON.parse(response.body); }
  catch (_) { throw new Error("Wikisource returned invalid JSON."); }
}

function itemFromSearch(item) {
  return {
    id: item.title,
    title: item.title.replace(/_/g, " "),
    description: item.snippet ? item.snippet.replace(/<[^>]+>/g, " ") : "",
  };
}

async function parsePage(title, section) {
  const params = {
    action: "parse",
    page: title,
    prop: "displaytitle|tocdata|text",
    format: "json",
    formatversion: "2",
  };
  if (section !== undefined && section !== null && section !== "") {
    params.section = String(section);
  }
  return getJson(params);
}

function htmlToText(html) {
  try {
    const doc = harbor.parseHtml(String(html || ""));
    const root = doc.querySelector(".mw-parser-output") || doc.querySelector("#mw-content-text") || doc.querySelector("body");
    if (root && typeof root.text === "function") {
      return root.text().replace(/\n{3,}/g, "\n\n").trim();
    }
  } catch (_) {}
  return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function parseId(chapterId) {
  try { return JSON.parse(chapterId); }
  catch (_) { throw new Error("Invalid Wikisource chapter ID."); }
}

async function featuredTitles() {
  if (popularCache.value) return popularCache.value;
  const data = await getJson({
    action: "query",
    list: "categorymembers",
    cmtitle: "Category:Featured_texts",
    cmnamespace: "0",
    cmlimit: "100",
    format: "json",
  });
  let pages = data.query && data.query.categorymembers || [];
  if (!pages.length) {
    const fallback = await getJson({
      action: "query", list: "search", srsearch: "incategory:Featured_texts",
      srnamespace: "0", srlimit: "50", format: "json",
    });
    pages = fallback.query && fallback.query.search || [];
  }
  popularCache.value = pages.map((row) => ({ id: row.title, title: row.title.replace(/_/g, " ") }));
  return popularCache.value;
}

const plugin = {
  id: "wikisource-books",
  name: "Wikisource — Public Domain Books",
  version: "1.0.0",

  async popular(offset) {
    const items = await featuredTitles();
    const start = Math.max(0, Number(offset) || 0);
    return items.slice(start, start + 30);
  },

  async search(query, offset) {
    const data = await getJson({
      action: "query",
      list: "search",
      srsearch: String(query || "").trim(),
      srnamespace: "0",
      srlimit: "30",
      sroffset: String(Math.max(0, Number(offset) || 0)),
      format: "json",
    });
    return (data.query && data.query.search || []).map(itemFromSearch);
  },

  async detail(id) {
    const page = await parsePage(id);
    const result = page.parse || {};
    return {
      id: id,
      title: String(result.displaytitle || result.title || id).replace(/<[^>]+>/g, ""),
      description: "A work hosted by English Wikisource. Wikisource hosts public-domain and freely licensed source texts.",
      author: "",
      siteUrl: "https://en.wikisource.org/wiki/" + encodeURIComponent(String(id).replace(/ /g, "_")),
    };
  },

  async chapters(id) {
    const page = await parsePage(id);
    const result = page.parse || {};
    const sections = result.tocdata && result.tocdata.sections || [];
    if (!sections.length) {
      return [{ id: JSON.stringify({ page: id, section: "" }), title: "Full text", chapter: "Complete work" }];
    }
    return sections.map((row, index) => {
      const section = row.index != null ? row.index : String(index + 1);
      return {
        id: JSON.stringify({ page: id, section: section }),
        title: String(row.line || ("Section " + (index + 1))).replace(/<[^>]+>/g, ""),
        chapter: row.number || String(index + 1),
        position: index,
      };
    });
  },

  async content(chapterId) {
    const target = parseId(chapterId);
    const page = await parsePage(target.page, target.section);
    const html = page.parse && page.parse.text || "";
    const text = htmlToText(html);
    if (!text) throw new Error("Wikisource returned an empty chapter.");
    return { text: text };
  },
};

return plugin;
