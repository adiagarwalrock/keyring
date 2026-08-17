# Key Ring

Key Ring is a static, browser-only inspector for AI API keys. It sends a submitted key directly to only the provider domains the user confirms, using a read-only verification request.

## Privacy model

- No API routes, server actions, database, cookies, analytics, or client storage.
- The raw key exists only in React memory until the page is refreshed or the user chooses **Clear**.
- A browser-side CORS failure is reported as inconclusive. Key Ring deliberately has no proxy fallback.
- It never calls account/key-management inventory endpoints. OpenAI admin keys are detected and OpenRouter keys receive a management-key warning.
- Cohere and xAI/Grok use the same direct model-list check. Bedrock, Vertex AI, Azure AI Foundry, and Adobe Firefly appear as configuration-required providers because a single key cannot safely identify their cloud region, resource endpoint, OAuth context, or paired credential.

## Development

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

Deploy the repository as a new Vercel project. `next.config.ts` exports a static site and `vercel.json` supplies the security headers.
