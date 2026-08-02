# Stitch Witch

Stitch Witch is a free, open-source crochet and knitting color-chart designer. It runs entirely in the browser with no account, backend, tracking, or database.

## Development

```sh
pnpm install
pnpm dev
```

Run `pnpm build` to create the static site in `dist/`. The Vite base path is relative, so the output can be deployed directly to GitHub Pages or Cloudflare Pages.

## Project Files

Use **Save** to download a `.stitch-pattern` JSON file and **Open** to continue editing it later. Theme and recent color preferences use browser local storage, which may be cleared by the browser.

## License

MIT
