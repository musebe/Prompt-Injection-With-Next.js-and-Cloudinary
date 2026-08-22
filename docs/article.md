# How to protect multimodal AI agents from image prompt injection with Next.js and Cloudinary

Multimodal AI agents can treat words inside an image as instructions, not only as content. If an application sends every uploaded image directly to a vision model, an attacker may be able to steer the model, request secrets, or influence tool use through visible text or more subtle cross-modal signals.

Yes, hidden or visible instructions inside an image can manipulate a multimodal AI agent. The defensive pattern in this tutorial places each image in an authenticated Cloudinary quarantine, extracts text and metadata, checks its moderation state, persists a policy decision, and releases a signed image URL only when every required gate passes.

- [Try the live Agent Shield Lab](https://prompt-injection-with-next-js-and-c.vercel.app/)
- [Explore the complete GitHub repository](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary)

This pipeline reduces exposure to image prompt injection. It is a layered control, not a universal detector for every adversarial image.

## What you will build

You will build a Next.js ingestion layer that makes Cloudinary the source of truth for an image's security state. It will:

1. Validate an uploaded JPEG, PNG, or WebP before processing it.
2. Store the image as an authenticated Cloudinary asset.
3. Run Cloudinary's Advanced OCR and Amazon Rekognition moderation.
4. Inspect returned media metadata for instruction-like content.
5. Evaluate a fail-closed policy and persist its decision as structured metadata.
6. Read the asset back through the Cloudinary Admin API.
7. Return a signed agent payload only for an allowed asset.

The finished demo does not invoke a vision model. Instead, it proves the security boundary immediately before that invocation, which is the point where an application should decide whether the model can receive the image.

## Why image prompt injection needs a separate security boundary

The [OWASP GenAI Security Project describes multimodal prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) as a risk in which malicious instructions embedded in an image can alter a model's behavior and potentially cause unauthorized actions or information disclosure.

This risk is broader than readable text. The peer-reviewed USENIX Security 2025 paper [Self-interpreting Adversarial Images](https://www.usenix.org/conference/usenixsecurity25/presentation/zhang-tingwei) demonstrates cross-modal attacks in which natural-looking images contain hidden meta-instructions that steer a model's interpretation. That research is also why this tutorial describes optical character recognition (OCR) as one defense layer, not a complete solution.

The application uses a quarantine-first architecture:

```text
Browser
  -> Next.js upload route
  -> file validation
  -> authenticated Cloudinary quarantine
       -> Advanced OCR
       -> media metadata extraction
       -> Amazon Rekognition moderation
  -> policy decision
  -> Cloudinary structured metadata
  -> Admin API readback
       -> block or review: no agent URL
       -> allow: signed image URL
```

Cloudinary is load-bearing in this design. It stores the quarantined asset, runs the image analyses, preserves the policy record, and enforces signed delivery.

## Prerequisites

You need:

- Node.js 20 or later.
- A Cloudinary account with access to the Marketplace.
- The **Text Detection and Extraction** add-on by Google.
- The **AI Moderation** add-on by Amazon Rekognition.
- A Vercel account only if you want to deploy the finished application.

Both Cloudinary add-ons require registration and have usage quotas. The [Cloudinary Marketplace](https://console.cloudinary.com/addons/) currently offers free plans, but plans and prices can change, so review the quota shown in your product environment before production use. Cloudinary documents a minimum image resolution of 1024 by 768 pixels for Advanced OCR. Amazon Rekognition moderation accepts smaller images, but OCR is the stricter requirement for this combined pipeline.

The project uses Next.js 16, React 19, the Cloudinary Node.js SDK, `next-cloudinary`, shadcn components, and Vitest. It was scaffolded with [create-cloudinary-next](https://github.com/cloudinary-devs/create-cloudinary-next).

## Step 1: Clone and install the project

Clone the finished project so your code matches the excerpts in this tutorial:

```bash
git clone https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary.git
cd "Prompt-Injection-With-Next.js-and-Cloudinary"
npm install
```

If you want to reproduce the initial scaffold instead, start with `create-cloudinary-next`, then add the server routes and policy files from the repository.

## Step 2: Enable the required Cloudinary add-ons

The Marketplace contains several products with similar names. This application needs these exact two cards:

| Cloudinary Marketplace card | Provider | Environment value | Purpose in this pipeline |
| --- | --- | --- | --- |
| **Text Detection and Extraction** | Google | `CLOUDINARY_OCR_MODE=adv_ocr` | Extract visible text for the prompt-injection policy |
| **AI Moderation** | Amazon Rekognition | `CLOUDINARY_MODERATION_KIND=aws_rek` | Check unsafe visual-content categories and return a moderation state |

Do not select **AI Content Analysis** or **Cloudinary AI Vision** for this implementation. Those products expose different capabilities and parameters.

In the Cloudinary Console:

1. Open **Marketplace** using the puzzle-piece icon.
2. Select **Text Detection and Extraction** by Google.
3. Choose a plan and confirm the registration.
4. Return to the Marketplace and select **AI Moderation** by Amazon Rekognition.
5. Choose a plan and confirm the registration.
6. Open **Installed Add-ons** and verify that both products appear.

Cloudinary's [OCR add-on documentation](https://cloudinary.com/documentation/ocr_text_detection_and_extraction_addon) defines `adv_ocr` for photos and graphics, and `adv_ocr:document` for text-heavy documents. The [Amazon Rekognition moderation documentation](https://cloudinary.com/documentation/aws_rekognition_ai_moderation_addon) defines `aws_rek` as the upload parameter used here.

## Step 3: Configure server credentials

Open **Settings** and then **API Keys** in the Cloudinary Console. Copy the cloud name and API key for the product environment used by the demo, and create or reveal its API secret. If a secret has appeared in chat, logs, screenshots, or another untrusted location, rotate it before continuing.

Copy the environment template:

```bash
cp .env.example .env.local
openssl rand -hex 32
```

The second command generates a 64-character random value for the reviewer-session secret. Add the generated value and your Cloudinary credentials to `.env.local`:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_rotated_api_secret
DEMO_SESSION_SECRET=your_64_character_random_value
CLOUDINARY_OCR_MODE=adv_ocr
CLOUDINARY_MODERATION_KIND=aws_rek
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Only the cloud name has the `NEXT_PUBLIC_` prefix. The API key and API secret authenticate server requests, while the session secret signs a scoped, HTTP-only reviewer cookie. Never expose either secret to a Client Component, browser bundle, screenshot, log, or Git commit.

You can copy the complete variable list from [`.env.example`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/.env.example).

## Step 4: Provision Cloudinary structured metadata

Structured metadata turns the scan result into a durable record on the asset. This prevents the UI from becoming the authority for an approval decision.

Run the setup command once for each Cloudinary product environment:

```bash
npm run cloudinary:setup
```

The script calls the Cloudinary Metadata API, skips fields that already exist, and creates the missing definitions. These are the fields it provisions:

| External ID | Stored value |
| --- | --- |
| `pi_decision` | `allow`, `review`, or `block` |
| `pi_risk_score` | Policy score from 0 to 100 |
| `pi_policy_version` | Version of the rule set that made the decision |
| `pi_ocr_status` | OCR completion state |
| `pi_moderation_status` | Cloudinary moderation state |
| `pi_ocr_text` | Untrusted text extracted from the image |
| `pi_metadata_text` | Flattened, untrusted media metadata |
| `pi_signals` | Compact JSON summary of triggered rules |
| `pi_original_filename` | Original client filename |
| `pi_scanned_at` | Scan date |

The setup engine is small because Cloudinary manages the field definitions:

```javascript
const existing = await cloudinary.api.list_metadata_fields();
const existingIds = new Set(
  existing.metadata_fields.map((field) => field.external_id),
);

for (const [external_id, label] of fields) {
  if (existingIds.has(external_id)) continue;
  await cloudinary.api.add_metadata_field({
    external_id,
    label,
    type: "string",
    mandatory: false,
  });
}
```

See the full [`setup-cloudinary.mjs` script](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/scripts/setup-cloudinary.mjs). Cloudinary's [structured metadata documentation](https://cloudinary.com/documentation/structured_metadata) explains how typed fields remain attached to assets and can be managed through the API or Media Library.

To verify this step in the Console, open **Settings**, find **Manage Structured Metadata**, and confirm that all ten `pi_*` fields are enabled.

## Step 5: Validate the file before Cloudinary upload

The Next.js route rejects invalid input before it consumes add-on quota. It enforces an 8 MB request limit, compares the declared MIME type with JPEG, PNG, or WebP magic bytes, and applies a 40-megapixel cap after Cloudinary decodes the image.

```typescript
const contentLength = Number(request.headers.get("content-length") ?? 0);
if (contentLength > uploadLimits.maxBytes + 256_000) {
  return errorResponse(new Error("The request exceeds the 8 MB upload limit."), 413);
}

const formData = await request.formData();
const image = formData.get("image");
if (!(image instanceof File)) {
  return errorResponse(new Error("Add an image using the image form field."), 400);
}

const bytes = new Uint8Array(await image.arrayBuffer());
validateImageFile(image, bytes);
```

Read the complete [`POST /api/scans` route](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/app/api/scans/route.ts) and [`file validation module`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/security/file.ts).

These checks reduce common upload abuse, but they do not replace dedicated malware scanning or full decompression-bomb protection in a high-risk production system.

## Step 6: Upload into an authenticated Cloudinary quarantine

The browser sends the file to the Next.js server. The server then uses `upload_stream` so the Cloudinary API secret never reaches the browser.

```typescript
const options: UploadApiOptions = {
  ...optionalAnalysisOptions(),
  resource_type: "image",
  type: "authenticated",
  public_id: `agent-shield/quarantine/${randomUUID()}`,
  overwrite: false,
  media_metadata: true,
  tags: ["agent-shield", "quarantine", "untrusted-input"],
  context: {
    original_filename: filename,
    trust_boundary: "untrusted",
  },
  headers: "X-Robots-Tag: noindex, nofollow",
};
```

The `authenticated` delivery type is the quarantine boundary. Cloudinary states that authenticated originals and derived assets require signed access. The random public ID prevents user-controlled naming, `overwrite: false` protects an existing asset, and `X-Robots-Tag` discourages indexing if a URL is ever exposed.

The application requests `ocr: "adv_ocr"`, `moderation: "aws_rek"`, and `media_metadata: true` in the same signed server upload. See the full [`uploadQuarantinedImage` implementation](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/cloudinary/security-assets.ts).

## Step 7: Extract OCR, metadata, and moderation evidence

The upload response contains three different evidence surfaces. Treat all of them as untrusted input.

```typescript
const ocr = extractOcr(upload);
const moderationStatus = extractModerationStatus(upload);
const metadataText = [
  image.name,
  flattenMetadata(upload.media_metadata),
].join(" ").trim();

const result = evaluateImagePolicy({
  ocrText: ocr.text,
  metadataText,
  ocrStatus: ocr.status,
  moderationStatus,
});
```

Advanced OCR returns text under `info.ocr.adv_ocr`. Media metadata may include Exchangeable Image File Format (EXIF), International Press Telecommunications Council (IPTC), or Extensible Metadata Platform (XMP) values. Amazon Rekognition moderation returns states such as `approved`, `rejected`, or `pending`.

Moderation and prompt-injection detection solve different problems. Moderation identifies categories of unsafe visual content. The local policy examines OCR and metadata for instruction-like language. An image must pass both layers.

## Step 8: Make the policy fail closed

The policy detects common instruction overrides, prompt-role references, secret extraction requests, tool-execution requests, authority claims, and imperatives. A strong signal or rejected moderation blocks the image. Missing analysis never produces `allow`.

```typescript
const score = Math.min(
  100,
  signals.reduce((total, signal) => total + signal.score, 0),
);
const hasHardBlock =
  input.moderationStatus === "rejected" ||
  signals.some((signal) => signal.score >= 50);
const checksComplete =
  input.ocrStatus === "complete" &&
  input.moderationStatus === "approved";
const decision = hasHardBlock
  ? "block"
  : score >= 20 || !checksComplete
    ? "review"
    : "allow";
```

This is a deliberately understandable policy for a tutorial. Production systems should tune rules from measured false positives and false negatives, add model-specific classifiers, and route ambiguous cases to human review. Read the complete [`policy.ts` engine](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/security/policy.ts) and its [`Vitest cases`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/security/policy.test.ts).

## Step 9: Persist the decision on the Cloudinary asset

The route writes its result back to the authenticated asset. OCR text and embedded metadata remain evidence, not instructions for the downstream model.

```typescript
await cloudinary.api.update(upload.public_id, {
  resource_type: "image",
  type: "authenticated",
  metadata: {
    pi_decision: result.decision,
    pi_risk_score: String(result.score),
    pi_policy_version: result.policyVersion,
    pi_ocr_status: ocrStatus,
    pi_moderation_status: moderationStatus,
    pi_signals: JSON.stringify(result.signals),
    pi_scanned_at: new Date().toISOString().slice(0, 10),
  },
});
```

The actual implementation also bounds stored text lengths and minimizes the signal record. See [`persistPolicyResult`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/cloudinary/security-assets.ts).

Persisting the decision supports later inspection, but persistence alone is not enough. The release endpoint must re-read the authoritative state rather than trusting a browser response or a mutable local object.

## Step 10: Read the result back through the Admin API

After writing metadata, the application fetches the asset by its immutable Cloudinary `asset_id`:

```typescript
const asset = await cloudinary.api.resource_by_asset_id(
  assetId,
  undefined,
  {
    metadata: true,
    context: true,
    moderations: true,
  },
);
```

This readback proves that the policy record survived the upload request. It also lets the application observe a moderation state that changed asynchronously. The refresh route re-reads the current state and recalculates the decision when moderation initially returns `pending`.

The relevant implementations are [`getAssetById`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/cloudinary/security-assets.ts), the [`scan readback route`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/app/api/scans/%5BscanId%5D/route.ts), and the [`moderation refresh route`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/app/api/scans/%5BscanId%5D/refresh/route.ts).

## Step 11: Release only a signed agent payload

An allowed asset still requires controlled delivery. The server creates a signed URL for the authenticated Cloudinary image:

```typescript
export function createSignedAssetUrl(publicId: string) {
  return getCloudinary().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
}
```

Before returning that URL, the agent route reads Cloudinary again and requires all three conditions:

```typescript
const asset = await getAssetById(scanId);
const scan = assetToScanRecord(asset);

if (!scan.agentUrlAvailable) {
  return NextResponse.json(
    { error: "Fail-closed policy: the image is not approved." },
    { status: 409 },
  );
}

return NextResponse.json({
  approved: true,
  input: { type: "input_image", image_url: scan.reviewUrl },
});
```

The payload intentionally excludes OCR text, metadata, and signal excerpts. Passing those strings beside the image would reintroduce untrusted instructions into the model context.

Read the full [`agent release route`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/app/api/scans/%5BscanId%5D/agent/route.ts) and [`signed reviewer-session implementation`](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/lib/security/session.ts).

Cloudinary's [media access-control documentation](https://cloudinary.com/documentation/control_access_to_media) explains authenticated assets and signed delivery URLs. A signed URL validates access to a protected asset, but the URL can still be shared. Use token-based or cookie-based access control, a controlled proxy, or another expiring authorization layer when revocation and link sharing are in scope.

## Step 12: Verify the Cloudinary asset in the Console

Do not stop at a successful browser response. Verify the asset and its persisted security state in Cloudinary:

1. Upload a benign image so you can inspect an approved asset in **Assets**. Rejected moderation results may be available through the moderation view instead of the normal asset view.
2. Search for the `agent-shield` tag or the `agent-shield/quarantine` public-ID prefix.
3. Open the uploaded asset.
4. Confirm its delivery type is `authenticated`.
5. Confirm the tags include `agent-shield`, `quarantine`, and `untrusted-input`.
6. Inspect the moderation result and confirm that Amazon Rekognition is `approved`, `rejected`, or still `pending`.
7. Open the asset's metadata panel and confirm that the `pi_*` structured metadata fields contain the decision, score, analysis states, policy version, and date.
8. Return to the application and request the agent payload. Only an asset with `allow`, completed OCR, and approved moderation should return an image URL.

This Console check separates an upload response from a security record that remains available after refresh.

## Test the result with an attack matrix

Use controlled test images, never real secrets. The repository includes a reproducible [image prompt-injection attack matrix](https://github.com/musebe/Prompt-Injection-With-Next.js-and-Cloudinary/blob/main/docs/attack-matrix.md).

| Case | Detection surface | Required outcome | Verification |
| --- | --- | --- | --- |
| Direct text injection | Application text-input policy | Block before this image pipeline | No Cloudinary upload is required |
| Visible image instructions | Advanced OCR plus policy rules | `block` and agent endpoint `409` | Inspect OCR signal and persisted `pi_decision` |
| Metadata payload | Media metadata plus policy rules | `block` or `review`, and endpoint `409` | Inspect metadata signal and persisted score |
| Benign image | OCR, metadata, and moderation | `allow` only after all checks pass | Confirm signed `input_image` payload |

On August 22, 2026, the verified benign end-to-end test uploaded a disposable 1200 by 900 image, received completed OCR and approved Amazon Rekognition moderation, persisted policy version `2026-08-22.1`, read the asset back by `asset_id`, and returned a signed `input_image` payload. The disposable Cloudinary asset was then deleted. The policy suite separately verifies visible instruction blocking, metadata exfiltration blocking, pending-moderation review, and benign approval.

Run the complete local validation suite:

```bash
npm run check
```

At the verified article commit, this command passes linting, TypeScript checks, nine tests, and a Next.js production build.

## Deploy to Vercel

Add the same seven environment variables to the Vercel project, using the production URL for `NEXT_PUBLIC_SITE_URL`. Keep `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `DEMO_SESSION_SECRET` server-only.

Run the metadata setup command against the same Cloudinary product environment used by the deployment. Then deploy and verify:

1. `GET /api/health` reports configured credentials and enabled analysis modes without returning credential values.
2. A valid image completes an end-to-end scan.
3. The Cloudinary Console shows the authenticated asset and persisted metadata.
4. A blocked or review decision cannot obtain an agent payload.
5. An allowed decision returns a signed URL only for the current reviewer session.

The completed deployment is available in the [live Agent Shield Lab](https://prompt-injection-with-next-js-and-c.vercel.app/).

## Security limitations and production hardening

This demo protects a narrow, important boundary. It does not claim that OCR plus regular expressions can detect every image prompt-injection technique.

| Limitation | Production control to consider |
| --- | --- |
| OCR can miss small, distorted, low-contrast, rotated, or unsupported text | Normalize images, test alternate OCR or classifiers, and require human review for high-impact actions |
| OCR does not detect steganography or model-specific adversarial perturbations | Add specialized detectors, content disarm and reconstruction, and model-specific evaluations |
| Moderation detects unsafe visual categories, not prompt semantics | Keep the prompt-injection policy as a separate gate |
| Heuristic rules can produce false positives and false negatives | Measure on representative data, version policies, and maintain an appeal or review path |
| A signed Cloudinary URL can be shared | Add expiring token or cookie access, or serve through a controlled authorization proxy |
| The demo cookie identifies a review session, not a person | Integrate production identity, authorization, rate limiting, audit logs, and revocation |
| Another part of the agent context can contain an injection | Apply trust boundaries to text, retrieved content, tool output, audio, and every other untrusted modality |

An agent should also use least-privilege tools, explicit action authorization, constrained network access, output validation, and human approval for consequential operations. Image screening reduces the chance that malicious content reaches the model, while capability controls limit the damage if screening fails.

## Frequently asked questions

### Can hidden instructions inside an image manipulate an AI agent?

Yes. Multimodal models can interpret image content as instructions, and research has demonstrated both visible typographic attacks and hidden cross-modal meta-instructions. The practical impact depends on the model, surrounding prompt, available tools, and application permissions.

### Does Cloudinary OCR stop every image prompt-injection attack?

No. Cloudinary OCR exposes detectable text so an application can evaluate it before model delivery. It may miss text, and it does not detect every steganographic or adversarial signal. Combine it with metadata inspection, model-specific testing, least-privilege tools, and human review where risk warrants it.

### Why use authenticated Cloudinary assets instead of public uploads?

Authenticated assets require signed access for both originals and derived resources. That property creates a useful quarantine boundary because an unapproved image has no ordinary public delivery URL.

### What happens while Cloudinary moderation is pending?

The policy returns `review`, not `allow`. The refresh endpoint reads the current moderation state from Cloudinary and recalculates the decision. The agent endpoint remains locked until moderation is approved and OCR is complete.

### Why store the decision in Cloudinary structured metadata?

Structured metadata keeps the decision, policy version, evidence state, and timestamp beside the asset. The agent endpoint can read that persisted record through the Admin API instead of trusting the browser or an earlier response.

### Does a signed Cloudinary URL expire automatically?

No. A signed delivery URL proves that its path was authorized, but it is still a shareable URL. Use Cloudinary token or cookie access control, or an authenticated proxy, when you need expiration, revocation, or user-specific access.

## Related Cloudinary reading

- [Secure image uploads in Next.js with Cloudinary](https://cloudinary.com/blog/nextjs-secure-image-uploads) explains signed upload foundations.
- [Build a moderated community photo wall](https://cloudinary.com/blog/community-photo-wall-tanstack-start-cloudinary-ai-moderation) explores user-generated content moderation as a separate workflow.
- [Cloudinary's Upload API reference](https://cloudinary.com/documentation/image_upload_api_reference) documents the `ocr`, `moderation`, `type`, metadata, and access-control parameters used here.

## Conclusion

A secure multimodal agent should not treat an uploaded image as trusted model input. This Next.js and Cloudinary pipeline quarantines the asset, extracts security evidence, fails closed when required checks are incomplete, persists a versioned decision, and releases only an approved signed image URL.

That boundary will not eliminate every cross-modal attack. It does give you an auditable place to combine Cloudinary analysis, application policy, human review, and least-privilege agent design before an untrusted image can influence a model.
