import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { getFinishes } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { DOCUMENT_TYPES, documentTypeLabel } from "@/lib/documents";
import { userSupabase } from "@/lib/supabase/server";
import { updateDocument, uploadDocument } from "./actions";

export const metadata: Metadata = { title: "Documents", robots: { index: false } };

export default function AdminDocumentsPage({ searchParams }: PageProps<"/admin/documents">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  added: "Document uploaded.",
  saved: "Saved.",
  deleted: "Document deleted.",
  missing: "Choose a PDF to upload.",
  title: "Give the document a title.",
  type: "Choose a document type.",
  size: "That file is over 4 MB. Please compress it, or upload it in the Supabase dashboard.",
  pdf: "That file isn’t a PDF.",
  confirm: "Tick the box to confirm deleting.",
  failed: "That didn’t work. Please try again.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/admin/documents">["searchParams"] }) {
  await requireAdmin("manage_documents", "/admin/documents");
  const notice = NOTICE[String((await searchParams).notice ?? "")];
  const db = await userSupabase();
  const [{ data: docs }, finishes] = await Promise.all([db.from("documents").select("*").order("created_at", { ascending: false }), getFinishes()]);
  const finishName = new Map(finishes.map((f) => [f.id, f.name]));

  return (
    <AdminShell
      current="/admin/documents"
      title="Documents"
      intro="PDFs are stored privately. Trade-only documents can be downloaded by approved accounts; public ones by anyone. Every download is a link that lasts one minute."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <form action={uploadDocument} encType="multipart/form-data" className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-display-sm text-navy">Upload a document</h2>
        <div>
          <label htmlFor="doc-file" className="text-[0.9375rem] font-medium text-navy">PDF file</label>
          <input id="doc-file" name="file" type="file" required accept="application/pdf" className="mt-2 block w-full text-[0.9375rem] text-navy file:mr-4 file:min-h-tap file:rounded-control file:border file:border-navy/40 file:bg-white file:px-4 file:text-navy" />
          <p className="mt-1 text-[0.8125rem] text-ink-muted">Up to 4 MB.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="doc-title" name="title" label="Title" required maxLength={200} placeholder="Fitting guide" />
          <SelectField id="doc-type" name="type" label="Type" options={DOCUMENT_TYPES} defaultValue="tech_sheet" />
          <SelectField id="doc-finish" name="finish_id" label="For" defaultValue="" options={[{ value: "", label: "All finishes" }, ...finishes.map((f) => ({ value: f.id, label: f.name }))]} />
        </div>
        <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
          <input type="checkbox" name="trade_only" defaultChecked className="size-5 accent-green-ink" />
          Trade only
        </label>
        <Button type="submit">Upload</Button>
      </form>

      <section aria-labelledby="docs-heading" className="mt-stack">
        <h2 id="docs-heading" className="text-display-sm text-navy">Documents</h2>
        {(docs ?? []).length === 0 ? (
          <p className="mt-4 text-ink-muted">None yet. Technical sheets, warranty documents, certificates and the brochure are still to come from Duratek.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {(docs ?? []).map((d) => (
              <li key={d.id} className="card flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5">
                <div className="min-w-0">
                  <a href={`/documents/${d.id}`} className="text-navy underline decoration-green underline-offset-4">{d.title}</a>
                  <p className="mt-1 text-[0.8125rem] text-ink-muted">
                    {documentTypeLabel(d.type)} · {d.finish_id ? (finishName.get(d.finish_id) ?? "Unpublished finish") : "All finishes"}
                  </p>
                </div>
                <form action={updateDocument} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <input type="hidden" name="id" value={d.id} />
                  <label className="flex min-h-tap items-center gap-2 text-[0.875rem] text-navy">
                    <input type="checkbox" name="trade_only" defaultChecked={d.trade_only} className="size-4 accent-green-ink" />
                    Trade only
                  </label>
                  <Button type="submit" variant="outline" name="intent" value="save">Save</Button>
                  <label className="flex min-h-tap items-center gap-2 text-[0.875rem] text-ink-muted">
                    <input type="checkbox" name="confirm" value="yes" className="size-4 accent-green-ink" />
                    Delete
                  </label>
                  <Button type="submit" variant="quiet" name="intent" value="delete">Delete</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
