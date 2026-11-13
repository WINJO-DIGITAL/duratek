import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { FinishForm, type FinishValues } from "@/components/admin/finish-form";
import { ImageUpload } from "@/components/admin/image-upload";
import { VariantForm } from "@/components/admin/variant-form";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/admin";
import { resolveImageUrl } from "@/lib/catalogue/mappers";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";
import { setArchived, updateImage } from "../actions";

export const metadata: Metadata = { title: "Edit finish", robots: { index: false } };

export default function AdminFinishPage({ params, searchParams }: PageProps<"/admin/finishes/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  created: "Finish created. Add its photographs below, then publish it.",
  "image-added": "Photograph added.",
  "image-saved": "Photograph updated.",
  "image-removed": "Photograph removed.",
  "image-missing": "Choose a file to upload.",
  "image-type": "Use a JPEG, PNG, WebP or AVIF image.",
  "image-size": "That file is over 4 MB.",
  "image-kind": "Choose what kind of photograph it is.",
  "image-alt": "Describe the photograph for people using screen readers.",
  "image-failed": "The upload didn’t work. Please try again.",
  restored: "Restored. It stays hidden until you publish it.",
  "archive-failed": "Couldn’t archive. Please try again.",
};

const NEW_FINISH: FinishValues = {
  name: "",
  slug: "",
  style: "plank",
  colour_family: "natural",
  description: "",
  sort_order: 100,
  published: false,
  // The construction every Duratek finish shares (product facts).
  specs: { wear_layer_mm: 0.55, core: "Rigid SPC, waterproof", surface: "Duratek Scratch Shield", underlay: "Integrated", click_system: "Unilin click-lock, floating installation" },
};

const KIND_LABEL = { room: "Room scene", closeup: "Close-up", swatch: "Plank swatch" } as const;

async function Content({ params, searchParams }: { params: PageProps<"/admin/finishes/[id]">["params"]; searchParams: PageProps<"/admin/finishes/[id]">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireAdmin("manage_products", `/admin/finishes/${id}`);
  const notice = NOTICE[String(sp.notice ?? "")];

  if (id === "new") {
    return (
      <AdminShell current="/admin/finishes" title="New finish" intro="Start with the name and specification. Photographs come next.">
        <div className="card p-5 sm:p-8">
          <FinishForm values={NEW_FINISH} />
        </div>
      </AdminShell>
    );
  }
  if (!isUuid(id)) notFound();

  const db = await userSupabase();
  const { data: f } = await db
    .from("finishes")
    .select("id, name, slug, style, colour_family, description, sort_order, published, is_demo, archived_at, specs, finish_images (id, url, kind, alt, width, height, sort_order), product_variants (id, sku, name, unit_of_sale, pack_coverage_m2, units_per_pack, length_mm, width_mm, thickness_mm, vat_rate_bp, active, is_default, sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (!f) notFound();
  const images = [...(f.finish_images ?? [])].sort((a, b) => a.kind.localeCompare(b.kind) || a.sort_order - b.sort_order);

  return (
    <AdminShell
      current="/admin/finishes"
      title={f.name}
      intro={
        <p>
          {f.published ? (
            <Link href={`/range/${f.slug}`} className="underline decoration-green underline-offset-4">View on the site</Link>
          ) : (
            "Hidden from the site."
          )}
          {f.is_demo && " Demo data from the Kwik Floors collection: confirm the specification with Duratek before launch."}
        </p>
      }
    >
      <Link href="/admin/finishes" className="nav-link -mt-4 mb-6 gap-2">
        <ArrowLeft size={16} /> All finishes
      </Link>
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <div className="card p-5 sm:p-8">
        <FinishForm values={{ ...f, sku: f.product_variants?.find((v) => v.is_default)?.sku, specs: (f.specs ?? {}) as Record<string, unknown> }} />
      </div>

      <section id="variants" aria-labelledby="variants-heading" className="mt-stack scroll-mt-24">
        <h2 id="variants-heading" className="text-display-sm text-navy">Variants and Pack Coverage</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          How this finish is sold. Prices are set per variant under Prices. Pack coverage is what trade calculators and quotes use to round up to whole packs.
        </p>
        <ul className="mt-6 space-y-3">
          {[...(f.product_variants ?? [])]
            .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.sort_order - b.sort_order)
            .map((variant) => (
              <li key={variant.id} className="card p-5">
                <p className="mb-4 text-[0.875rem] text-ink-muted">
                  {variant.is_default ? "Default variant" : variant.active ? "Variant" : "Variant, not on sale"}
                </p>
                <VariantForm finishId={f.id} values={variant} />
              </li>
            ))}
          <li className="card p-5">
            <p className="mb-4 text-[0.9375rem] font-medium text-navy">Add a variant</p>
            <VariantForm finishId={f.id} values={{}} />
          </li>
        </ul>
      </section>

      <section id="images" aria-labelledby="images-heading" className="mt-stack scroll-mt-24">
        <h2 id="images-heading" className="text-display-sm text-navy">Photographs</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          The plank swatch leads on cards; room scenes and close-ups fill the gallery, lowest order first.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <li key={img.id} className="card overflow-hidden">
              <div className="relative aspect-[4/3] bg-line">
                <Image src={resolveImageUrl(img.url)} alt={img.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" quality={70} className="object-cover" />
              </div>
              <form action={updateImage} className="space-y-3 p-4">
                <input type="hidden" name="finish_id" value={f.id} />
                <input type="hidden" name="id" value={img.id} />
                <div className="flex gap-3">
                  <label className="sr-only" htmlFor={`kind-${img.id}`}>Kind</label>
                  <select id={`kind-${img.id}`} name="kind" defaultValue={img.kind} className="min-h-tap flex-1 rounded-control border border-navy/25 bg-white px-3 text-[0.875rem] text-navy">
                    {Object.entries(KIND_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`sort-${img.id}`}>Order</label>
                  <input id={`sort-${img.id}`} name="sort_order" inputMode="numeric" defaultValue={img.sort_order} className="data min-h-tap w-16 rounded-control border border-navy/25 bg-white px-3 text-[0.875rem] text-navy" />
                </div>
                <label className="sr-only" htmlFor={`alt-${img.id}`}>Description</label>
                <input id={`alt-${img.id}`} name="alt" defaultValue={img.alt} required maxLength={300} className="min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.875rem] text-navy" />
                <div className="flex items-center justify-between gap-3">
                  <Button type="submit" variant="outline" name="intent" value="save">Save</Button>
                  <button type="submit" name="intent" value="delete" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">
                    Remove
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
        <div className="card mt-6 p-5 sm:p-6">
          <h3 className="text-[1.0625rem] text-navy">Add a Photograph</h3>
          <div className="mt-4">
            <ImageUpload finishId={f.id} />
          </div>
        </div>
      </section>
    
      <section aria-labelledby="archive-heading" className="mt-stack border-t border-line pt-8">
        <h2 id="archive-heading" className="text-display-sm text-navy">{f.archived_at ? "Archived" : "Archive this finish"}</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          {f.archived_at
            ? "This finish is hidden everywhere on the site and in new quotes. Its history is kept."
            : "Archiving hides the finish from the site, samples and new quotes. Nothing is deleted, so it can be restored."}
        </p>
        <form action={setArchived} className="mt-4">
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="archive" value={f.archived_at ? "no" : "yes"} />
          <Button type="submit" variant="outline">{f.archived_at ? "Restore" : "Archive finish"}</Button>
        </form>
      </section>
</AdminShell>
  );
}
