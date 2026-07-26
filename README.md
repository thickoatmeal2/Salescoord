[README.md](https://github.com/user-attachments/files/30392557/README.md)
# SalesCoord Terminal

A lightweight sales data correlation explorer. Upload a spreadsheet (or generate sample data) to view metrics, correlations, and analyst notes.

## Project structure

```
salescoord-terminal/
├── index.html      # Main HTML entry point
├── styles.css      # All styles (night / day themes)
├── app.js          # Application logic
└── README.md
```

## Deploy on GitHub Pages

1. Create a new GitHub repository (public).
2. Upload the contents of this folder (or push via git).
3. In the repo: **Settings → Pages**.
4. Under **Source**, choose:
   - **Deploy from a branch**
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
5. Save. After a minute or two your site will be live at:
   `https://<your-username>.github.io/<repo-name>/`

### Optional: use a `docs` folder

If you prefer to keep the repo root clean, put these files inside a `docs/` folder and select **Folder: /docs** in the Pages settings.

## Local preview

Just open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Notes

- Relies on the SheetJS (xlsx) library loaded from CDN.
- Works fully client-side; no backend required.
- Sample data generator and file upload both supported.
