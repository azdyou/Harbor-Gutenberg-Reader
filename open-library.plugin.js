// Open Library — book discovery, metadata, and official library reading/borrow links.
// It does not bypass lending controls, waitlists, DRM, or account requirements.

const API = "https://openlibrary.org";
const FIELDS = "key,title,author_name,first_publish_year,cover_i,edition_key,has_fulltext,public_scan_b,ebook_access,subject";

async function getJson(url) {
  const response = await harbor.http(url, {
    responseType: "text",
    timeoutMs: 20000,
    headers: { "accept": "application/json" },
  });
  if (!response || !response.ok) throw new Error("Open Library HTTP " + (response && response.status));
  try { return JSON.parse(response.body); }
  catch (_) { throw new Error("Open Library returned invalid JSON."); }
}

function workId(key) {
  return String(key || "").replace(/^\/works\//, "");
}

function cover(doc) {
  return doc.cover_i ? "https://covers.openlibrary.org/b/id/" + doc.cover_i + "-L.jpg" : undefined;
}

function summary(doc) {
  const id = workId(doc.key);
  if (!id) return null;
  return {
    id,
    title: String(doc.title || "Untitled"),
    cover: cover(doc),
    authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 4) : [],
    year: Number(doc.first_publish_year) || undefined,
    siteUrl: API + "/works/" + id,
  };
}

function searchUrl(query, page) {
  return API + "/search.json?q=" + encodeURIComponent(query) +
    "&fields=" + encodeURIComponent(FIELDS) +
    "&limit=30&page=" + page;
}

const plugin = {
  id: "open-library-catalog",
  name: "Open Library — Catalogue & External Borrow Links",
  version: "1.0.1",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 30) + 1;
    const data = await getJson(searchUrl("subject:fiction", page));
    return (data.docs || []).map(summary).filter(Boolean);
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / 30) + 1;
    const data = await getJson(searchUrl(String(query || "").trim(), page));
    return (data.docs || []).map(summary).filter(Boolean);
  },

  async detail(id) {
    const data = await getJson(API + "/works/" + encodeURIComponent(id) + ".json");
    const description = typeof data.description === "string" ? data.description :
      (data.description && data.description.value) || "";
    const subjects = Array.isArray(data.subjects) ? data.subjects.slice(0, 12).join(", ") : "";
    return {
      id,
      title: String(data.title || id),
      description: [description, subjects, "Catalogue record only: this extension does not provide full-text chapters. Open the official record to check reading or borrowing availability."].filter(Boolean).join("\n\n"),
      cover: data.covers && data.covers[0] ? "https://covers.openlibrary.org/b/id/" + data.covers[0] + "-L.jpg" : undefined,
      siteUrl: API + "/works/" + id,
    };
  },

  // Work metadata is not chapter text. Do not invent a Catalog chapter.
  async chapters(id) { return []; },

  async content(id) {
    const data = await getJson(API + "/works/" + encodeURIComponent(id) + ".json");
    const description = typeof data.description === "string" ? data.description :
      (data.description && data.description.value) || "";
    return {
      text: [
        String(data.title || id),
        description,
        "Open the official Open Library record to see borrowing or reading availability:",
        API + "/works/" + id,
        "Borrowing availability, lending restrictions, and reading access are controlled by Open Library. This extension does not bypass them.",
      ].filter(Boolean).join("\n\n"),
    };
  },
};

return plugin;
