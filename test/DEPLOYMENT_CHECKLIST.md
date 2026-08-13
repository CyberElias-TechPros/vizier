# Deployment Prerequisites

## Before Publishing

1. **Create a Publisher Account:**
   - Go to https://marketplace.visualstudio.com/manage
   - Sign in with a Microsoft account
   - Click "Create Publisher"
   - Choose a publisher ID (e.g., "vizier" or your-name)
   - Note your publisher ID

2. **Update package.json:**
   - Replace the placeholder `publisher` value (`"vizier"`) with your real Publisher ID
   - Keep `license: "MIT"`, `icon: "icon.png"`, `repository`, `bugs`, `homepage` as-is (or point to your repo)

3. **Get an Azure DevOps Access Token:**
   - Go to https://dev.azure.com/
   - Create a Personal Access Token with "Marketplace (Publish)" scope
   - Save the token

## Packaging

```bash
# After updating publisher ID:
npm run package
# This creates vizier-0.1.0.vsix
```

## Publishing

### Option A: VS Code Marketplace (Recommended)
```bash
vsce publish
# Or manually upload the .vsix at https://marketplace.visualstudio.com/manage
```

### Option B: Open VSX Registry (for Cursor/Windsurf)
```bash
npx ovsx publish -p YOUR_OVSX_TOKEN
```

## Icon Requirements

- Create a 128x128 PNG icon
- Save as "icon.png" in the project root
- Update package.json "icon" field

## Post-Publishing

- Monitor install counts and user feedback
- Respond to reviews
- Plan V1.5 update (full repo scanner)
