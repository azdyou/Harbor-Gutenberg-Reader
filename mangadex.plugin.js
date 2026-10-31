// MangaDex — Harbor manga source.
// Uses MangaDex's public API and public chapter image service.
// This plugin does not bypass account restrictions, locked chapters, or private content.

const API = "https://api.mangadex.org";
const LANG = "en";
const PAGE_SIZE = 100;
const tagsCache = { value: null };

async function getJson(url) {
  const response = await harbor.http(url, { responseType: "text" });
  if (!response || !response.ok) throw new Error("MangaDex HTTP " + (response && response.status));
  try { return JSON.parse(response.body); }
  catch (_) { throw new Error("MangaDex returned invalid JSON."); }
}

function coverOf(manga) {
  const rel = (manga.relationships || []).find((r) => r.type === "cover_art");
  const filename = rel && rel.attributes && rel.attributes.fileName;
  return filename ? "https://uploads.mangadex.org/covers/" + manga.id + "/" + encodeURIComponent(filename) + ".256.jpg" : undefined;
}

function titleOf(manga) {
  const titles = (manga.attributes && manga.attributes.title) || {};
  return titles.en || titles["ja-ro"] || Object.values(titles)[0] || "Untitled manga";
}

function summary(manga) {
  return { id: manga.id, title: titleOf(manga), cover: coverOf(manga) };
}

function listUrl(offset, query, tagId) {
  let url = API + "/manga?limit=24&offset=" + Math.max(0, Number(offset) || 0) +
    "&includes[]=cover_art&order[followedCount]=desc" +
    "&contentRating[]=safe&contentRating[]=suggestive";
  if (query) url += "&title=" + encodeURIComponent(query);
  if (tagId) url += "&includedTags[]=" + encodeURIComponent(tagId);
  return url;
}

const plugin = {
  id: "mangadex-en",
  name: "MangaDex (English)",
  version: "1.0.0",

  async popular(offset, tagId) {
    const data = await getJson(listUrl(offset, "", tagId));
    return (data.data || []).map(summary);
  },

  async search(query, offset, tagId) {
    const data = await getJson(listUrl(offset, String(query || "").trim(), tagId));
    return (data.data || []).map(summary);
  },

  async detail(id) {
    const data = await getJson(API + "/manga/" + encodeURIComponent(id) +
      "?includes[]=cover_art&includes[]=author&includes[]=artist");
    const item = data.data;
    if (!item) return null;
    const attrs = item.attributes || {};
    const descs = attrs.description || {};
    const author = (item.relationships || []).find((r) => r.type === "author");
    const artist = (item.relationships || []).find((r) => r.type === "artist");
    return {
      id: item.id,
      title: titleOf(item),
      cover: coverOf(item),
      description: descs.en || Object.values(descs)[0] || "",
      status: attrs.status || "",
      author: author && author.attributes && author.attributes.name,
      artist: artist && artist.attributes && artist.attributes.name,
      siteUrl: "https://mangadex.org/title/" + item.id,
    };
  },

  async chapters(id) {
    const out = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total && out.length < 1500) {
      const url = API + "/chapter?manga=" + encodeURIComponent(id) +
        "&translatedLanguage[]=" + LANG +
        "&order[volume]=asc&order[chapter]=asc&limit=" + PAGE_SIZE +
        "&offset=" + offset;
      const data = await getJson(url);
      const rows = data.data || [];
      total = Number(data.total) || rows.length;
      for (const ch of rows) {
        const a = ch.attributes || {};
        const pages = Number(a.pages) || 0;
        if (!pages) continue;
        out.push({
          id: ch.id,
          chapter: a.chapter || undefined,
          title: a.title || (a.chapter ? "Chapter " + a.chapter : "Extra chapter"),
          volume: a.volume || undefined,
          pages: pages,
          language: LANG,
          publishAt: a.publishAt || undefined,
        });
      }
      if (!rows.length) break;
      offset += rows.length;
      if (rows.length < PAGE_SIZE) break;
    }
    return out;
  },

  async pageUrls(chapterId) {
    const data = await getJson(API + "/at-home/server/" + encodeURIComponent(chapterId));
    const chapter = data.chapter || {};
    const files = chapter.data || [];
    if (data.result !== "ok" || !data.baseUrl || !chapter.hash || !files.length) {
      throw new Error("MangaDex has no available pages for this chapter.");
    }
    return files.map((file) => data.baseUrl + "/data/" + chapter.hash + "/" + file);
  },

  async tags() {
    if (tagsCache.value) return tagsCache.value;
    const data = await getJson(API + "/manga/tag");
    tagsCache.value = (data.data || []).map((tag) => ({
      id: tag.id,
      name: (tag.attributes && tag.attributes.name && (tag.attributes.name.en || Object.values(tag.attributes.name)[0])) || "Other",
      group: "Genre",
    }));
    return tagsCache.value;
  },
};

return plugin;
