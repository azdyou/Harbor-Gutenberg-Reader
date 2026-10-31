// Royal Road — creator-published web fiction for Harbor's ebook reader.
// Fetches only public chapter pages available without an account or Premium access.
// It does not access drafts, locked content, or Premium-only chapters.

const BASE = "https://www.royalroad.com";
const PAGE_SIZE = 30;

async function fetchText(url) {
  const response = await harbor.http(url, {
    responseType: "text",
    timeoutMs: 25000,
    headers: { "accept": "text/html,application/xhtml+xml,*/*" },
  });
  if (!response || !response.ok) throw new Error("Royal Road HTTP " + (response && response.status));
  return String(response.body || "");
}

async function getDoc(url) {
  return harbor.parseHtml(await fetchText(url));
}

function clean(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function absolute(href, base) {
  if (!href) return "";
  try { return new URL(href, base || BASE).toString(); } catch (_) { return ""; }
}

function fictionId(href) {
  const match = String(href || "").match(/\/fiction\/(\d+)(?:\/|$)/);
  return match ? match[1] : "";
}

function itemFromCard(card, base) {
  const link = card.querySelector("a[href*='/fiction/']");
  if (!link) return null;
  const href = absolute(link.attr("href"), base);
  const id = fictionId(href);
  if (!id) return null;
  const titleNode = card.querySelector(".fiction-title") ||
    card.querySelector("h2") || card.querySelector("h3") || link;
  const image = card.querySelector("img");
  const cover = image && (image.attr("data-src") || image.attr("src"));
  const authorNode = card.querySelector(".author") || card.querySelector(".fiction-author");
  return {
    id,
    title: clean(titleNode.text()) || clean(link.text()) || ("Fiction " + id),
    cover: cover ? absolute(cover, base) : undefined,
    authors: authorNode ? [clean(authorNode.text())] : [],
    siteUrl: BASE + "/fiction/" + id,
  };
}

function summaries(document, base) {
  let cards = document.querySelectorAll(".fiction-list-item");
  if (!cards.length) cards = document.querySelectorAll(".fiction-list-item-container");
  if (!cards.length) cards = document.querySelectorAll("div.fiction-list-item");
  const out = [];
  const seen = new Set();
  for (const card of cards) {
    const item = itemFromCard(card, base);
    if (item && !seen.has(item.id)) { seen.add(item.id); out.push(item); }
  }
  if (!out.length) {
    for (const link of document.querySelectorAll("a[href*='/fiction/']")) {
      const item = itemFromCard(link, base);
      if (item && !seen.has(item.id)) { seen.add(item.id); out.push(item); }
    }
  }
  return out;
}

function extractParagraphs(root) {
  if (!root) return "";
  const nodes = root.querySelectorAll("h1,h2,h3,h4,p,blockquote,li");
  const blocks = nodes.map((node) => clean(node.text())).filter(Boolean);
  if (blocks.length) return blocks.join("\n\n");
  return clean(root.text());
}

function parseChapterLink(href, title, base, position) {
  const url = absolute(href, base);
  if (!url || !/\/fiction\/\d+\/.+\/chapter\//.test(url)) return null;
  const match = url.match(/\/chapter\/(\d+)(?:\/|$)/);
  if (!match) return null;
  return { id: url, title: clean(title) || ("Chapter " + (position + 1)), chapter: (clean(title).match(/^\s*(\d+(?:\.\d+)?)/) || [])[1] || String(position + 1), position };
}

const plugin = {
  id: "royal-road-webfiction",
  name: "Royal Road — Web Fiction",
  version: "1.0.0",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / PAGE_SIZE) + 1;
    const url = BASE + "/fictions/latest-updates?page=" + page;
    return summaries(await getDoc(url), url);
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / PAGE_SIZE) + 1;
    const url = BASE + "/fictions/search?title=" + encodeURIComponent(String(query || "").trim()) + "&page=" + page;
    return summaries(await getDoc(url), url);
  },

  async detail(id) {
    const url = BASE + "/fiction/" + encodeURIComponent(String(id));
    const document = await getDoc(url);
    const titleNode = document.querySelector("h1");
    const metaImage = document.querySelector("meta[property='og:image']");
    const metaDescription = document.querySelector("meta[property='og:description']");
    const descriptionNode = document.querySelector(".description") ||
      document.querySelector(".fiction-description") ||
      document.querySelector(".margin-top-10");
    const authorNode = document.querySelector(".fiction-author") ||
      document.querySelector("a[href*='/profile/']");
    const cover = metaImage && metaImage.attr("content");
    const description = metaDescription && metaDescription.attr("content");
    return {
      id: String(id),
      title: clean(titleNode ? titleNode.text() : "") || ("Fiction " + id),
      cover: cover ? absolute(cover, url) : undefined,
      description: clean(description || (descriptionNode ? descriptionNode.text() : "")),
      authors: authorNode ? [clean(authorNode.text())] : [],
      siteUrl: url,
    };
  },

  async chapters(id) {
    const url = BASE + "/fiction/" + encodeURIComponent(String(id));
    const document = await getDoc(url);
    const out = [];
    const seen = new Set();
    const links = document.querySelectorAll("a[href*='/fiction/" + String(id) + "/'][href*='/chapter/']");
    for (const link of links) {
      const chapter = parseChapterLink(link.attr("href"), link.text(), url, out.length);
      if (chapter && !seen.has(chapter.id)) { seen.add(chapter.id); out.push(chapter); }
    }
    if (!out.length) {
      for (const link of document.querySelectorAll("a[href*='/chapter/']")) {
        const chapter = parseChapterLink(link.attr("href"), link.text(), url, out.length);
        if (chapter && !seen.has(chapter.id)) { seen.add(chapter.id); out.push(chapter); }
      }
    }
    return out;
  },

  async content(chapterId) {
    const url = absolute(String(chapterId), BASE);
    if (!url || !url.startsWith(BASE + "/fiction/")) throw new Error("Invalid Royal Road chapter URL.");
    const document = await getDoc(url);
    const root = document.querySelector("div.chapter-content") ||
      document.querySelector(".chapter-content") ||
      document.querySelector(".chapter-inner");
    const body = extractParagraphs(root);
    if (!body) throw new Error("Royal Road did not return readable public chapter text.");
    return { text: body };
  },
};

return plugin;
