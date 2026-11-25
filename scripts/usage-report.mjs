// Summarises the public demo's usage lines per day:
//   docker logs <container> | node scripts/usage-report.mjs

import { createInterface } from "node:readline";

// Today has no route of its own: it loads the day's feeds, as History does,
// but it is the screen every visit starts on.
const FUNNEL = [
  { label: "Loaded Today", route: "GET /api/feeds" },
  { label: "Logged a feed", route: "POST /api/feeds" },
  { label: "Opened Insights", route: "GET /api/insights" },
];
const TOP_ROUTES = 10;

/** @type {Map<string, { routes: Map<string, number>, reached: Map<string, number> }>} */
const days = new Map();

for await (const line of createInterface({ input: process.stdin })) {
  // `docker logs -t` puts a timestamp before each line.
  const start = line.indexOf("{");
  let entry;
  try {
    entry = start === -1 ? null : JSON.parse(line.slice(start));
  } catch {
    continue;
  }
  if (entry?.type !== "usage") {
    continue;
  }
  const day = entry.timestamp.slice(0, 10);
  if (!days.has(day)) {
    days.set(day, { routes: new Map(), reached: new Map() });
  }
  const { routes, reached } = days.get(day);
  routes.set(entry.route, (routes.get(entry.route) ?? 0) + 1);
  // Steps count in order, and only when the request worked. Visitor keys
  // change every day, so the funnel can't follow anyone past midnight.
  const steps = reached.get(entry.visitor) ?? 0;
  const ok = entry.status < 400;
  reached.set(entry.visitor, ok && FUNNEL[steps]?.route === entry.route ? steps + 1 : steps);
}

for (const [day, { routes, reached }] of [...days].toSorted(([a], [b]) => a.localeCompare(b))) {
  console.log(`${day}\n  Visitors: ${reached.size}\n  Top routes:`);
  const top = [...routes].toSorted(([, a], [, b]) => b - a).slice(0, TOP_ROUTES);
  for (const [route, requests] of top) {
    console.log(`    ${String(requests).padStart(6)}  ${route}`);
  }
  console.log("  Funnel:");
  let previous = reached.size;
  FUNNEL.forEach(({ label }, step) => {
    const visitors = [...reached.values()].filter((steps) => steps > step).length;
    const share = previous > 0 ? `${Math.round((visitors / previous) * 100)}%` : "–";
    console.log(`    ${label.padEnd(16)} ${String(visitors).padStart(5)}  ${share}`);
    previous = visitors;
  });
  console.log();
}
