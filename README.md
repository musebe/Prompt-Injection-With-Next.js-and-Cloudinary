# Agent Shield Lab

A working Next.js and Cloudinary demo for **protecting multimodal AI agents from image prompt injection**. It uploads untrusted images into authenticated Cloudinary storage, extracts visible text and embedded metadata, checks moderation, persists the decision as structured metadata, and releases a signed image URL only when every required gate passes.

The demo answers: **Can hidden instructions inside an image manipulate an AI agent?** Yes—a vision model can interpret image content as instructions. This pipeline reduces exposure; it does not claim to detect every steganographic, adversarial, or model-specific attack.

## Security flow

```text
Browser
  └─ POST image to the Next.js server
       └─ validate size, MIME declaration, and magic bytes
            └─ upload as Cloudinary type=authenticated
                 ├─ OCR visible text
                 ├─ inspect media metadata
                 ├─ request moderation
                 └─ score the policy
                      ├─ block/review → no agent URL
                      └─ allow → re-read Cloudinary metadata → signed URL
```

The Cloudinary asset is the source of truth. The agent endpoint re-reads the decision from Cloudinary instead of trusting browser state. Extracted OCR and metadata are treated as untrusted evidence and are never copied into the approved agent payload.

## Stack

- Next.js 16 and React 19, scaffolded with [`create-cloudinary-next`](https://github.com/cloudinary-devs/create-cloudinary-next)
- Cloudinary Node SDK, Advanced OCR, moderation, structured metadata, authenticated assets, and signed delivery
- shadcn components with Base UI and Tailwind CSS 4
- Vitest policy tests

## Configure Cloudinary

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Add your cloud name, API key, API secret, and a random session secret of at least 32 characters. The API secret must remain server-only.

3. Register the **OCR Text Detection and Extraction** and **Amazon Rekognition AI Moderation** add-ons in the Cloudinary Console. If an add-on is absent, the upload will fail or the policy will remain in review; it will not fail open.

4. Provision the structured metadata fields used as the decision record:

   ```bash
   npm run cloudinary:setup
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The readiness endpoint is `GET /api/health`; it returns booleans and add-on modes, never credential values.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary product environment name; safe for URL construction |
| `CLOUDINARY_API_KEY` | Yes | Server-side API authentication |
| `CLOUDINARY_API_SECRET` | Yes | Server-only signing secret |
| `DEMO_SESSION_SECRET` | Yes | Signs the scoped, HTTP-only reviewer cookie |
| `CLOUDINARY_OCR_MODE` | Recommended | Defaults to `adv_ocr`; set `off` only to demonstrate fail-closed review |
| `CLOUDINARY_MODERATION_KIND` | Recommended | Defaults to `aws_rek`; set `off` only to demonstrate fail-closed review |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical URL for SEO and structured data |

`CLOUDINARY_URL` is also supported instead of the three discrete Cloudinary credential variables.

## API boundaries

- `POST /api/scans` validates and quarantines an image, analyzes it, persists the policy record, and grants the current browser a signed reviewer session.
- `GET /api/scans/:scanId` reads the Cloudinary decision for the current review session.
- `POST /api/scans/:scanId/refresh` rechecks asynchronous moderation and recalculates the policy.
- `POST /api/scans/:scanId/agent` returns an `input_image` payload only when the persisted decision is `allow` and all required gates are complete.

## Threat-model boundaries

This proof covers visible instruction text detectable by OCR, common instruction-like phrases in returned media metadata, moderation state, file-size limits, basic magic-byte verification, authenticated storage, and server-side signed delivery.

It does **not** guarantee detection of steganography, invisible Unicode, optical adversarial examples, text OCR misses, malicious but non-instructional imagery, decompression bombs beyond the post-upload pixel cap, compromised Cloudinary credentials, or instructions introduced elsewhere in an agent conversation. Production systems should add model-specific classifiers, content disarm/normalization, isolated tool permissions, least-privilege agents, audit logs, rate limits, and human review appropriate to their risk.

Cloudinary signed authenticated URLs prove authorization parameters, but they are still shareable URLs and are not an expiring access-control system by themselves. Use token/cookie access control or a controlled proxy when link sharing or revocation is in scope.

## Verification

```bash
npm run check
```

Live Cloudinary verification requires real credentials and registered add-ons. Without them, unit tests and the production build still validate the local implementation while `/api/health` reports the missing runtime configuration.

See [docs/attack-matrix.md](docs/attack-matrix.md) for the article’s GEO proof artifact and evidence checklist.
