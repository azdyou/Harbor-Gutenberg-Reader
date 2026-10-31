// Project Gutenberg Books — native Harbor manga-reader source.
//
// Harbor's source reader currently consumes page image URLs rather than EPUB/PDF
// documents. This source adapts public-domain Project Gutenberg plain-text books
// into self-contained SVG page images, so they can be read in Harbor's existing
// page reader without a separate server.
//
// Catalog API: https://gutendex.com/ (metadata only)
// Book text: fetched directly from Project Gutenberg at read time.
//
// IMPORTANT: Project Gutenberg's public-domain status is based on US law. Copyright
// status may differ in the reader's country. The plugin does not bypass DRM, logins,
// loans, or access controls.

const API = "https://gutendex.com";
const PAGE_LINES = 32;
const LINE_WIDTH = 68;
const MAX_PAGES = 1400;

const TOPICS = [
  { id: "adventure", name: "Adventure" },
  { id: "fantasy", name: "Fantasy" },
  { id: "science fiction", name: "Science Fiction" },
  { id: "mystery", name: "Mystery & Detective" },
  { id: "horror", name: "Horror" },
  { id: "romance", name: "Romance" },
  { id: "history", name: "History" },
  { id: "philosophy", name: "Philosophy" },
  { id: "poetry", name: "Poetry" },
  { id: "drama", name: "Drama" },
  { id: "travel", name: "Travel" },
  { id: "science", name: "Science" },
  { id: "biography", name: "Biography" },
];

const textCache = Object.create(null);
const pageCache = Object.create(null);
const detailCache = Object.create(null);

function asString(value) {
  return value == null ? "" : String(value);
}

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

async function getText(url) {
  const response = await harbor.http(url, { responseType: "text", timeoutMs: 20000 });
  if (!response || !response.ok) {
    throw new Error("Request failed (HTTP " + (response && response.status) + ")");
  }
  return asString(response.body);
}

async function getJson(url) {
  const body = await getText(url);
  try {
    return JSON.parse(body);
  } catch (_) {
    throw new Error("The book catalogue returned invalid JSON.");
  }
}

function authorNames(book) {
  const authors = Array.isArray(book && book.authors) ? book.authors : [];
  return authors.map((person) => person && person.name).filter(Boolean).join(", ") || "Unknown author";
}

function coverUrl(book) {
  const formats = (book && book.formats) || {};
  return formats["image/jpeg"] || formats["image/png"] || undefined;
}

function toSummary(book) {
  return {
    id: String(book.id),
    title: asString(book.title) || "Untitled book",
    cover: coverUrl(book),
    author: authorNames(book),
  };
}

function buildQuery(page, search, topic) {
  const params = ["page=" + encodeURIComponent(String(page)), "mime_type=" + encodeURIComponent("text/plain")];
  if (search) params.push("search=" + encodeURIComponent(search));
  if (topic) params.push("topic=" + encodeURIComponent(topic));
  return API + "/books/?" + params.join("&");
}

async function getBook(id) {
  const key = String(id);
  if (detailCache[key]) return detailCache[key];
  const book = await getJson(API + "/books/" + encodeURIComponent(key));
  if (!book || book.detail || !book.id) throw new Error("Book not found in Project Gutenberg.");
  detailCache[key] = book;
  return book;
}

function choosePlainTextUrl(book) {
  const formats = (book && book.formats) || {};
  const keys = Object.keys(formats);
  let key = keys.find((candidate) => /^text\/plain/i.test(candidate) && /utf-?8/i.test(candidate));
  if (!key) key = keys.find((candidate) => /^text\/plain/i.test(candidate));
  const url = key ? formats[key] : "";
  if (!/^https:\/\/(?:[a-z0-9-]+\.)*gutenberg\.org\//i.test(url)) {
    throw new Error("This book does not have a direct Project Gutenberg plain-text download.");
  }
  return url;
}

function cleanGutenbergText(text) {
  let output = asString(text).replace(/^\uFEFF/, "").replace(/\r/g, "");
  const start = output.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  if (start && typeof start.index === "number") output = output.slice(start.index + start[0].length);
  const end = output.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
  if (end && typeof end.index === "number") output = output.slice(0, end.index);
  output = output.replace(/\f/g, "\n\n").replace(/[\t ]+$/gm, "");
  return output.trim();
}

function xmlEscape(value) {
  return asString(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function isHeading(paragraph) {
  const value = paragraph.trim();
  if (!value || value.length > 86) return false;
  if (/^(chapter|book|part|section|act|scene|preface|prologue|epilogue|contents)\b/i.test(value)) return true;
  if (/^(chapter\s+)?[0-9ivxlcdm]+\.?$/i.test(value)) return true;
  return value === value.toUpperCase() && /[A-Z]/.test(value) && value.length < 70;
}

function wrapParagraph(paragraph) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= LINE_WIDTH) line += " " + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function paginate(text) {
  const paragraphs = text.split(/\n\s*\n+/)
    .map((part) => part.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const lines = [];
  for (const paragraph of paragraphs) {
    const wrapped = wrapParagraph(paragraph);
    if (!wrapped.length) continue;
    for (const line of wrapped) lines.push({ text: line, heading: isHeading(paragraph) });
    lines.push({ text: "", heading: false });
  }
  while (lines.length && !lines[lines.length - 1].text) lines.pop();
  const pages = [];
  for (let index = 0; index < lines.length; index += PAGE_LINES) {
    pages.push(lines.slice(index, index + PAGE_LINES));
    if (pages.length >= MAX_PAGES) break;
  }
  return pages;
}

function renderSvgPage(lines, title, author, pageNumber, totalPages) {
  const visibleLines = lines.map((line, index) => {
    if (!line.text) return "";
    const y = 142 + index * 24;
    const weight = line.heading ? "700" : "400";
    const size = line.heading ? "18" : "16";
    const color = line.heading ? "#26364a" : "#252525";
    return '<text x="78" y="' + y + '" font-family="Georgia, Times New Roman, serif" font-size="' + size + '" font-weight="' + weight + '" fill="' + color + '">' + xmlEscape(line.text) + "</text>";
  }).filter(Boolean).join("");
  const safeTitle = xmlEscape(title).slice(0, 140);
  const safeAuthor = xmlEscape(author).slice(0, 100);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1080" viewBox="0 0 760 1080">' +
    '<rect width="760" height="1080" fill="#fbf8f1"/>' +
    '<rect x="28" y="28" width="704" height="1024" rx="8" fill="none" stroke="#d9d0bf" stroke-width="1.5"/>' +
    '<text x="78" y="62" font-family="Arial, sans-serif" font-size="12" letter-spacing="2" fill="#817660">PROJECT GUTENBERG</text>' +
    '<text x="78" y="91" font-family="Georgia, Times New Roman, serif" font-size="17" font-weight="700" fill="#26364a">' + safeTitle + '</text>' +
    '<text x="78" y="115" font-family="Arial, sans-serif" font-size="12" fill="#817660">' + safeAuthor + '</text>' +
    '<line x1="78" y1="128" x2="682" y2="128" stroke="#d9d0bf" stroke-width="1"/>' +
    visibleLines +
    '<line x1="78" y1="1008" x2="682" y2="1008" stroke="#d9d0bf" stroke-width="1"/>' +
    '<text x="78" y="1032" font-family="Arial, sans-serif" font-size="11" fill="#817660">Public-domain text edition</text>' +
    '<text x="682" y="1032" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#817660">' + pageNumber + ' / ' + totalPages + '</text>' +
    '</svg>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

async function getBookText(id) {
  const key = String(id);
  if (textCache[key]) return textCache[key];
  const book = await getBook(key);
  const rawText = await getText(choosePlainTextUrl(book));
  if (rawText.length > 7 * 1024 * 1024) throw new Error("This book exceeds Harbor's 8 MB plugin response limit (over 7 MB of text).");
  const cleaned = cleanGutenbergText(rawText);
  if (!cleaned) throw new Error("The Project Gutenberg text file was empty.");
  textCache[key] = { text: cleaned, book };
  return textCache[key];
}

const plugin = {
  id: "gutenberg-books",
  name: "Project Gutenberg Books",
  version: "1.0.2",
  async popular(offset, tagId) {
    const page = Math.floor(safeNumber(offset, 0) / 32) + 1;
    const data = await getJson(buildQuery(page, "", tagId || ""));
    return (Array.isArray(data.results) ? data.results : []).map(toSummary);
  },
  async search(query, offset, tagId) {
    const page = Math.floor(safeNumber(offset, 0) / 32) + 1;
    const data = await getJson(buildQuery(page, asString(query).trim(), tagId || ""));
    return (Array.isArray(data.results) ? data.results : []).map(toSummary);
  },
  async detail(id) {
    const book = await getBook(id);
    const summary = Array.isArray(book.summaries) ? book.summaries.join("\n\n") : "";
    const subjects = Array.isArray(book.subjects) ? book.subjects.slice(0, 8).join(" · ") : "";
    const shelves = Array.isArray(book.bookshelves) ? book.bookshelves.slice(0, 5).join(" · ") : "";
    const metadata = [subjects, shelves].filter(Boolean).join("\n\n");
    return {
      id: String(book.id),
      title: asString(book.title) || "Untitled book",
      cover: coverUrl(book),
      description: summary || metadata || "Public-domain ebook from Project Gutenberg. The full text is available in the reader.",
      author: authorNames(book),
      status: book.copyright === false ? "Public domain in the United States" : "Project Gutenberg catalog",
    };
  },
  async chapters(id) {
    const book = await getBook(id);
    choosePlainTextUrl(book);
    return [{
      id: String(book.id),
      chapter: "Full text",
      title: "Read full book",
      volume: null,
      pages: 0,
      language: Array.isArray(book.languages) && book.languages.length ? book.languages[0] : "mul",
    }];
  },
  async content(chapterId) {
    const id=asString(chapterId).split(":")[0].trim();
    if(!/^\d+$/.test(id))throw new Error("Invalid Project Gutenberg book ID.");
    const loaded=await getBookText(id);
    return {text:loaded.text};
  },
  async pageUrls(chapterId) {
    const id = asString(chapterId).split(":")[0].trim();
    if (!/^\d+$/.test(id)) throw new Error("Invalid Project Gutenberg book ID.");
    if (pageCache[id]) return pageCache[id];
    const loaded = await getBookText(id);
    const pages = paginate(loaded.text);
    if (!pages.length) throw new Error("No readable pages were found in this book.");
    const title = asString(loaded.book.title) || "Untitled book";
    const author = authorNames(loaded.book);
    const urls = pages.map((lines, index) => renderSvgPage(lines, title, author, index + 1, pages.length));
    pageCache[id] = urls;
    return urls;
  },
  async tags() {
    return TOPICS.map((topic) => ({ id: topic.id, name: topic.name, group: "Genre" }));
  },
};

return plugin;
