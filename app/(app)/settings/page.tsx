"use client";

import { useEffect, useState } from "react";
import { Toolbar, PageHeader } from "@/components/Toolbar";
import { Card, Group, Row } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { Check, LogOut } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Brand = Database["public"]["Tables"]["brand_settings"]["Row"];
type Section = "voice" | "visual" | "advanced";

export default function SettingsPage() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [section, setSection] = useState<Section>("voice");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Local edits
  const [voiceMd, setVoiceMd] = useState("");
  const [visualMd, setVisualMd] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { brand } = await api.get<{ brand: Brand }>("/api/brand");
        if (!alive) return;
        setBrand(brand);
        setVoiceMd(brand.voice_md);
        setVisualMd(brand.visual_md);
        setName(brand.name);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { brand: updated } = await api.patch<{ brand: Brand }>("/api/brand", {
        name,
        voice_md: voiceMd,
        visual_md: visualMd,
      });
      setBrand(updated);
      setSavedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    window.location.href = "/auth/login";
  }

  return (
    <>
      <Toolbar
        title="Settings"
        subtitle={brand ? `brands/${brand.name.toLowerCase().replace(/\s+/g, "-")}/` : "Loading…"}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-3.5" strokeWidth={2.4} /> Sign out
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={saving || !brand}
              onClick={save}
            >
              <Check className="size-3.5" strokeWidth={2.4} />
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-[1280px] px-6 py-10 sm:px-8">
        <PageHeader
          eyebrow="Brand"
          title={
            <>
              {brand?.name ?? "Brand"} <span className="text-blue">.</span>{" "}
              <span className="font-normal italic text-label-secondary">a brand book in code</span>
            </>
          }
          subtitle="Edit voice and visual instructions in plain Markdown — every subsequent run reads the change."
          right={
            savedAt && (
              <Pill tone="green" size="sm" dot>
                Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Pill>
            )
          }
        />

        {error && (
          <div className="mb-6 rounded-[14px] border border-red/30 bg-red/8 px-5 py-3 text-[13.5px] font-medium text-red">
            {error}
          </div>
        )}

        {!brand ? (
          <div className="rounded-[18px] bg-card-grouped p-8 text-center text-label-secondary shadow-card">
            Loading brand settings…
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-3">
              <Segmented
                value={section}
                onChange={(v) => setSection(v)}
                options={[
                  { value: "voice", label: "Voice" },
                  { value: "visual", label: "Visual" },
                  { value: "advanced", label: "Advanced" },
                ]}
              />
            </div>

            {(section === "voice" || section === "visual") && (
              <Card inset>
                <div className="flex items-center justify-between border-b border-separator bg-bg-grouped px-4 py-2.5">
                  <p className="text-[12.5px] font-mono text-label-secondary">
                    <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-blue align-middle" />
                    brand/{section === "voice" ? "voice.md" : "visual.md"}
                  </p>
                </div>
                <textarea
                  value={section === "voice" ? voiceMd : visualMd}
                  onChange={(e) =>
                    section === "voice" ? setVoiceMd(e.target.value) : setVisualMd(e.target.value)
                  }
                  spellCheck={false}
                  className="block h-[520px] w-full resize-none bg-card-grouped p-5 font-mono text-[13.5px] leading-[1.7] text-label outline-none"
                />
              </Card>
            )}

            {section === "advanced" && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                  <Group header="Identity">
                    <Row
                      title="Brand name"
                      trailing={
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="rounded-[8px] bg-fill-tertiary px-2.5 py-1 text-[13.5px] text-label outline-none focus:bg-fill-secondary"
                        />
                      }
                    />
                    <Row title="Skill" trailing={<span className="font-mono">content-studio@0.4.1</span>} />
                    <Row
                      title="Last validated"
                      trailing={
                        <Pill tone="green" size="sm" dot>
                          {brand.updated_at
                            ? new Date(brand.updated_at).toLocaleString()
                            : "—"}
                        </Pill>
                      }
                    />
                  </Group>
                </div>
                <aside className="col-span-12 lg:col-span-4">
                  <Card>
                    <h3 className="text-headline">Phase 1</h3>
                    <p className="mt-2 text-callout text-label-secondary">
                      Text generation only (LinkedIn long, IG carousel, FB short, Blog article).
                      Video formats stub as flagged "Coming in Phase 2".
                    </p>
                    <p className="mt-3 text-footnote text-label-tertiary">
                      Cached: brand voice + visual.md across all generations in a run.
                      Cache TTL: 5 minutes.
                    </p>
                  </Card>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
