# Harbor Gutenberg Reader

A Harbor-native manga-source extension that adapts Project Gutenberg public-domain plain-text ebooks into paginated SVG images for Harbor's existing page reader.

## Features
- Browse popular Project Gutenberg titles.
- Search by title or author.
- Filter by 13 topics/genres.
- View book descriptions, authors and covers.
- Read books as paginated pages inside Harbor.

## Install
1. Open Harbor.
2. Go to **Manga → Set up a source → Extensions**.
3. Paste this repository URL:

   \`https://raw.githubusercontent.com/azdyou/Harbor-Gutenberg-Reader/main/repo.json\`

4. Click **Add Repository**.
5. Install **Project Gutenberg Books**.

## Limitations
- This is a Project Gutenberg catalogue reader, not a general-purpose EPUB/PDF reader.
- It does not open local files or Kavita/Calibre libraries.
- Harbor's current manga source interface uses page image URLs. This extension paginates text into SVG data images.
- Project Gutenberg's public-domain status is assessed under United States law. Copyright status may differ in your country.
- Some titles may not provide a plain-text download and will be unavailable.

## Sources
- Gutendex API: https://gutendex.com/
- Project Gutenberg: https://www.gutenberg.org/

## Testing
Run the included test with Node.js:

\`\`\`powershell
node .\tests\smoke.test.cjs
\`\`\`

The test uses a mocked Harbor HTTP bridge; it does not replace an in-app test.

## License
MIT. See [LICENSE](LICENSE).
