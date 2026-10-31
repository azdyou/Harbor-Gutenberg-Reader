// FMHY Universal Hub — one searchable directory covering all nine FMHY categories.
// This is a catalogue and outbound-link extension, not a universal player or downloader.
// Video, music, games, software and ROMs still require their own compatible apps/protocols.

const DATA_URL = "https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/data/fmhy_sources.json";
const PAGE_SIZE = 24;

const CATEGORIES = [
  "movies", "tv", "anime", "books", "comics",
  "music", "games", "software", "roms"
];

const CATEGORY_LABELS = {
  movies: "Movies",
  tv: "TV",
  anime: "Anime",
  books: "Books",
  comics: "Comics",
  music: "Music",
  games: "Games",
  software: "Software",
  roms: "Game ROMs"
};

const TYPE_LABELS = {
  api: "API / catalogue endpoint",
  direct_download: "Direct download / official file",
  scrape: "Website / reference",
  magnet: "Magnet"
};

let entriesCache = null;
let entriesRequest = null;

function asText(value) {
  return value == null ? "" : String(value);
}

function makeSlug(value) {
  return asText(value).toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "source";
}

function cleanEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = asText(raw.name).trim();
  const url = asText(raw.url).trim();
  const category = asText(raw.category).toLowerCase().trim();
  if (!name || !/^https?:\/\//i.test(url) || !CATEGORIES.includes(category)) return null;

  const type = asText(raw.type).toLowerCase().trim() || "scrape";
  const sourcePage = asText(raw.source_page).trim() || "https://fmhy.net/";
  const notes = asText(raw.notes).trim();

  return {
    id: category + "-" + makeSlug(name),
    name,
    url,
    category,
    type,
    unofficial: raw.unofficial === true,
    notes,
    sourcePage,
    // Only point directly at a provider website when the value is a human-facing
    // website or a concrete download. API templates belong in the details text.
    openUrl: (type === "scrape" || type === "direct_download") ? url : sourcePage
  };
}

async function loadEntries() {
  if (entriesCache) return entriesCache;
  if (entriesRequest) return entriesRequest;

  entriesRequest = (async () => {
    const response = await harbor.http(DATA_URL, {
      responseType: "text",
      timeoutMs: 15000,
      headers: { "accept": "application/json" }
    });

    if (!response || !response.ok) {
      throw new Error("FMHY catalogue request failed (HTTP " + (response && response.status) + ").");
    }

    let document;
    try {
      document = JSON.parse(asText(response.body));
    } catch (_) {
      throw new Error("FMHY catalogue returned invalid JSON.");
    }

    if (!document || !Array.isArray(document.entries)) {
      throw new Error("FMHY catalogue is missing its entries list.");
    }

    const entries = document.entries.map(cleanEntry).filter(Boolean);
    if (!entries.length) throw new Error("FMHY catalogue contains no usable source entries.");

    entries.sort((a, b) =>
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
      a.name.localeCompare(b.name)
    );

    entriesCache = entries;
    return entries;
  })();

  try {
    return await entriesRequest;
  } finally {
    entriesRequest = null;
  }
}

function matchesCategory(entry, tagId) {
  const tag = asText(tagId).toLowerCase().trim();
  if (!tag) return true;
  if (CATEGORIES.includes(tag)) return entry.category === tag;
  if (tag.startsWith("category-")) return entry.category === tag.slice(9);
  if (tag.startsWith("type-")) return entry.type === tag.slice(5);
  return true;
}

function matchesSearch(entry, query) {
  const q = asText(query).trim().toLowerCase();
  if (!q) return true;
  const categoryName = CATEGORY_LABELS[entry.category] || entry.category;
  const haystack = [
    entry.name, entry.url, entry.category, categoryName,
    entry.type, TYPE_LABELS[entry.type] || entry.type, entry.notes
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}

function toSummary(entry) {
  return {
    id: entry.id,
    title: entry.name,
    author: CATEGORY_LABELS[entry.category],
    description: [
      TYPE_LABELS[entry.type] || entry.type,
      entry.notes
    ].filter(Boolean).join(" — "),
    siteUrl: entry.openUrl
  };
}

function findEntry(entries, id) {
  return entries.find((entry) => entry.id === asText(id)) || null;
}

function formatEntry(entry) {
  const lines = [
    entry.name,
    "",
    "Category: " + (CATEGORY_LABELS[entry.category] || entry.category),
    "Type: " + (TYPE_LABELS[entry.type] || entry.type),
    "Unofficial: " + (entry.unofficial ? "Yes" : "No"),
    "",
    "Source URL / API template:",
    entry.url,
    "",
    "Notes:",
    entry.notes || "No additional notes recorded.",
    "",
    "FMHY reference:",
    entry.sourcePage,
    "",
    "This is a source directory entry, not a built-in player. API endpoints may need a query, API key, client ID, or provider-specific request. Open the FMHY reference or provider website for setup information."
  ];
  return lines.join("\n");
}

const plugin = {
  id: "fmhy-universal-hub",
  name: "FMHY Universal Hub",
  version: "1.0.0",

  async popular(offset, tagId) {
    const entries = await loadEntries();
    const filtered = entries.filter((entry) => matchesCategory(entry, tagId));
    const start = Math.max(0, Number(offset) || 0);
    return filtered.slice(start, start + PAGE_SIZE).map(toSummary);
  },

  async search(query, offset, tagId) {
    const entries = await loadEntries();
    const filtered = entries.filter((entry) =>
      matchesCategory(entry, tagId) && matchesSearch(entry, query)
    );
    const start = Math.max(0, Number(offset) || 0);
    return filtered.slice(start, start + PAGE_SIZE).map(toSummary);
  },

  async detail(id) {
    const entry = findEntry(await loadEntries(), id);
    if (!entry) return null;
    return {
      id: entry.id,
      title: entry.name,
      author: "FMHY Universal Hub",
      description: formatEntry(entry),
      siteUrl: entry.openUrl
    };
  },

  async chapters(id) {
    const entry = findEntry(await loadEntries(), id);
    if (!entry) return [];
    return [{
      id: entry.id,
      title: "Source information",
      chapter: CATEGORY_LABELS[entry.category],
      position: 0
    }];
  },

  async content(chapterId) {
    const entry = findEntry(await loadEntries(), chapterId);
    if (!entry) throw new Error("FMHY source entry not found.");
    return { text: formatEntry(entry) };
  },

  async tags() {
    const entries = await loadEntries();
    const categories = CATEGORIES
      .filter((category) => entries.some((entry) => entry.category === category))
      .map((category) => ({
        id: category,
        name: CATEGORY_LABELS[category],
        group: "Category"
      }));

    const types = ["api", "direct_download", "scrape", "magnet"]
      .filter((type) => entries.some((entry) => entry.type === type))
      .map((type) => ({
        id: "type-" + type,
        name: TYPE_LABELS[type] || type,
        group: "Source type"
      }));

    return categories.concat(types);
  }
};

return plugin;
