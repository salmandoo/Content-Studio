// Hand-written typed schema for Supabase.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Platform = "linkedin" | "instagram" | "facebook" | "blog";

export type Format =
  | "long_post"
  | "short_post"
  | "carousel"
  | "article"
  | "newsletter"
  | "reel"
  | "square_video"
  | "landscape_video";

export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type PieceStatus =
  | "queued"
  | "writing"
  | "rendering"
  | "ready"
  | "flagged"
  | "failed"
  | "approved"
  | "rejected"
  | "review"
  | "published";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

type BrandSettingsRow = {
  id: string;
  user_id: string;
  name: string;
  voice_md: string;
  visual_md: string;
  tokens: Json;
  design_system: string;
  motion_preference: "snappy" | "cinematic";
  created_at: string;
  updated_at: string;
};

type DesignSystemRow = {
  id: string;
  user_id: string;
  name: string;
  tokens: Json;
  created_at: string;
};

type BriefRow = {
  id: string;
  user_id: string;
  source: "prompt" | "pdf" | "excel";
  prompt: string | null;
  file_path: string | null;
  file_name: string | null;
  channels: Platform[];
  formats: Format[];
  created_at: string;
};

type RunRow = {
  id: string;
  brief_id: string;
  user_id: string;
  label: string | null;
  status: RunStatus;
  total: number;
  done: number;
  failed: number;
  flagged: number;
  cost_cents: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
};

type PieceRow = {
  id: string;
  run_id: string;
  user_id: string;
  platform: Platform;
  format: Format;
  status: PieceStatus;
  title: string | null;
  excerpt: string | null;
  copy: string | null;
  hashtags: string[] | null;
  cta: string | null;
  slides: Json | null;
  composition: Json | null;
  flag_reason: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_cents: number | null;
  schema_json: Json | null;
  generated_at: string;
  approved_at: string | null;
  published_at: string | null;
};

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: WithOptional<ProfileRow, "email" | "display_name" | "created_at" | "updated_at">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      brand_settings: {
        Row: BrandSettingsRow;
        Insert: Omit<BrandSettingsRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<BrandSettingsRow>;
        Relationships: [];
      };
      design_systems: {
        Row: DesignSystemRow;
        Insert: Omit<DesignSystemRow, "id" | "created_at"> & { id?: string };
        Update: Partial<DesignSystemRow>;
        Relationships: [];
      };
      briefs: {
        Row: BriefRow;
        Insert: Partial<BriefRow> & Pick<BriefRow, "user_id" | "source" | "channels" | "formats">;
        Update: Partial<BriefRow>;
        Relationships: [];
      };
      runs: {
        Row: RunRow;
        Insert: Partial<RunRow> & Pick<RunRow, "brief_id" | "user_id">;
        Update: Partial<RunRow>;
        Relationships: [];
      };
      pieces: {
        Row: PieceRow;
        Insert: Partial<PieceRow> & Pick<PieceRow, "run_id" | "user_id" | "platform" | "format">;
        Update: Partial<PieceRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
