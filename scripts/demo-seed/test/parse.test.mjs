// Parsing of the Kwik Floors herringbone products, from the public products.json
// fields (trimmed to what the parser reads). Run: node --test scripts/demo-seed/test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProduct } from "../build-demo-seed.mjs";

const honey = {
  handle: "honey-oak-herringbone-luxury-click-vinyl-flooring-6-5mm",
  title: "Honey Oak Herringbone Luxury Click Vinyl Flooring 6.5mm",
  body_html: `<style>.x{}</style><section><p class="dt-subtitle">Luxury Click Vinyl Flooring · 6.5mm · Painted Bevel Edges</p>
    <p>Bring timeless parquet-inspired style to your home with <strong>Honey Oak Herringbone Luxury Click Vinyl Flooring</strong>. Its warm honey oak tones and distinctive herringbone pattern create an inviting foundation for both classic and contemporary interiors.</p>
    <p>The <strong>painted bevel edges</strong> define each individual plank, giving the pattern greater depth and a beautifully tailored finish. With a <strong>6.5mm overall thickness</strong>, Honey Oak brings together considered detailing and the everyday practicality of luxury click vinyl.</p></section>`,
  variants: [{ title: "Herringbone 122mmx610mm 1.49 m² per box", price: "32.78", compare_at_price: "57.60" }],
  images: [],
};

test("a herringbone board parses to its name, size, thickness and coverage", () => {
  const d = parseProduct(honey, "herringbone");
  assert.equal(d.name, "Honey Oak Herringbone");
  assert.equal(d.slug, "honey-oak-herringbone");
  assert.equal(d.specs.plank_width_mm, 122);
  assert.equal(d.specs.plank_length_mm, 610);
  assert.equal(d.specs.thickness_mm, 6.5);
  assert.equal(d.specs.pack_coverage_m2, 1.49);
  assert.equal(d.specs.format, "Herringbone");
  assert.equal(d.specs.edge, "Painted bevel");
});

test("Kwik Floors prices are never read into the specs", () => {
  const d = parseProduct(honey, "herringbone");
  assert.ok(!JSON.stringify(d).includes("32.78") && !JSON.stringify(d).includes("57.6"));
});

test("a plank keeps its micro bevel and straight-plank format", () => {
  const plank = { ...honey, handle: "x", title: "Keswick Oak Luxury Click Vinyl Flooring 5mm", variants: [{ title: "181mmx1219mm 2.21 m² per box" }] };
  const d = parseProduct(plank);
  assert.equal(d.specs.format, "Straight plank");
  assert.equal(d.specs.edge, "Micro bevel");
});
