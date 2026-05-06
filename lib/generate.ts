import { anthropic, modelFor, priceCents } from "@/lib/anthropic";
import {
  SCHEMAS,
  TEXT_FORMATS,
  FORMAT_LIMITS,
  FORMAT_LABEL,
  PLATFORM_LABEL,
  type GenerationResult,
} from "@/lib/schemas";
import type { Format, Platform } from "@/lib/supabase/types";

export type BrandContext = {
  name: string;
  voiceMd: string;
  visualMd: string;
};

export type GenerationInput = {
  brand: BrandContext;
  brief: {
    source: "prompt" | "pdf" | "excel";
    prompt: string | null;
    /** Base64-encoded PDF (without the data: prefix). Sent as a document content block. */
    pdfBase64?: string | null;
    /** Plain-text fallback for excel/csv extraction. */
    fileText?: string | null;
  };
  platform: Platform;
  format: Format;
};

export class GenerationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GenerationError";
  }
}

// ── Per-platform / per-format rules — kept tight, full set lives in skill ──
const PLATFORM_RULES: Record<Platform, string> = {
  linkedin:
    "LinkedIn voice: thoughtful, operator-y, well-structured paragraphs. " +
    "Long posts: 1,200–1,800 chars; hook in first line; one idea per paragraph; ends with a soft CTA, not a hard sell. " +
    "Carousels: 5–10 slides, each ≤ 60 words.",
  instagram:
    "Instagram voice: visual-first, scannable, conversational. " +
    "Captions: 80–220 words; line breaks between ideas; emoji sparing and intentional; hashtags 5–12 at the end. " +
    "Carousels: 5–10 slides, each headline ≤ 8 words, body ≤ 30 words.",
  facebook:
    "Facebook voice: warm, direct, plain. " +
    "Short posts: ≤ 412 chars; one clear point; one or two hashtags max; CTA only when it adds value.",
  blog:
    "Blog/newsletter voice: deliberate, reportorial. " +
    "Articles: 700–1,400 words, semantic heading order H1→H2→H3, intro that earns the read, scannable subheadings. " +
    "Newsletter: subject ≤ 50 chars, preview ≤ 90 chars, body 400–800 words.",
};

function buildSystemPrompt(brand: BrandContext): string {
  return [
    "You are the Content Studio for a single brand. Your job is to write platform-native, on-voice content that conforms to a strict JSON schema.",
    "",
    "── BRAND VOICE (verbatim from brand/voice.md) ──",
    brand.voiceMd.trim() || "(voice file is empty — default to plain, operator-y prose; no marketing fluff.)",
    "",
    "── BRAND VISUAL (verbatim from brand/visual.md) ──",
    brand.visualMd.trim() || "(visual file is empty — assume a minimal, premium, system-default aesthetic.)",
    "",
    "── COMPLIANCE RULES ──",
    "1. Never invent specific statistics, dollar amounts, dates, or named people that are not present in the brief or source material.",
    "2. If the brief implies a claim that you cannot ground in the source material, set `compliance.flagged = true` and explain in `compliance.reason` (e.g., 'Claimed retention figure not present in source PDF.').",
    "3. Never use forbidden phrases listed in voice.md.",
    "4. Source-attribute any claim derived from a PDF brief in your reasoning, but do not write footnotes into the copy.",
    "5. For asset prompts, always include accessible `alt_text`.",
    "",
    "── OUTPUT ──",
    "Return ONLY a JSON object that satisfies the schema you are given. No prose, no preamble, no Markdown fence. The schema is enforced.",
  ].join("\n");
}

function buildUserPrompt(input: GenerationInput): string {
  const { brief, platform, format } = input;
  const brand = input.brand.name;
  const briefText =
    brief.source === "prompt"
      ? brief.prompt ?? ""
      : brief.fileText ?? "(file content extracted; treat as the source of truth)";

  return [
    `Brand: ${brand}.`,
    `Channel: ${PLATFORM_LABEL[platform]}.`,
    `Format: ${FORMAT_LABEL[format]}.`,
    "",
    "── PLATFORM RULES ──",
    PLATFORM_RULES[platform],
    "",
    "── BRIEF ──",
    briefText.trim(),
    "",
    `Now generate one ${FORMAT_LABEL[format]} for ${PLATFORM_LABEL[platform]}, in ${brand}'s voice. Match the schema exactly.`,
  ].join("\n");
}

export async function generatePiece(input: GenerationInput): Promise<GenerationResult> {
  if (!TEXT_FORMATS.includes(input.format)) {
    throw new GenerationError(
      `Format '${input.format}' is video — deferred to Phase 2. Phase 1 supports text formats only.`,
    );
  }

  const client = anthropic();
  const model = modelFor(input.format);
  const max_tokens = FORMAT_LIMITS[input.format].defaultMaxTokens;
  const schema = SCHEMAS[input.format as keyof typeof SCHEMAS];

  const system = buildSystemPrompt(input.brand);
  const userText = buildUserPrompt(input);

  // If the brief includes a PDF, attach as a document content block so Claude
  // reads the actual document — no client-side text extraction needed.
  type UserContent =
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "document";
            source: { type: "base64"; media_type: "application/pdf"; data: string };
          }
      >;
  const userContent: UserContent = input.brief.pdfBase64
    ? [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: input.brief.pdfBase64,
          },
        },
        { type: "text", text: userText },
      ]
    : userText;

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent as never }],
      // Structured output — output_config isn't typed on this SDK version yet,
      // so we cast through `as never` and rely on the API accepting the field
      // at runtime.
      ...({
        output_config: {
          format: {
            type: "json_schema",
            schema: schema as unknown as Record<string, unknown>,
          },
        },
      } as Record<string, unknown>),
    } as never);
  } catch (err: unknown) {
    throw new GenerationError("Claude generation request failed.", err);
  }

  // Find the first text block — output_config.format guarantees it's valid JSON.
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new GenerationError("No text block in response from Claude.");
  }

  let parsed: GenerationResult;
  try {
    parsed = JSON.parse(textBlock.text) as GenerationResult;
  } catch (err) {
    throw new GenerationError(
      `Generated output was not valid JSON despite output_config.format. Raw: ${textBlock.text.slice(0, 400)}`,
      err,
    );
  }

  if ((response.stop_reason as string) === "refusal") {
    throw new GenerationError("Claude refused to generate this piece. Adjust the brief or compliance rules.");
  }

  const tokensIn = response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0);
  const tokensOut = response.usage.output_tokens;

  return {
    ...parsed,
    tokensIn,
    tokensOut,
    costCents: priceCents(model, tokensIn, tokensOut),
    model,
  };
}
