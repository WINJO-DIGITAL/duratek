// A stand-in for postcodes.io for the locator tests: a handful of postcodes,
// 404 for unknown ones and 500 for one that simulates the service being down.
import { createServer } from "node:http";
const PLACES = { LA94DT: [54.3234, -2.7435], SW1A1AA: [51.501009, -0.141588], AB101AA: [57.1497, -2.0943] };
createServer((req, res) => {
  const m = /^\/postcodes\/(.+)$/.exec(req.url ?? "");
  const pc = m ? decodeURIComponent(m[1]).replace(/\s+/g, "").toUpperCase() : "";
  res.setHeader("content-type", "application/json");
  if (pc === "CF101AA") { res.statusCode = 500; return res.end("{}"); }
  const p = PLACES[pc];
  if (!p) { res.statusCode = 404; return res.end(JSON.stringify({ status: 404, error: "Postcode not found" })); }
  res.end(JSON.stringify({ status: 200, result: { latitude: p[0], longitude: p[1] } }));
}).listen(4010, "127.0.0.1");
