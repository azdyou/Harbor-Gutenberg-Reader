// Open-license comics from Internet Archive — Harbor manga/page-reader source.
// Search results are restricted to public-domain or CC BY / CC BY-SA metadata.
// This source does not expose borrow-only or rights-unclear items.

const IA = "https://archive.org";
const SEARCH_SIZE = 24;
const manifestCache = Object.create(null);

function safeText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value == null ? "" : String(value);
}

function licenseAllowed(value) {
  const license = safeText(value).toLowerCase();
  return license.includes("publicdomain") ||
    /creativecommons\.org\/licenses\/by(?:-sa)?\//.test(license);
}

function archiveSearchQuery(term, tagId) {
  const rights = '(licenseurl:http*publicdomain* OR licenseurl:http*by/1.0* OR licenseurl:http*by/2.0* OR licenseurl:http*by/3.0* OR licenseurl:http*by/4.0* OR licenseurl:http*by-sa*)';
  const topic = tagId ? 'subject:"' + tagId.replace(/"/g, "") + '"' :
    '(subject:"comic books" OR subject:comics OR subject:"graphic novels")';
  const words = String(term || "").trim();
  const text = words ? '(title:"' + words.replace(/"/g, "") + '" OR creator:"' + words.replace(/"/g, "") + '")' : topic;
  return "mediatype:texts AND " + text + " AND " + rights;
}

async function getJson(url) {
  const response = await harbor.http(url, { responseType: "text" });
  if (!response || !response.ok) throw new Error("Internet Archive HTTP " + (response && response.status));
  try { return JSON.parse(response.body); }
  catch (_) { throw new Error("Internet Archive returned invalid JSON."); }
}

async function searchItems(query, offset) {
  const url = IA + "/advancedsearch.php?q=" + encodeURIComponent(query) +
    "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=licenseurl&fl%5B%5D=year" +
    "&sort%5B%5D=downloads+desc&rows=" + SEARCH_SIZE +
    "&page=" + (Math.floor((Number(offset) || 0) / SEARCH_SIZE) + 1) + "&output=json";
  const data = await getJson(url);
  const docs = data.response && data.response.docs || [];
  return docs.filter((item) => item.identifier && licenseAllowed(item.licenseurl)).map((item) => ({
    id: item.identifier,
    title: safeText(item.title) || item.identifier,
    cover: IA + "/services/img/" + encodeURIComponent(item.identifier),
    author: safeText(item.creator),
  }));
}

async function loadManifest(id) {
  if (manifestCache[id]) return manifestCache[id];
  const meta = await getJson(IA + "/metadata/" + encodeURIComponent(id));
  const record = meta.metadata || {};
  if (!licenseAllowed(record.licenseurl)) {
    throw new Error("This archive item has no verified public-domain or CC BY/CC BY-SA license.");
  }
  const server = meta.server;
  const itemPath = meta.dir;
  if (!server || !itemPath) throw new Error("Internet Archive did not provide BookReader location data.");
  const manifestUrl = "https://" + server + "/BookReader/BookReaderJSON.php?server=" +
    encodeURIComponent(server) + "&itemPath=" + encodeURIComponent(itemPath) +
    "&itemId=" + encodeURIComponent(id);
  const reader = await getJson(manifestUrl);
  const total = Number(reader.numLeafs || reader.numPages || record.imagecount || 0);
  if (!Number.isFinite(total) || total < 1) {
    throw new Error("This comic does not expose a readable BookReader page manifest.");
  }
  const result = {
    metadata: record,
    total: Math.min(Math.floor(total), 1500),
    pageNums: Array.isArray(reader.pageNums) ? reader.pageNums : [],
  };
  manifestCache[id] = result;
  return result;
}

const GENRES = ["Adventure", "Crime", "Detective", "Fantasy", "Horror", "Humor", "Romance", "Science Fiction", "Superhero", "Western"];

const plugin = {
  id: "archive-open-comics",
  name: "Internet Archive — Open Comics",
  version: "1.0.0",

  async popular(offset, tagId) {
    return searchItems(archiveSearchQuery("", tagId), offset);
  },

  async search(query, offset, tagId) {
    const combined = tagId ? (String(query || "").trim() + " " + tagId) : query;
    return searchItems(archiveSearchQuery(combined, tagId), offset);
  },

  async detail(id) {
    const book = await loadManifest(id);
    const meta = book.metadata;
    return {
      id: id,
      title: safeText(meta.title) || id,
      cover: IA + "/services/img/" + encodeURIComponent(id),
      description: safeText(meta.description) + "\n\nLicense: " + safeText(meta.licenseurl),
      author: safeText(meta.creator),
      status: safeText(meta.year),
      siteUrl: IA + "/details/" + encodeURIComponent(id),
    };
  },

  async chapters(id) {
    const book = await loadManifest(id);
    return [{
      id: id,
      title: "Complete comic",
      chapter: "Full issue",
      pages: book.total,
      language: "mul",
    }];
  },

  async pageUrls(chapterId) {
    const book = await loadManifest(chapterId);
    return Array.from({ length: book.total }, (_, index) =>
      IA + "/download/" + encodeURIComponent(chapterId) + "/page/n" + index + "_w1000.jpg"
    );
  },

  async tags() {
    return GENRES.map((name) => ({ id: name.toLowerCase(), name: name, group: "Genre" }));
  },
};

return plugin;
