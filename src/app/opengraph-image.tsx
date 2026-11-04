import { ImageResponse } from "next/og";
import { DURA, TEK } from "@/components/brand/wordmark";
import { byTone, getFinishes } from "@/lib/catalogue";

export const alt = "Duratek: beautifully considered, built to perform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image: wordmark and line over the range as boards, light to dark. */
export default async function Image() {
  const finishes = byTone(await getFinishes());
  const boards = finishes.map((f) => f.images.find((i) => i.kind === "swatch")?.blurDataURL).filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f7f6f2" }}>
        <div style={{ display: "flex", flexDirection: "column", padding: "60px 64px 40px", gap: 28 }}>
          <svg viewBox="286 480 1039 232" width={270} height={60}>
            {DURA.map((d) => (
              <path key={d.slice(0, 12)} d={d} fill="#468e3c" />
            ))}
            {TEK.map((d) => (
              <path key={d.slice(0, 12)} d={d} fill="#123066" />
            ))}
          </svg>
          <div style={{ fontSize: 58, lineHeight: 1.08, letterSpacing: -2, color: "#18364c" }}>
            Beautifully considered. Built to perform.
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, gap: 4 }}>
          {boards.map((src, i) => (
            <img key={i} src={src} width={1200 / boards.length - 4} height={300} style={{ objectFit: "cover", flex: 1 }} alt="" />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
