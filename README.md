# Harbor Everything Hub

A collection of independent Harbor-compatible sources and category guides, inspired by the FMHY directory. The project keeps the native reader formats separate because Harbor uses different extension systems for manga and ebooks.

## Manga, manhwa, comics, and webcomics

In Harbor, open **Manga → Set up a source → Extensions → Add Repository** and paste:

\`https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/repo.json\`

Current sources:
- MangaDex (English)
- Team-X (Arabic)
- 3asq (Arabic)
- AzoraFly (Arabic)
- Internet Archive — Open Comics (experimental)
- xkcd — official creator-published webcomic archive

### Existing community Harbor manga projects

These projects already publish Harbor-compatible manifests. You can add them directly in Harbor rather than duplicating their code into this repository:
- [Kirilax/harbor-weebcentral](https://github.com/Kirilax/harbor-weebcentral) — WeebCentral, MangaDex Manhwa, MangaKatana and Atsu.
- [Amedo-0/harbor-manga-sources](https://github.com/Amedo-0/harbor-manga-sources) — English and Arabic sources including MangaPill, Manganato, Webtoons and others. Some sources are experimental or scrape third-party aggregators; check site terms and local law.
- [Dostovinchi/harbor-arabic-manga-sources](https://github.com/Dostovinchi/harbor-arabic-manga-sources) — Arabic sources including 3asq, MangaSwat, Dilar and Arabic MangaDex.

We do not copy third-party code into this repository unless its license permits redistribution and its behavior is suitable. Use the upstream repository's own manifest for sources not bundled here.

## FMHY source directory

A searchable directory extension covering **Movies, TV, Anime, Books, Comics, Music, Games, Software, and Game ROM references**. Each entry shows its source type, notes, FMHY section, and provider link. It is a directory only: it does not stream, scrape, or download media.

The plugin is included in the ebook extension repository below. In Harbor, open **eBooks → Sources/Extensions → Add Repository** and use:

`https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/ebook-repo.json`

If you already added this repository, refresh/update the repository to see **FMHY — Source Directory**.

## eBooks and web fiction

Harbor's ebook source manager uses a separate manifest. In **eBooks → Sources/Extensions → Add Repository**, paste:

\`https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/ebook-repo.json\`

Current sources:
- **Project Gutenberg** — public-domain books, full text where a plain-text edition exists.
- **Wikisource** — public-domain/freely licensed texts and section navigation.
- **Google Books** — catalogue and publisher-authorized previews only.
- **Royal Road** — creator-published web fiction and publicly readable chapters. Premium or locked content is not accessed.
- **Open Library** — book discovery, metadata, and official read/borrow links. Lending restrictions are respected.

### The Witcher example

Project Gutenberg does not carry modern copyrighted Witcher novels. Google Books and Open Library can locate editions and show official previews or library access information, but cannot provide full text unless the rights holder or library makes it available.

## Other FMHY categories: what Harbor can and cannot host

FMHY is a directory of many kinds of websites, not a single extension API. A website being listed there does not mean it can become a Harbor reader source.

| Category | Harbor integration |
|---|---|
| Manga / manhwa | Native Manga source plugins |
| Comics / webcomics | Native Manga source when chapter/page reader fits |
| eBooks / web novels | Native ebook source plugins |
| Movies / TV / anime | Stremio addons in Harbor's separate Stremio Addons section |
| Music / podcasts / audiobooks | No matching reader interface confirmed; can add official catalog or website links |
| Games | No native game-library source interface confirmed; can add game metadata/catalog integrations only if Harbor supports an appropriate view |
| Software / apps / tools | Not reader plugins; keep as curated official links, never repackaged installers |
| Cloud storage / file hosting | Not reader plugins; use supported external integrations rather than scraping file hosts |
| VPN / privacy / security | Not media sources; list official providers and documentation only |

### Streaming

Do not paste a manga or ebook repository URL into Harbor's Stremio addon manager. Stremio addons use a different manifest/protocol. Use the addon manager's own compatible addon manifests and respect each provider's licensing and access terms. This repository does not scrape or redistribute copyrighted video.

### Games

Harbor does not currently expose a native game-library plugin interface matching its reader source API. A future game discovery catalog could use public metadata services such as IGDB (requires a developer account) or RAWG (requires an API key), but that would be a separate integration and not a manga/ebook extension.

## Responsible source policy

- Prefer public-domain, Creative Commons, creator-published, publisher-authorized, or official APIs.
- Do not bypass DRM, paid chapters, account restrictions, library loans, paywalls, or anti-bot protections.
- A source may provide discovery and metadata without having rights to provide the complete work.
- Sites can change their APIs or HTML at any time. Experimental integrations may stop working.
- Project Gutenberg public-domain status is assessed under US law; rights may differ by country.
- xkcd's creator license is subject to the terms on [xkcd.com/license.html](https://xkcd.com/license.html).

## Source loading reliability and reader limitations

Harbor plugin workers have hard per-method deadlines: 20 seconds for popular/search/detail, 25 seconds for chapters, and 30 seconds for page URLs or eBook content. A timed-out method terminates its worker. Network responses are capped at 8 MB, and a plugin may have at most six in-flight requests.

This update bounds 3asq chapter discovery to one AJAX request plus one fallback; limits Team-X to five recent chapter pages fetched concurrently; removes AzoraFly's repeated retries and awaits its asynchronous HTML parser; returns Gutenberg text through the eBook content() method instead of unsupported data:image SVG URLs; requests Wikisource TOC data without downloading the full work during chapter discovery; and removes fake catalogue chapters from Google Books and Open Library.

Refresh the Manga and eBook repositories in Harbor to install the new plugin versions.

## Repository

[GitHub: azdyou/Harbor-Gutenberg-Reader](https://github.com/azdyou/Harbor-Gutenberg-Reader)

## Upstream documentation and APIs

- [Harbor](https://github.com/Harborofficial/Harbor)
- [FMHY](https://fmhy.net/)
- [Gutendex](https://gutendex.com/)
- [Project Gutenberg](https://www.gutenberg.org/)
- [Wikisource API](https://en.wikisource.org/w/api.php)
- [Google Books API](https://developers.google.com/books)
- [Open Library API](https://openlibrary.org/developers/api)
- [Royal Road](https://www.royalroad.com/)
- [xkcd JSON API](https://xkcd.com/info.0.json)
- [Internet Archive](https://archive.org/)
