"use client";

import { useState } from "react";
import { addImage } from "@/app/admin/finishes/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";

/** Upload a photograph. The browser reads its pixel size so pages reserve the right space (no layout shift). */
export function ImageUpload({ finishId }: { finishId: string }) {
  const [size, setSize] = useState({ w: "", h: "" });
  const [tooBig, setTooBig] = useState(false);
  return (
    <form action={addImage} encType="multipart/form-data" className="space-y-5">
      <input type="hidden" name="finish_id" value={finishId} />
      <input type="hidden" name="width" value={size.w} />
      <input type="hidden" name="height" value={size.h} />
      <div>
        <label htmlFor="image-file" className="text-[0.9375rem] font-medium text-navy">Photograph</label>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">JPEG, PNG, WebP or AVIF, up to 4 MB. Wide room scenes work best at 2400px across.</p>
        <input
          id="image-file"
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="mt-2 block w-full text-[0.9375rem] text-navy file:mr-4 file:min-h-tap file:rounded-control file:border file:border-navy/40 file:bg-white file:px-4 file:text-navy"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            setTooBig(Boolean(f && f.size > 4 * 1024 * 1024));
            if (!f) return;
            const url = URL.createObjectURL(f);
            const img = new window.Image();
            img.onload = () => {
              setSize({ w: String(img.naturalWidth), h: String(img.naturalHeight) });
              URL.revokeObjectURL(url);
            };
            img.src = url;
          }}
        />
        {tooBig && <p className="mt-2 text-[0.875rem] text-error">That file is over 4 MB. Please export a smaller version.</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <SelectField
          id="image-kind"
          name="kind"
          label="Kind"
          defaultValue="room"
          options={[
            { value: "room", label: "Room scene" },
            { value: "closeup", label: "Close-up" },
            { value: "swatch", label: "Plank swatch" },
          ]}
        />
        <Field id="image-alt" name="alt" label="Description for screen readers" required maxLength={300} placeholder="Keswick Oak flooring in a bright kitchen" />
      </div>
      <Button type="submit" variant="outline" disabled={tooBig}>Upload</Button>
    </form>
  );
}
