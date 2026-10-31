// Google Books — book catalogue and publisher-authorized preview links.
// It never exposes content that Google Books does not make viewable for the user's region.

const API = "https://www.googleapis.com/books/v1/volumes";
const cache = Object.create(null);

async function getJson(url) {
  const response = await harbor.http(url, { responseType: "text" });
  if (!response || !response.ok) throw new Error("Google Books HTTP " + (response && response.status));
  try { return JSON.parse(response.body); }
  catch (_) { throw new Error("Google Books returned invalid JSON."); }
}

function viewStatus(volume) {
  const info = volume.accessInfo || {};
  const view = info.viewability || "UNKNOWN";
  if (view === "ALL_PAGES") return "Full view";
  if (view === "PARTIAL") return "Limited preview";
  if (view === "NO_PAGES") return "No preview pages";
  return "Availability unknown";
}

function summary(volume) {
  const info = volume.volumeInfo || {};
  const access = volume.accessInfo || {};
  return {
    id: volume.id,
    title: [info.title, info.subtitle].filter(Boolean).join(": ") || "Untitled book",
    authors: info.authors || [],
    cover: info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail),
    description: info.description || "",
    year: info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) || undefined : undefined,
    genres: info.categories || [],
    status: viewStatus(volume),
    siteUrl: access.webReaderLink || info.previewLink || info.infoLink || undefined,
  };
}

async function searchVolumes(query, offset) {
  const url = API + "?q=" + encodeURIComponent(query) +
    "&startIndex=" + Math.max(0, Number(offset) || 0) +
    "&maxResults=30&printType=books&country=MA";
  const data = await getJson(url);
  return (data.items || []).map(summary);
}

async function getVolume(id) {
  if (cache[id]) return cache[id];
  const volume = await getJson(API + "/" + encodeURIComponent(id) + "?country=MA");
  if (!volume || !volume.id) throw new Error("Google Books volume not found.");
  cache[id] = volume;
  return volume;
}

function accessMessage(volume) {
  const info = volume.volumeInfo || {};
  const access = volume.accessInfo || {};
  const status = viewStatus(volume);
  const lines = [
    "This source is a catalogue and preview finder, not a way to unlock a copyrighted book.",
    "Google Books access for Morocco: " + status + ".",
  ];
  if (access.webReaderLink) lines.push("Open the publisher-authorized reading preview: " + access.webReaderLink);
  else if (info.previewLink) lines.push("Open the Google Books preview: " + info.previewLink);
  else if (info.infoLink) lines.push("Book information: " + info.infoLink);
  if (access.viewability === "PARTIAL") {
    lines.push("Only the pages approved for public preview are available. The full text requires a legitimate purchase or library access.");
  } else if (access.viewability === "NO_PAGES") {
    lines.push("Google Books does not offer preview pages for this title. Use the listing to check legitimate purchase or library options.");
  } else if (access.viewability === "ALL_PAGES") {
    lines.push("Google Books reports that all pages are viewable in this region. Use its reader link above to read the available edition.");
  }
  if (volume.saleInfo && volume.saleInfo.buyLink) lines.push("Purchase option: " + volume.saleInfo.buyLink);
  return lines.join("\n\n");
}

const plugin = {
  id: "google-books-preview",
  name: "Google Books — Catalogue & External Previews",
  version: "1.0.1",

  async popular(offset) {
    return searchVolumes("subject:fiction", offset);
  },

  async search(query, offset) {
    return searchVolumes(String(query || "").trim(), offset);
  },

  async detail(id) {
    const volume = await getVolume(id);
    const item = summary(volume);
    return {
      id: item.id,
      title: item.title,
      authors: item.authors,
      cover: item.cover,
      description: item.description + "\n\n" + accessMessage(volume),
      year: item.year,
      genres: item.genres,
      status: item.status,
      siteUrl: item.siteUrl,
    };
  },

  // Catalogue and official preview link only; no readable chapter text.
  async chapters(id) { return []; },

  async content(chapterId) {
    return { text: accessMessage(await getVolume(chapterId)) };
  },
};

return plugin;
