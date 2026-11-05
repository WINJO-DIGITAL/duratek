import { PostcodeBand } from "@/components/content/postcode-band";
import { SectionIntro } from "@/components/content/section-intro";
import { FiveLayers } from "@/components/home/five-layers";
import { FloorHero } from "@/components/home/floor-hero";
import { FloorLibrary, type LibraryBoard } from "@/components/home/floor-library";
import { OneRoom } from "@/components/home/one-room";
import { SampleSlots } from "@/components/home/sample-slots";
import { TwoFormats, type FormatSummary } from "@/components/home/two-formats";
import { PageTransition } from "@/components/layout/page-transition";
import { ButtonLink } from "@/components/ui/button";
import { byTone, getFinishes, getOnlineRetailers, grainImage, imagesOfKind } from "@/lib/catalogue";
import { EDITORIAL, pickAllByFileName, pickByFileName } from "@/lib/catalogue/curation";
import { FORMAT_LABELS, formatOptions, measureLine, plankFormat } from "@/lib/catalogue/format";
import { imagePool } from "@/lib/catalogue/image-pool";
import type { Finish } from "@/lib/catalogue/types";
import { colourFamilyLabel } from "@/lib/config";
import { countWord } from "@/lib/number-words";

/** "Natural oak · Standard plank" */
function detailLine(f: Finish): string {
  const format = plankFormat(f.specs);
  return [colourFamilyLabel(f.colourFamily), format && FORMAT_LABELS[format]].filter(Boolean).join(" · ");
}

/** "Windermere Oak flooring in a hallway" → "hallway" */
function roomFromAlt(alt: string): string | undefined {
  return alt.match(/\bin an? (.+)$/i)?.[1];
}

export default async function HomePage() {
  const [all, retailers] = await Promise.all([getFinishes(), getOnlineRetailers()]);
  const finishes = byTone(all);
  const rooms = imagePool(finishes, "room");

  // Hero photographs: the curated list, else the first floor-led room scene.
  const heroPicks = pickAllByFileName(rooms, EDITORIAL.hero);
  const heroes = heroPicks.length ? heroPicks : rooms.slice(0, 1);
  const room = pickByFileName(rooms, EDITORIAL.room, new Set(heroes.map((h) => h.image.src)));

  const boards: LibraryBoard[] = finishes.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    detail: detailLine(f),
    measures: measureLine(f.specs),
    swatch: grainImage(f),
  }));

  // Each format drawn with a mid-tone finish of its own, so the grain reads on white.
  const formats: FormatSummary[] = formatOptions(finishes).flatMap(({ format, label }) => {
    const inFormat = finishes.filter((f) => plankFormat(f.specs) === format);
    const example = inFormat[Math.floor(inFormat.length / 2)];
    const { plank_width_mm, plank_length_mm, thickness_mm } = example.specs;
    if (!plank_width_mm || !plank_length_mm) return [];
    return [
      {
        format,
        count: inFormat.length,
        thickness_mm,
        plank: { key: format, label, width_mm: plank_width_mm, length_mm: plank_length_mm, image: grainImage(example) },
      },
    ];
  });

  const swatches = Object.fromEntries(finishes.map((f) => [f.id, grainImage(f)]));
  // A mid-range swatch for the decorative layer in the diagram.
  const layerWood = grainImage(finishes[Math.floor(finishes.length / 3)]);

  return (
    <PageTransition>
      <>
        <FloorHero
          slides={heroes.map((h) => ({
            image: h.image,
            name: h.finish.name,
            slug: h.finish.slug,
            swatch: imagesOfKind(h.finish, "swatch")[0],
          }))}
        />

        {/* The floor library */}
        <section id="floor-library" aria-labelledby="library-heading" className="scroll-mt-header py-section">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionIntro
                eyebrow="The floor library"
                title={
                  <span id="library-heading">
                    {countWord(finishes.length)} finishes, light to dark.
                  </span>
                }
              />
              <ButtonLink href="/range" variant="quiet" className="reveal">
                Browse the range
              </ButtonLink>
            </div>
            <div className="mt-10 lg:mt-14">
              <FloorLibrary boards={boards} />
            </div>
          </div>
        </section>

        {/* Two formats, to scale */}
        {formats.length > 0 && (
          <section aria-label="Plank formats" className="bg-white py-section">
            <div className="container-page">
              <TwoFormats formats={formats} />
            </div>
          </section>
        )}

        {/* One room */}
        {room && (
          <section aria-label="In the room" className="py-section">
            <div className="container-page">
              <OneRoom
                image={room.image}
                finish={{
                  id: room.finish.id,
                  slug: room.finish.slug,
                  name: room.finish.name,
                  detail: detailLine(room.finish),
                  measures: measureLine(room.finish.specs),
                  room: roomFromAlt(room.image.alt),
                }}
              />
            </div>
          </section>
        )}

        <FiveLayers woodImage={layerWood} />

        {/* Three free samples, then the one quiet trade band */}
        <section id="samples" aria-labelledby="samples-heading" className="py-section">
          <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionIntro eyebrow="Free samples" title={<span id="samples-heading">Three free samples.</span>}>
                <p>
                  Put them down in the room they’re for, and look at them in daylight and in the evening. Add a sample
                  from any finish.
                </p>
              </SectionIntro>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <SampleSlots swatches={swatches} />
            </div>
          </div>
          <div className="container-page mt-section-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-line pt-6">
              <p className="text-navy">Fitting or specifying?</p>
              <ButtonLink href="/trade" variant="quiet">
                Open a trade account
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Where to buy */}
        <section className="bg-white py-section-sm">
          <div className="container-page">
            <PostcodeBand retailers={retailers} />
          </div>
        </section>
      </>
    </PageTransition>
  );
}
