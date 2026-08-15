# Stitch Witch

Stitch Witch is a free, open-source color-chart designer for knitting, crochet, and cross stitch. It runs entirely in the browser without accounts, analytics, a backend, or a database.

## Features

- Draw, fill, select, move, mirror, and repeat pattern sections
- Preview knit, cross-stitch, and single-crochet stitches
- Track row and stitch progress with auto-scroll, fullscreen, and wake lock
- Save editable pattern and Tracker files with automatic local backups
- Export numbered PNG charts and color or symbol PDFs
- Responsive English and Estonian interface

## Development

Requires Node.js 22.13+ and pnpm 11.17+.

```sh
pnpm install
pnpm dev
```

Use `pnpm typecheck` for static checks, `pnpm build` to create `dist/`, and `pnpm preview` to preview the production build.

## Project Files

Work is backed up in browser storage. **Save** also downloads a `.stitch-pattern` file, while Tracker progress can be downloaded as `.stitch-tracker`. Download files regularly because clearing site data removes local backups.

## Deployment

The app is fully static and uses hash routing with a relative base path. Build with `pnpm build`, then publish `dist/` to GitHub Pages or another static host.

## License

Licensed under the [MIT License](LICENSE).
