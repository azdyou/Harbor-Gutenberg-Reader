// FMHY Source Directory — searchable directory for Harbor's ebook extension manager.
//
// This plugin presents the project's curated FMHY-derived source registry as a
// searchable catalogue. It supports Movies, TV, Anime, Books, Comics, Music,
// Games, Software, and ROM reference resources.
//
// This is a directory/link extension, not a media scraper or downloader.
// Selecting an item exposes its provider URL through siteUrl and the text card.
// API entries may require keys or query parameters. Follow each provider's terms.

const DATA_URL = "https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/data/fmhy_sources.json";
const PAGE_SIZE = 24;
const ALLOWED_CATEGORIES = [
  "movies", "tv", "anime", "books", "comics",
  "music", "games", "software", "roms"
];

const CATEGORY_NAMES = {
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

const TYPE_NAMES = {
  api: "API / Metadata",
  direct_download: "Direct download",
  scrape: "Website / Catalogue",
  magnet: "Magnet"
};

let cachedEntries = null;
let pendingLoad = null;

function text(value) {
  return value == null ? "" : String(value);
}

function safeOffset(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.floor(number)
    : 0;
}

function slug(value) {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "source";
}

function entryId(entry, index) {
  return entry.category + "-" + slug(entry.name) + "-" + index;
}

async function loadEntries() {
  if (cachedEntries) return cachedEntries;
  if (pendingLoad) return pendingLoad;

  pendingLoad = (async function () {
    const response = await harbor.http(DATA_URL, {
      responseType: "text",
      timeoutMs: 20000,
      headers: { "accept": "application/json" }
    });

    if (!response || !response.ok) {
      throw new Error(
        "FMHY directory could not be loaded (HTTP " +
        (response && response.status) + "). Check your connection or try again."
      );
    }

    let document;
    try {
      document = JSON.parse(text(response.body));
    } catch (_) {
      throw new Error("The FMHY directory returned invalid JSON.");
    }

    if (!document || !Array.isArray(document.entries)) {
      throw new Error("The FMHY directory has no entries array.");
    }

    const entries = document.entries
      .filter((entry) =>
        entry &&
        text(entry.name).trim() &&
        /^https?:\/\//i.test(text(entry.url)) &&
        ALLOWED_CATEGORIES.includes(text(entry.category).toLowerCase())
      )
      .map((entry, index) => {
        const normalized = {
          name: text(entry.name).trim(),
          url: text(entry.url).trim(),
          category: text(entry.category).toLowerCase(),
          type: text(entry.type).toLowerCase() || "scrape",
          unofficial: entry.unofficial === true,
          notes: text(entry.notes).trim(),
          source_page: text(entry.source_page),
          source_file: text(entry.source_file)
        };

        normalized.id = entryId(normalized, index);
        return normalized;
      });

    if (!entries.length) {
      throw new Error("No usable FMHY directory entries were found.");
    }

    cachedEntries = entries;
    return entries;
  })();

  try {
    return await pendingLoad;
  } finally {
    pendingLoad = null;
  }
}

function matchesTag(entry, tagId) {
  const tag = text(tagId).toLowerCase().trim();
  if (!tag) return true;

  if (ALLOWED_CATEGORIES.includes(tag)) {
    return entry.category === tag;
  }

  if (tag.indexOf("category-") === 0) {
    return entry.category === tag.slice(9);
  }

  if (tag.indexOf("type-") === 0) {
    return entry.type === tag.slice(5);
  }

  return entry.category === tag || entry.type === tag;
}

function matchesQuery(entry, query) {
  const needle = text(query).trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    entry.name,
    entry.url,
    entry.category,
    entry.type,
    entry.notes
  ].join(" ").toLowerCase();

  return haystack.indexOf(needle) !== -1;
}

function summary(entry) {
  return {
    id: entry.id,
    title: entry.name,
    author: CATEGORY_NAMES[entry.category] || entry.category,
    description: entry.notes,
    siteUrl: entry.url
  };
}

function findEntry(entries, id) {
  return entries.find((entry) => entry.id === text(id)) || null;
}

function sourceText(entry) {
  const lines = [
    entry.name,
    "Category: " + (CATEGORY_NAMES[entry.category] || entry.category),
    "Type: " + (TYPE_NAMES[entry.type] || entry.type),
    "Unofficial: " + (entry.unofficial ? "Yes" : "No"),
    "",
    "Source URL:",
    entry.url,
    "",
    "Notes:",
    entry.notes || "No additional notes supplied.",
    "",
    "FMHY reference:",
    entry.source_page || "https://fmhy.net/",
    "",
    "This extension is a searchable source directory. It does not proxy, stream, scrape, or download content. API endpoints may require credentials, query parameters, or provider-specific setup."
  ];

  return lines.join("\n");
}

const plugin = {
  id: "fmhy-source-directory",
  name: "FMHY — Source Directory",
  version: "1.0.0",

  async popular(offset, tagId) {
    const entries = await loadEntries();
    const filtered = entries.filter((entry) => matchesTag(entry, tagId));
    const start = safeOffset(offset);

    return filtered
      .slice(start, start + PAGE_SIZE)
      .map(summary);
  },

  async search(query, offset, tagId) {
    const entries = await loadEntries();
    const filtered = entries.filter((entry) =>
      matchesTag(entry, tagId) && matchesQuery(entry, query)
    );
    const start = safeOffset(offset);

    return filtered
      .slice(start, start + PAGE_SIZE)
      .map(summary);
  },

  async detail(id) {
    const entries = await loadEntries();
    const entry = findEntry(entries, id);
    if (!entry) return null;

    return {
      id: entry.id,
      title: entry.name,
      description: [
        "Category: " + (CATEGORY_NAMES[entry.category] || entry.category),
        "Type: " + (TYPE_NAMES[entry.type] || entry.type),
        entry.unofficial ? "Unofficial source" : "Official / authorized source",
        "",
        entry.notes
      ].filter(Boolean).join("\n"),
      siteUrl: entry.url,
      author: "FMHY Source Directory"
    };
  },

  async chapters(id) {
    const entries = await loadEntries();
    const entry = findEntry(entries, id);
    if (!entry) return [];

    return [{
      id: entry.id,
      title: "Source details and link",
      chapter: "Directory entry",
      pages: 1
    }];
  },

  async content(id) {
    const entries = await loadEntries();
    const entry = findEntry(entries, id);
    if (!entry) throw new Error("FMHY source entry not found.");

    return { text: sourceText(entry) };
  },

  async tags() {
    const entries = await loadEntries();

    const categories = ALLOWED_CATEGORIES
      .filter((category) => entries.some((entry) => entry.category === category))
      .map((category) => ({
        id: category,
        name: CATEGORY_NAMES[category],
        group: "Category"
      }));

    const types = ["api", "direct_download", "scrape", "magnet"]
      .filter((type) => entries.some((entry) => entry.type === type))
      .map((type) => ({
        id: "type-" + type,
        name: TYPE_NAMES[type] || type,
        group: "Type"
      }));

    return categories.concat(types);
  }
};

return plugin;
