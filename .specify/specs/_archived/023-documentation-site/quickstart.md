# Quickstart: Testing the Documentation Site

## Prerequisites

- A web browser (Chrome, Firefox, Safari, or Edge)
- Git access to the gofer repository

## Local Testing

Docsify can be previewed locally without any build step:

### Option 1: Python HTTP Server

```bash
cd docs/
python3 -m http.server 3000
```

Open http://localhost:3000 in your browser.

### Option 2: Docsify CLI (optional)

```bash
npm install -g docsify-cli
docsify serve docs/ --port 3000
```

Open http://localhost:3000 in your browser.

## Testing Checklist

### Landing Page

1. Open the root URL - hero section, feature highlights, and latest release card
   should render
2. Click "Get Started" - should navigate to quickstart documentation
3. Click "View All Releases" - should navigate to releases page

### Navigation

1. Sidebar should appear on all documentation pages
2. Top navigation bar should have: Home, Docs, Releases, GitHub
3. Current page should be highlighted in the sidebar

### Documentation Pages

1. Navigate to each page via sidebar - all should render correctly
2. Code blocks should have syntax highlighting
3. Links between pages should work

### Releases Page

1. Navigate to releases page - all releases should load from releases.json
2. Download buttons should link to correct VSIX files
3. Release notes should render correctly

### Search

1. Click the search box in the sidebar
2. Search for "pipeline" - should find pipeline overview
3. Search for "install" - should find quickstart

### Responsive Design

1. Resize browser to 375px width (iPhone) - content should reflow
2. Navigation should collapse to hamburger menu on mobile
3. All content should remain readable

### Auto-Updater Verification

1. Verify `releases.json` is accessible at `/releases.json`
2. Verify JSON is valid and contains `latest_version` field
3. Verify VSIX download URL in JSON returns HTTP 200

## Key Files

| File                         | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `docs/index.html`            | Docsify app shell and landing page |
| `docs/_sidebar.md`           | Navigation structure               |
| `docs/_navbar.md`            | Top navigation                     |
| `docs/README.md`             | Documentation home page            |
| `docs/quickstart.md`         | Getting started guide              |
| `docs/assets/css/custom.css` | Theme overrides                    |
| `docs/releases.html`         | Releases download page             |

## Common Issues

### Blank page

**Problem**: Page shows nothing or only the loading message **Solution**: Check
browser console for errors. Ensure Docsify CDN scripts are loading. Check
`.nojekyll` file exists.

### Sidebar not showing

**Problem**: Documentation renders but no sidebar **Solution**: Check that
`_sidebar.md` exists and `loadSidebar: true` is set in Docsify config.

### Releases not loading

**Problem**: Releases page shows "Loading..." indefinitely **Solution**: Check
browser console for CORS errors. When testing locally, ensure you're using an
HTTP server (not `file://` protocol).
