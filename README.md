# Harbor Everything Hub

A collection of independent Harbor-native source extensions. The same GitHub repository hosts two manifests because Harbor has separate manga and ebook extension managers.

## Install the manga and comics repository

In Harbor, open **Manga → Extensions → Add Repository** and paste:

\`https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/repo.json\`

Available entries:
- **MangaDex (English)** — MangaDex search, metadata, English chapter lists, and page reader.
- **Team-X (Arabic)** — Arabic manga source.
- **3asq (Arabic)** — Arabic manga source.
- **AzoraFly (Arabic)** — Arabic manga/manhwa source.
- **Internet Archive — Open Comics (Experimental)** — attempts to list items with public-domain or Creative Commons BY/BY-SA rights metadata. Archive page-image delivery varies by item and is not guaranteed.

## Install the ebook repository

Harbor has a separate ebook extension manager. In **eBooks → Sources/Extensions → Add Repository**, paste:

\`https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/ebook-repo.json\`

Available entries:
- **Project Gutenberg** — public-domain books with full text where a plain-text edition exists.
- **Wikisource** — public-domain/freely licensed texts with section/chapter navigation.
- **Google Books** — discovery, metadata, and Google-authorized previews only. It does not unlock copyrighted full books.

## Why searching for The Witcher showed no chapters

Project Gutenberg only carries books that are available in its catalogue, primarily older public-domain titles. It does not provide the modern copyrighted Witcher novels. Google Books can find Witcher editions and display whatever preview Google/publishers permit in Morocco, but it cannot provide full chapters when those are not authorized.

For a copyrighted book, a source can provide metadata, official previews, library/publisher links, or authorized open access. It cannot legitimately fetch the complete book just because the title appears in search results.

## Streaming and games

Harbor's regular **Stremio Addons** section uses the Stremio addon protocol, not the manga or ebook plugin API. Use Harbor's built-in addon catalogue or a Stremio addon manifest there. Those manifests cannot be mixed into the manga/ebook source manifests.

Game information is a different category again: Harbor does not currently expose a native game-library or game-streaming extension interface matching these reader plugins. Game catalogs can be offered as web links or metadata integrations, not installed as a manga/ebook reader.

## Important notes

- These extensions are independent community code; websites can change and sources may temporarily fail.
- This repository does not host copyrighted books, manga, comics, or video.
- No extension bypasses a login, DRM, paid chapter, library loan, or other access restriction.
- Internet Archive comic integration is experimental and should be treated as such until tested in Harbor with multiple archive items.
- Project Gutenberg public-domain status is assessed under US law; rights can differ by country.
- To update an installed plugin, Harbor may cache the source version. If a new version does not appear, remove the old extension/repository entry and add it again.

## Source repositories
- [Harbor](https://github.com/Harborofficial/Harbor)
- [Arabic Harbor manga sources](https://github.com/ITzAkai/Manga-for-harbor)
- [MangaDex API](https://api.mangadex.org/)
- [Project Gutenberg](https://www.gutenberg.org/)
- [Wikisource API](https://en.wikisource.org/w/api.php)
- [Google Books API](https://developers.google.com/books)
- [Internet Archive](https://archive.org/)

