import { ImageResponse } from "next/og";
import { DURA, TEK } from "@/components/brand/wordmark";
import { getFinish, grainImage } from "@/lib/catalogue";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { ogImageData } from "@/lib/og";

export const alt = "Duratek finish";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share image for a finish: the plank on the left, name and format on the right. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const finish = await getFinish(slug);
  const grain = finish ? grainImage(finish) : undefined;
  const photo = await ogImageData(grain?.src, grain?.blurDataURL);
  const s = finish?.specs;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        <div style={{ display: "flex", width: 630, height: 630, background: "#e1e6ea" }}>
          {photo && <img src={photo} width={630} height={630} style={{ objectFit: "cover" }} alt="" />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 56px", flex: 1 }}>
          <svg viewBox="286 480 1039 232" width={180} height={40}>
            {DURA.map((d) => (
              <path key={d.slice(0, 12)} d={d} fill="#468e3c" />
            ))}
            {TEK.map((d) => (
              <path key={d.slice(0, 12)} d={d} fill="#123066" />
            ))}
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: -2, color: "#18364c" }}>{finish?.name ?? "Duratek"}</div>
            {finish && (
              <div style={{ marginTop: 18, fontSize: 28, color: "#5a6b78" }}>
                {`${STYLE_LABELS[finish.style]} · ${colourFamilyLabel(finish.colourFamily)}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#5a6b78" }}>
            {s?.plank_width_mm && s.plank_length_mm ? `${s.plank_width_mm} × ${s.plank_length_mm} mm · ${s.thickness_mm} mm thick` : "Waterproof SPC click flooring"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
