# Key Ring

A browser-only checker for AI API keys. Keys are sent directly to the provider you approve using a read-only verification request.

## Privacy

- No database, API routes, analytics, cookies, or local storage.
- Keys remain in browser memory and disappear on refresh or when cleared.
- CORS failures are reported as inconclusive; there is no proxy fallback.

## Local development

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Use the detected Next.js settings and deploy.

No environment variables are required. The app uses Next.js static export, and `vercel.json` applies security headers to the deployed site.
