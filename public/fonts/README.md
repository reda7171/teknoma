# Cairo webfont assets

These are the same variable WOFF2 Arabic, Latin and extended Latin subsets previously self-hosted by `next/font/google` for Cairo (weights 200–1000).

The stable, content-derived filenames allow `src/app/[locale]/layout.tsx` to preload only the Arabic page's two initial subsets. `src/app/cairo-font.css` uses those exact URLs and retains the original Unicode ranges and optional font display. Extended Latin remains available on demand.

Source: https://github.com/google/fonts/tree/main/ofl/cairo
License: SIL Open Font License 1.1; see `Cairo-OFL.txt`.
