# Quest Attachments

Attach images, videos and PDFs to a quest, then preview them, open them full screen, and download them. The same attachment area is used for quest details, journal entries, weekly planning and beliefs, so it works the same way everywhere.

## Adding files

- Click the paperclip in the description field, pick files, or drag and drop them onto the field.
- Allowed: images up to 8 MB, videos up to 25 MB, PDFs up to 10 MB. A PDF is recognised by its type or by a `.pdf` ending, so a PDF a browser reports as "unknown" still works.
- Anything else, or a file over its limit, is skipped with a message such as `"notes.docx" isn't a supported image, video or PDF.` or `"x.pdf" is 12 MB — PDFs must be under 10 MB.` Other files in the same drop are still added.

## Previewing

Each attachment is a tile under the description with its name and size.

| Kind | Tile | Opening it (click) |
| --- | --- | --- |
| Image | The picture | Full-screen image |
| Video | A video player with controls | Plays in the tile |
| PDF | A picture of the first page, with "PDF · 3 pages" | Full-screen viewer showing every page, scrollable |

The PDF viewer shows at most the first 50 pages and says so for longer files; download the file to read the rest. Press Esc or click outside the pages to close. If a PDF cannot be read (for example a text file renamed to `.pdf`), its tile shows a plain PDF icon and the viewer says "This PDF can't be previewed. Use Download to open it."

## Downloading

- Every tile has a download button in its top-left corner, for images, videos and PDFs alike. On a computer it appears when you hover over the tile; on a phone it is always visible. It is also there in read-only views, where the remove button is not.
- The full-screen viewer has a labelled **Download** button.
- The file is saved under its own name. If the name had no extension, one is added from the file type (`scan` becomes `scan.pdf`).

## How it works

- Files are stored as base64 text inside the quest's `attachments` column (JSONB), so they sync everywhere with the quest and survive redeploys. There is no separate file storage.
- Because of that, base64 adds about a third to the size, each change re-sends the quest's whole attachment list, and the quest list loads every attachment. Keep files modest. The server accepts requests up to 40 MB in total.
- PDFs are drawn by [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`, the broadest-compatibility build) instead of the browser's built-in PDF viewer. That is deliberate: a browser set to "download PDFs" (a Chrome setting) shows an Open button instead of a preview, and the iOS app has no reliable built-in viewer. PDF.js is loaded only the first time a PDF is shown, as its own chunk plus a worker file of about 1.3 MB, so it does not slow the rest of the app.
- Previews are drawn on the device from the stored file and remembered while the page is open; nothing extra is stored.
- Downloads go through a temporary blob link, because browsers refuse or cut off downloads from very long `data:` links.
- `pdfjs-dist` needs Node 22.13 or newer to install. Render runs Node 22.16, so this is fine there.

## Known limits

- In the iOS app, saving a downloaded file may not work from inside the app; open the site in Safari for that.
- Very large or image-heavy PDFs take a moment to preview.
- Higher size limits would slow every quest-list load and risk the server's memory; the fix for that is storing files outside the database, which is not done yet.

## Code

| File | Role |
| --- | --- |
| `client/src/lib/attachments.ts` | Types, limits, validation, reading a file, download and file-name helpers |
| `client/src/lib/pdf-render.ts` | Loads PDF.js on demand, draws pages, makes first-page previews |
| `client/src/components/attachment-area.tsx` | The tiles, the PDF preview tile, the viewer and the download buttons |
| `shared/schema.ts` | `tasks.attachments` shape (`image`, `video` or `pdf`) |

## Tests

`npm run test:unit` runs `client/src/lib/attachments.test.ts` and `client/src/lib/pdf-render.test.ts`. Manual steps: [ATTACHMENTS_TEST_CASES.md](ATTACHMENTS_TEST_CASES.md).
