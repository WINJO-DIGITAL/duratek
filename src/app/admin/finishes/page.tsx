import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { resolveImageUrl } from "@/lib/catalogue/mappers";
import { formatPence } from "@/lib/money";
import { userSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Finishes", robots: { index: false } };

export default function AdminFinishesPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

async function Content() {
  await requireAdmin("manage_products", "/admin/finishes");
  const db = await userSupabase();
  const { data } = await db
    .from("finishes")
    .select("id, name, slug, published, is_demo, rrp_per_m2_pence, specs, sort_order, finish_images (url, kind, sort_order)")
    .order("sort_order")
    .order("name");
  const rows = data ?? [];

  return (
    <AdminShell
      current="/admin/finishes"
      title="Finishes"
      intro={
        <p>
          The range as customers see it. Unpublish a finish to take it off the site without losing it. Finishes marked demo came from the Kwik
          Floors collection for the preview.
        </p>
      }
    >
      <ButtonLink href="/admin/finishes/new">Add a finish</ButtonLink>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {rows.map((f) => {
          const swatch = [...(f.finish_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).find((i) => i.kind === "swatch") ?? f.finish_images?.[0];
          const specs = (f.specs ?? {}) as { pack_coverage_m2?: number };
          return (
            <li key={f.id}>
              <Link href={`/admin/finishes/${f.id}`} className="card flex items-center gap-4 p-4 transition-colors hover:border-navy/40">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-line">
                  {swatch && <Image src={resolveImageUrl(swatch.url)} alt="" fill sizes="56px" quality={70} className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-navy">{f.name}</span>
                  <span className="data block text-[0.8125rem] text-ink-muted">
                    {specs.pack_coverage_m2 ? `${specs.pack_coverage_m2} m²/pack` : "No pack size"} ·{" "}
                    {f.rrp_per_m2_pence !== null ? `RRP ${formatPence(f.rrp_per_m2_pence)}` : "No RRP"}
                  </span>
                </span>
                <span className="text-right text-[0.8125rem]">
                  <span className={f.published ? "block text-green-ink" : "block text-ink-muted"}>{f.published ? "Published" : "Hidden"}</span>
                  {f.is_demo && <span className="block text-ink-muted">Demo</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
