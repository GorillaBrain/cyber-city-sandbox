# Deployment Guide — Cyber City Sandbox

**Cyber City Sandbox** is a static Single-Page Application (SPA) built with Vite and React, pre-configured for zero-configuration deployment on **Vercel** (Hobby plan).

- **Live Production URL:** [https://cyber-city-sandbox.vercel.app](https://cyber-city-sandbox.vercel.app)

## 1. Local Production Build & Preview

```bash
# Install dependencies
npm install

# Run unit & UI integration tests
npm test

# Build optimized production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

## 2. Vercel Configuration (`vercel.json`)

The repository includes `vercel.json` at the root to ensure direct route navigation resolves to `/index.html`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 3. Deploying via Vercel CLI

```bash
# Deploy and promote to production
vercel deploy --prod --yes
```

## 4. Post-Deployment Verification Checklist

1. Open the live Vercel `.vercel.app` production URL.
2. Confirm the 3D cyberpunk voxel city renders and camera orbit/zoom/pan controls work smoothly.
3. Click a building and verify the right-hand System Inspector displays its hosted logical systems.
4. Click **Inspect Asset** and confirm vulnerabilities (`SIM-VULN-*`) appear in the **Vulns** tab.
5. Deploy a defensive control (e.g., **Segmentation** or **Firewall**) and verify budget deduction and visual shield ring rendering.
6. Press **PLAY** or **STEP** and verify the SIEM Event Stream and Propagation Inspector update deterministically.
7. Reload the page and confirm `localStorage` restores the saved city state automatically.
