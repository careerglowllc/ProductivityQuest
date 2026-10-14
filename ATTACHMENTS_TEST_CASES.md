# Quest Attachments: Test Cases

How it works: [ATTACHMENTS.md](ATTACHMENTS.md). Run `npm run test:unit` for the automated cases. The manual cases need a browser; use a quest and a couple of small test files (a PDF of 2 or more pages, a PNG, a short video).

## Automated

| Area | File | What it proves |
| --- | --- | --- |
| Types and limits | `client/src/lib/attachments.test.ts` | images, videos and PDFs recognised (including a PDF with no type or a generic one); other documents refused; per-kind size limits and messages; the file picker accepts PDFs |
| Reading files | `client/src/lib/attachments.test.ts` | a PDF keeps its name and size and gets a `application/pdf` data URL; a mixed drop adds the good files and reports the rest; stored files turn back into the exact bytes |
| Downloading | `client/src/lib/attachments.test.ts` | for a PDF, an image and a video: saved under its own name, through a temporary blob link that is removed from the page and released later, not before the browser starts saving |
| File names | `client/src/lib/attachments.test.ts` | extension added when missing (`scan` to `scan.pdf`, `IMG_1` to `IMG_1.jpg`), characters a file name cannot hold replaced, empty name handled |
| PDF drawing | `client/src/lib/pdf-render.test.ts` | page scaling to the shown width (never over 3 times), bad widths safe, PDF.js loaded only on demand from the compatible build, previews on white and remembered, the 50-page viewer cap |
| Screen wiring | `client/src/lib/attachments.test.ts` | PDF tile uses the preview, the viewer uses PDF.js and not the browser's own viewer, every tile has Download (also when read-only), the viewer has a labelled Download, the long-PDF notice and unreadable-PDF message exist |

The PDF drawing itself was also checked in a real browser: a 2-page PDF produced a first-page preview (on white, with its page count) and a 2-page viewer render.

## Manual

### AT-1: Attach a PDF with the paperclip
Open a quest, press the paperclip, choose a multi-page PDF. **Expect:** a tile with a picture of the first page, "PDF · N pages" in the corner, and the file name and size underneath. The quest saves it (reload and it is still there).

### AT-2: Attach by dragging
Drag a PDF, then a PNG, onto the description field. **Expect:** a drop overlay while dragging, then a tile for each.

### AT-3: Files that are not allowed
Drop a `.docx`, then a PDF over 10 MB, then a good PDF together with a `.txt`. **Expect:** a message for each refused file ("isn't a supported image, video or PDF" / "PDFs must be under 10 MB"), and the good PDF is still added.

### AT-4: View a PDF
Click the PDF tile. **Expect:** "Loading PDF…" briefly, then every page stacked and scrollable, with the file name and a Download button at the top. Scroll through all pages. Click on a page: it stays open. Press Esc, or click outside the pages: it closes, and so does nothing else (the quest dialog stays open).

### AT-5: Long PDF
Open a PDF of more than 50 pages. **Expect:** the first 50 pages and the note "Showing the first 50 of N pages. Download the file to read the rest."

### AT-6: Download from the tile
On a computer, hover over a tile: a download icon appears top-left. Click it for a PDF. **Expect:** the file is saved with its original name and opens with the same content. Repeat for a PNG and a video.

### AT-7: Download from the viewer
Open a PDF, an image and a video in turn and press Download in the top bar. **Expect:** each saves under its own name.

### AT-8: A name with no extension
Attach a PDF whose name has no `.pdf` (rename one to `scan`). **Expect:** it downloads as `scan.pdf`.

### AT-9: Read-only views
Open an item that shows attachments without editing (Weekly Planning or Beliefs entry with files). **Expect:** the download icon is there and the remove button is not.

### AT-10: Phone
On a phone or a narrow window, **expect** the download and remove icons are always visible and easy to tap, and the viewer scrolls with a finger.

### AT-11: Browser set to download PDFs
In Chrome, open Settings, Privacy and security, Site settings, PDF documents, and choose "Download PDFs". Open an attached PDF. **Expect:** the preview and viewer still work (they do not rely on the browser's viewer).

### AT-12: A file that is not really a PDF
Rename a text file to `notes.pdf` and attach it. **Expect:** the tile shows a plain PDF icon with no page count, the viewer says "This PDF can't be previewed. Use Download to open it.", and Download still saves the file.

### AT-13: Several PDFs and the page's speed
Attach three PDFs to one quest. **Expect:** all three previews appear without freezing the page. In the Network tab, PDF.js (`pdf-…js` and the `pdf.worker…` file) loads only after the first PDF is shown, not on page load.

### AT-14: Remove
Press the X on a PDF tile. **Expect:** it is removed and saved; the other tiles and their downloads are unaffected.

### AT-15: Other places
Attach a PDF in a journal entry and in a belief. **Expect:** the same preview, viewer and download.
