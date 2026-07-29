# Publishing

Maintainer-only notes - not included in the published npm package (not
listed in `package.json`'s `files`, so `npm pack`/`npm publish` never ships
this file, and it won't appear on the npm registry page).

1. Bump `version` in `package.json` and add a matching entry to
   `CHANGELOG.md`.
2. Publish from the repo root:

```bash
npm login
npm publish
```
