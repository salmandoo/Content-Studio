// JSON Schemas for structured outputs — locked, mirror PRD Appendix A.
// Used as `output_config.format = { type: "json_schema", schema }` so Claude
// is constrained to valid output we can save directly to Supabase.

import type { Format, Platform } from "@/lib/supabase/types";

const ASSET_PROMPT = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject:      { type: "string" },
    style:        { type: "string" },
    overlay_text: { type: ["string", "null"] },
    alt_text:     { type: "string" },
  },
  required: ["subject", "style", "overlay_text", "alt_text"],
} as const;

export const SCHEMAS = {
  long_post: {
    type: "object",
    additionalProperties: false,
    properties: {
      title:        { type: "string", description: "Short editorial title (used in UI only — not in copy)." },
      copy:         { type: "string", description: "The full post body. Plain text. Up to 3,000 characters." },
      hashtags:     { type: "array",  items: { type: "string" }, description: "Without the # prefix? Include the #." },
      cta:          { type: ["string", "null"] },
      asset_prompt: ASSET_PROMPT,
      compliance: {
        type: "object",
        additionalProperties: false,
        properties: {
          flagged: { type: "boolean" },
          reason:  { type: ["string", "null"] },
        },
        required: ["flagged", "reason"],
      },
    },
    required: ["title", "copy", "hashtags", "cta", "asset_prompt", "compliance"],
  },

  short_post: {
    type: "object",
    additionalProperties: false,
    properties: {
      title:        { type: "string" },
      copy:         { type: "string", description: "≤ 412 characters." },
      hashtags:     { type: "array", items: { type: "string" } },
      cta:          { type: ["string", "null"] },
      asset_prompt: ASSET_PROMPT,
      compliance: {
        type: "object",
        additionalProperties: false,
        properties: { flagged: { type: "boolean" }, reason: { type: ["string", "null"] } },
        required: ["flagged", "reason"],
      },
    },
    required: ["title", "copy", "hashtags", "cta", "asset_prompt", "compliance"],
  },

  carousel: {
    type: "object",
    additionalProperties: false,
    properties: {
      title:    { type: "string" },
      caption:  { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
      slides: {
        type: "array",
        minItems: 5,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            index:        { type: "integer", description: "1-based slide index." },
            headline:     { type: "string" },
            body:         { type: "string" },
            asset_prompt: ASSET_PROMPT,
          },
          required: ["index", "headline", "body", "asset_prompt"],
        },
      },
      compliance: {
        type: "object",
        additionalProperties: false,
        properties: { flagged: { type: "boolean" }, reason: { type: ["string", "null"] } },
        required: ["flagged", "reason"],
      },
    },
    required: ["title", "caption", "hashtags", "slides", "compliance"],
  },

  article: {
    type: "object",
    additionalProperties: false,
    properties: {
      title:     { type: "string" },
      frontmatter: {
        type: "object",
        additionalProperties: false,
        properties: {
          title:       { type: "string" },
          slug:        { type: "string" },
          description: { type: "string" },
          tags:        { type: "array", items: { type: "string" } },
        },
        required: ["title", "slug", "description", "tags"],
      },
      body_markdown:     { type: "string", description: "Full Markdown body, semantic heading order H1→H2→H3." },
      hero_asset_prompt: ASSET_PROMPT,
      compliance: {
        type: "object",
        additionalProperties: false,
        properties: { flagged: { type: "boolean" }, reason: { type: ["string", "null"] } },
        required: ["flagged", "reason"],
      },
    },
    required: ["title", "frontmatter", "body_markdown", "hero_asset_prompt", "compliance"],
  },

  newsletter: {
    type: "object",
    additionalProperties: false,
    properties: {
      title:             { type: "string" },
      subject:           { type: "string", description: "Email subject line." },
      preview:           { type: "string", description: "Preview / preheader text." },
      body_markdown:     { type: "string" },
      hero_asset_prompt: ASSET_PROMPT,
      compliance: {
        type: "object",
        additionalProperties: false,
        properties: { flagged: { type: "boolean" }, reason: { type: ["string", "null"] } },
        required: ["flagged", "reason"],
      },
    },
    required: ["title", "subject", "preview", "body_markdown", "hero_asset_prompt", "compliance"],
  },
} as const;

// Phase 1: video formats not generated. Stored as flagged stubs so the UI
// can render "Coming in Phase 2".
export const TEXT_FORMATS: Format[] = ["long_post", "short_post", "carousel", "article", "newsletter"];
export const VIDEO_FORMATS: Format[] = ["reel", "square_video", "landscape_video"];

export const FORMAT_LIMITS: Record<Format, { defaultMaxTokens: number }> = {
  long_post:       { defaultMaxTokens: 6_000 },
  short_post:      { defaultMaxTokens: 1_500 },
  carousel:        { defaultMaxTokens: 6_000 },
  article:         { defaultMaxTokens: 12_000 },
  newsletter:      { defaultMaxTokens: 8_000 },
  reel:            { defaultMaxTokens: 4_000 },
  square_video:    { defaultMaxTokens: 4_000 },
  landscape_video: { defaultMaxTokens: 4_000 },
};

export type AssetPrompt = {
  subject: string;
  style: string;
  overlay_text: string | null;
  alt_text: string;
};

export type GenerationResult = {
  title: string;
  copy?: string;
  hashtags?: string[];
  cta?: string | null;
  asset_prompt?: AssetPrompt | null;
  caption?: string;
  slides?: { index: number; headline: string; body: string; asset_prompt: AssetPrompt }[];
  frontmatter?: { title: string; slug: string; description: string; tags: string[] };
  body_markdown?: string;
  hero_asset_prompt?: AssetPrompt;
  subject?: string;
  preview?: string;
  compliance: { flagged: boolean; reason: string | null };
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  model: string;
};

export type FormatRule = { platform: Platform; format: Format };

// Format → human label, used in user prompts.
export const FORMAT_LABEL: Record<Format, string> = {
  long_post: "long-form post",
  short_post: "short post",
  carousel: "document carousel",
  article: "blog article (Markdown with frontmatter)",
  newsletter: "newsletter issue",
  reel: "vertical reel (video)",
  square_video: "square video",
  landscape_video: "landscape video",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  blog: "blog/newsletter",
};
