# Publishing Vizier to the VS Code Marketplace

Everything you need to know before publishing **Vizier** to the Visual Studio Code Marketplace (and optionally Open VSX).

## 1. What the marketplace page shows, and which files back it

The Marketplace has **four tabs** on an extension's page. Three are read from files in the packaged `.vsix`; the fourth (Overview) is the README.

| Marketplace tab | Backing file | Purpose |
|-----------------|--------------|---------|
| **Overview** | `README.md` | The main landing page. The Marketplace renders this with GitHub-flavored Markdown (no images hosted relative to the repo). |
| **Changelog** | `CHANGELOG.md` | Release notes per version. Only the changelog of the installed/published version range is shown. |
| **License** | `LICENSE.md` | Shown as a tab and used by the marketplace's license filter. Must match the `license` field in `package.json`. |
| **Version History** | `package.json` `version` | Auto-generated from published versions. |

Supporting files shipped with the extension (also linked from the README):

- `DISCLAIMERS.md` — full AI/disclaimer/privacy disclosure. **Already shipped.**
- `icon.png` — 128×128 marketplace icon (referenced by `package.json` → `icon`). **Already present.**

> Important: relative links in the README only resolve if the target file is **included in the `.vsix`**. `README.md`, `LICENSE.md`, `CHANGELOG.md`, `DISCLAIMERS.md`, and `icon.png` are all included. Do not link to `src/`, `test/`, or `GAP_ANALYSIS.md` — those are excluded from the package.

## 2. Marketplace metadata in `package.json`

These fields control how the extension appears in search and on the page:

| Field | Current value | Notes |
|-------|---------------|-------|
| `displayName` | `Vizier` | Shown as the extension title. |
| `description` | `Turn app ideas into structured, agent-ready build plans` | Shows in search results. Keep under ~250 characters. |
| `publisher` | `cyberelias` | **Must match the publisher ID on the Marketplace.** |
| `version` | `0.1.0` | Bump for each release. Marketplace only accepts versions greater than the previous. |
| `engines.vscode` | `^1.85.0` | Minimum VS Code version required. |
| `categories` | `Programming Languages`, `Snippets` | Category list from the Marketplace's fixed set. Consider `Other` or more fitting categories. |
| `keywords` | `ai planning`, `planning`, `AI`, `specification`, `cursor`, `claude` | Used for search. Add e.g. `prd`, `blueprint`, `agent`, `documentation`. |
| `icon` | `icon.png` | Must be a PNG in the package. |
| `galleryBanner` | `#1f2a44`, dark theme | Banner color on the marketplace page. |
| `badges` | (none yet) | Optional badges (e.g. license) rendered on the page. |

Marketplace tips:

- **Screenshots:** the Marketplace does not support screenshots as separate fields for VS Code extensions — the recommended approach is to add a **Screenshots section in the README** using external image URLs (e.g. an image hosting service or the repo's GitHub pages). Relative or local images do not render on the Marketplace.
- **Marketplace-quality badges:** only use badges that resolve **after** the extension is live (e.g. a `https://img.shields.io/badge/...` static badge is safe; a Marketplace version badge breaks until the first publish).

## 3. Privacy, telemetry, and marketplace requirements

- **Telemetry / data collection:** Vizier does **not** send any telemetry or analytics. It only talks to the LLM provider you explicitly select, and only with the data disclosed in `DISCLAIMERS.md` (idea + workspace summary; plan metadata for monitoring). State this clearly in the README — it's a strong trust signal and avoids surprise when reviewers audit.
- **Runtime secrets:** all API keys are stored via VS Code Secret Storage (`ExtensionContext.secrets`), never plaintext settings. Documented in README + DISCLAIMERS.
- **Marketplace moderation:** the Marketplace scans packages for secrets, broken links, and build issues. Review `DISCLAIMERS.md` language before submitting; it is intentionally explicit about AI limitations.

## 4. Pre-publish checklist (verified in the repo)

- [x] `npm run typecheck` passes (extension + webview)
- [x] `npm run build:all` produces `dist/extension.js` and `dist/webview.js`
- [x] `npm test` passes (65+ unit/integration/smoke tests)
- [x] `vsce package` produces a valid `.vsix` (verified: 14 files, ~436 KB)
- [x] Packaged bundle loads and `activate()` runs with a VS Code mock
- [x] `icon.png` exists (128×128) and is referenced in `package.json`
- [x] `README.md`, `CHANGELOG.md`, `LICENSE.md`, `DISCLAIMERS.md` all present and included in the `.vsix`
- [x] `publisher` in `package.json` matches the Marketplace publisher ID
- [x] No internal files leak into the package (`.vscodeignore` covers `src/`, `webview/`, `node_modules/`, tests, docs, scripts)

## 5. One-time setup

1. **Create a publisher** at <https://marketplace.visualstudio.com/manage> (sign in with a Microsoft account).
2. Copy your **publisher ID** into `package.json` → `publisher` (currently `cyberelias`).
3. Create a **Personal Access Token**:
   - Go to <https://dev.azure.com>, sign in with the same Microsoft account.
   - *User settings → Personal Access Tokens → New Token.*
   - Organization: **All accessible organizations**. Scope: **Marketplace → Manage**.
4. Log in once:
   ```bash
   npx vsce login cyberelias
   ```

## 6. Packaging and publishing

```bash
# Build first
npm run build:all

# Create the VSIX (no publish, verify contents with `npx vsce ls`)
npx vsce package

# Publish to the VS Code Marketplace
npx vsce publish

# Or upload the generated .vsix manually at https://marketplace.visualstudio.com/manage
```

Optional — **Open VSX** (for Cursor, Windsurf, VSCodium):

```bash
npx ovsx publish -p YOUR_OVSX_TOKEN
```

Notes:

- `vsce publish` runs a build + validation automatically; it will fail on missing icon, invalid `engines`, or secret-looking strings in the package.
- Always run `npx vsce ls` before publishing to confirm the package list contains exactly what you expect.
- The `repository`, `bugs`, and `homepage` fields point at `https://github.com/CyberElias-TechPros/vizier` — make sure that matches the repository you want public before publishing, or the Marketplace "Report an issue" / repository links will 404.

## 7. After publishing

1. Open the Marketplace page and check the **Overview**, **Changelog**, and **License** tabs render correctly.
2. Click every link in the README (especially `DISCLAIMERS.md` and `LICENSE.md`).
3. Install the extension from the Marketplace into a **clean** VS Code instance and run the full flow once (Plan New App → questionnaire → blueprint → export → Check Plan Progress).
4. Verify the version shows in **Version History**.
5. Add README screenshots (external image URLs) for a more polished page.
