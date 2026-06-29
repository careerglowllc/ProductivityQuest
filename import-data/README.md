# 📥 Contact Import Drop Folder

Drop your exported iPhone contacts here and they'll be imported into the **NPCs**
rolodex for **alexbaer321@gmail.com**, each tagged `phone`. Later you can export
LinkedIn contacts and they'll get a separate `linkedin` tag.

## How to drop your contacts

1. **Export from iPhone / Mac Contacts:**
   - On Mac: open **Contacts** → select all (`⌘A`) → **File → Export → Export vCard…** → save as `contacts.vcf`
   - Or any spreadsheet export → save as `contacts.csv`
2. **Drop the file into this folder** (`import-data/`). Name it `contacts.vcf` or `contacts.csv`.
3. Tell me it's here. I'll run the import and tie everyone to your account with the `phone` tag.
4. After import + verification, **you can delete this whole `import-data/` folder.**

## Supported formats

| Format | Notes |
| ------ | ----- |
| `.vcf` (vCard) | What Apple Contacts exports. Best — keeps names, phones, orgs. |
| `.csv` | Header row + columns. Recognized headers (case-insensitive): `name`/`first name`+`last name`, `phone`/`mobile`, `email`, `company`/`organization`/`occupation`, `location`/`city`, `notes`. |

The file stays local — it is **gitignored** and never committed.
