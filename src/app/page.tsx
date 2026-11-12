import type { CatalogueImage } from "@/lib/catalogue/types";
import { formatPence } from "@/lib/money";
import { PostcodeBand } from "@/components/content/postcode-band";
import { SectionIntro } from "@/components/content/section-intro";
import { FiveLayers } from "@/components/home/five-layers";
import { FloorHero } from "@/components/home/floor-hero";
import { FloorLibrary, type LibraryBoard } from "@/components/home/floor-library";
import { OneRoom } from "@/components/home/one-room";
import { RoomStrip, type StripRoom } from "@/components/home/room-strip";
import { SampleSlots } from "@/components/home/sample-slots";
import { TwoFormats, type FormatSummary } from "@/components/home/two-formats";
import { PageTransition } from "@/components/layout/page-transition";
import { ButtonLink } from "@/components/ui/button";
import { EyeIcon, ParcelIcon, Swatches } from "@/components/ui/icons";
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
/** Rooms where the floor fills the frame: a hallway, a living room, a lounge. */
const FLOOR_LED_ROOM = /hallway|living|lounge|reading nook|bedroom|dining/i;
/** Kitchens and bathrooms show cabinets and fittings more than the floor: not used for the board photographs. */
const SKIP_ROOM = /kitchen|bathroom|kids|playroom|shower/i;
/** Board photographs chosen by hand, where the automatic choice didn't show the floor. Matched by file name. */
const PINNED_BOARD_ROOM: Record<string, string> = {
  "hawkshead-oak": "Hawkshead_Oak_Real_Homes.png",
  "keswick-oak": "Keswick_Oak_5.jpg",
  "conniston-oak": "29036_5-4.1920x1200.jpg",
  "kirkstone-grey-oak": "Kirkstone_Grey_Oak_Luxury_Click_Vinyl_Flooring_5mm_kitchen_image.png",
  "ambleside-oak": "Ambleside_Oak_Luxury_Click_Vinyl_Flooring_5mm_kitchen_image.png",
  "fellside-oak": "Fellside_Oak_XL_Luxury_Click_Vinyl_Flooring_Living_Area.jpg",
};
function pinnedBoardRoom<T extends { slug: string; images: CatalogueImage[] }>(f: T): CatalogueImage | undefined {
  const file = PINNED_BOARD_ROOM[f.slug];
  if (!file) return undefined;
  return f.images.find((i) => i.kind === "room" && decodeURIComponent(i.src.split("?")[0]).endsWith(`/${file}`));
}

/** The room is named in the caption or, for the Kwik photographs, in the file name. */
function roomText(image: { alt: string; src: string }): string {
  return `${image.alt} ${decodeURIComponent(image.src.split("/").pop() ?? "")}`;
}

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

  // More rooms: one floor-led scene per finish, skipping finishes already shown above.
  const shown = new Set([...heroes.map((h) => h.finish.id), ...(room ? [room.finish.id] : [])]);
  const stripRooms: StripRoom[] = [];
  for (const r of rooms) {
    if (stripRooms.length === 6) break;
    if (shown.has(r.finish.id)) continue;
    shown.add(r.finish.id);
    stripRooms.push({ image: r.image, slug: r.finish.slug, name: r.finish.name, room: roomFromAlt(r.image.alt) });
  }

  const boards: LibraryBoard[] = finishes.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    detail: detailLine(f),
    measures: measureLine(f.specs),
    rrp: f.rrpPence !== undefined ? formatPence(f.rrpPence) : undefined,
    sampleAvailable: f.sampleAvailable,
    swatch: grainImage(f),
    // The photograph under the strip: a real room, floor-led first (hallway, living room), any room
    // that isn't a kitchen next, then a kitchen; the grain close-up or swatch only if no room photo exists.
    room:
      pinnedBoardRoom(f) ??
      f.images.find((i) => i.kind === "room" && FLOOR_LED_ROOM.test(roomText(i)) && !SKIP_ROOM.test(roomText(i))) ??
      f.images.find((i) => i.kind === "room" && !SKIP_ROOM.test(roomText(i))) ??
      f.images.find((i) => i.kind === "closeup") ??
      f.images.find((i) => i.kind === "swatch"),
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

  // Three varied floors (light, mid, dark) shown faintly in the empty tray slots.
  const slotPreviews = [0, Math.floor(finishes.length / 2), finishes.length - 1]
    .map((i) => finishes[i] && grainImage(finishes[i]))
    .filter((img): img is NonNullable<typeof img> => Boolean(img));

  // The surface up close: a grain close-up from the catalogue, for the layers panel.

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
            rrp: h.finish.rrpPence !== undefined ? formatPence(h.finish.rrpPence) : undefined,
          }))}
        />

        {/* The floor library */}
        <section id="floor-library" aria-labelledby="library-heading" className="scroll-mt-header py-section">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionIntro
                title={
                  <span id="library-heading">
                    {countWord(finishes.length)} finishes, light to dark.
                  </span>
                }
              />
              <ButtonLink href="/explore" variant="quiet" className="reveal">
                Explore Them Full Screen
              </ButtonLink>
            </div>
            <div className="mt-stack">
              <FloorLibrary boards={boards} />
            </div>
          </div>
        </section>

        {/* Two formats, to scale */}
        {formats.length > 0 && (
          <section aria-label="Plank formats" className="bg-cream py-section">
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
                  sampleAvailable: room.finish.sampleAvailable,
                  room: roomFromAlt(room.image.alt),
                }}
              />
            </div>
            <RoomStrip rooms={stripRooms} />
          </section>
        )}

        <FiveLayers woodImage={layerWood} />

        {/* Three free samples: the tray made visible, in its own panel. Then the one quiet trade band. */}
        <section id="samples" aria-labelledby="samples-heading" className="py-section-sm">
          <div className="container-page">
            <div className="grid gap-10 rounded-card bg-cream px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-12 lg:gap-14 lg:px-16 lg:py-20">
              <div className="lg:col-span-5">
                <SectionIntro
                  title={<span id="samples-heading">Three free samples, posted to you.</span>}
                >
                  <p>Put them down in the room they’re for, and look at them in daylight and in the evening.</p>
                </SectionIntro>
                <ul className="mt-8 space-y-3 text-[0.9375rem] text-navy">
                  {[
                    { icon: Swatches, text: "Choose any three finishes" },
                    { icon: ParcelIcon, text: "Posted to your door, free" },
                    { icon: EyeIcon, text: "See them in your own light" },
                  ].map(({ icon: IconC, text }) => (
                    <li key={text} className="flex items-center gap-3">
                      <IconC size={22} className="shrink-0 text-oak" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-7 lg:self-center">
                <SampleSlots swatches={swatches} previews={slotPreviews} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-1">
              <p className="text-navy">Fitting or specifying?</p>
              <ButtonLink href="/trade" variant="quiet">
                Open a Trade Account
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Where to buy */}
        <section className="bg-cream py-section-sm">
          <div className="container-page">
            <PostcodeBand retailers={retailers} />
          </div>
        </section>
      </>
    </PageTransition>
  );
}
