import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// The settings are read when the modules load, so each case imports the app
// afresh, with a database folder of its own.
async function webWith(env: { demo: boolean; token?: string }) {
  vi.resetModules();
  vi.stubEnv("BOWL_DEMO", String(env.demo));
  vi.stubEnv("BOWL_CF_ANALYTICS_TOKEN", env.token ?? "");
  vi.stubEnv("BOWL_TRUST_PROXY", "cloudflare");
  vi.stubEnv("DATA_DIR", mkdtempSync(path.join(tmpdir(), "bowl-analytics-")));
  const { web } = await import("../web.js");
  return web;
}

// Strict, so a field added to the line has to be added here on purpose.
const usageLine = z
  .object({
    type: z.literal("usage"),
    timestamp: z.iso.datetime(),
    route: z.string(),
    status: z.number(),
    visitor: z.string(),
  })
  .strict();

function usageLines() {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  return () =>
    log.mock.calls.map(([line]) => String(line)).filter((line) => line.includes('"type":"usage"'));
}

const visitor = (address: string, userAgent: string) => ({
  "CF-Connecting-IP": address,
  "User-Agent": userAgent,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the demo's usage log", () => {
  it("writes one line per API request, with the route's pattern and a visitor key", async () => {
    const web = await webWith({ demo: true });
    const lines = usageLines();

    await web.request("/api/feeds?petId=7&from=2026-11-02&to=2026-11-02", {
      headers: visitor("203.0.113.7", "Firefox/140"),
    });
    await web.request("/api/feeds", {
      method: "POST",
      headers: { ...visitor("203.0.113.7", "Firefox/140"), "content-type": "application/json" },
      body: JSON.stringify({ petId: 1, note: "Mittens ate the cushion" }),
    });
    await web.request("/api/pets/42", { headers: visitor("198.51.100.9", "Firefox/140") });
    await web.request("/api/nothing-here", { headers: visitor("203.0.113.7", "Firefox/140") });

    const logged = lines().map((line) => usageLine.parse(JSON.parse(line)));
    expect(logged.map(({ route, status }) => `${route} ${status}`)).toEqual([
      "GET /api/feeds 200",
      "POST /api/feeds 400",
      "GET /api/pets/:id 404",
      "GET /api/* 404",
    ]);
    const [first, second, otherAddress] = logged.map(({ visitor: key }) => key);
    expect(first).toBe(second);
    expect(otherAddress).not.toBe(first);
  });

  it("never writes the address, user agent, query values or body", async () => {
    const web = await webWith({ demo: true });
    const lines = usageLines();

    await web.request("/api/feeds?petId=7&from=2026-11-02&to=2026-11-02", {
      method: "POST",
      headers: { ...visitor("203.0.113.7", "Firefox/140"), "content-type": "application/json" },
      body: JSON.stringify({ note: "Mittens ate the cushion" }),
    });

    const [line = ""] = lines();
    for (const secret of ["203.0.113.7", "Firefox", "2026-11-02", "petId", "Mittens"]) {
      expect(line).not.toContain(secret);
    }
  });

  it("gives a visitor a new key when the UTC day changes", async () => {
    const web = await webWith({ demo: true });
    const lines = usageLines();
    vi.useFakeTimers({ toFake: ["Date"] });

    for (const at of ["2026-11-24T23:59:00Z", "2026-11-24T23:59:59Z", "2026-11-25T00:00:00Z"]) {
      vi.setSystemTime(new Date(at));
      await web.request("/api/instance", { headers: visitor("203.0.113.7", "Firefox/140") });
    }

    const [before, stillBefore, after] = lines().map(
      (line) => usageLine.parse(JSON.parse(line)).visitor,
    );
    expect(stillBefore).toBe(before);
    expect(after).not.toBe(before);
  });

  it("leaves out health checks and the app's files", async () => {
    const web = await webWith({ demo: true });
    const lines = usageLines();

    await web.request("/api/health");
    await web.request("/");
    await web.request("/today");
    await web.request("/assets/index-abc123.js");

    expect(lines()).toEqual([]);
  });

  it("writes nothing when the instance isn't the demo", async () => {
    const web = await webWith({ demo: false, token: "cf-token" });
    const lines = usageLines();

    await web.request("/api/pets", { headers: visitor("203.0.113.7", "Firefox/140") });
    await web.request("/api/instance");

    expect(lines()).toEqual([]);
  });
});

async function policyFor(env: { demo: boolean; token?: string }) {
  const web = await webWith(env);
  const response = await web.request("/api/instance");
  return {
    policy: response.headers.get("Content-Security-Policy") ?? "",
    instance: z.object({ analyticsToken: z.string().nullable() }).parse(await response.json()),
  };
}

describe("Cloudflare Web Analytics", () => {
  it("lets the demo load Cloudflare's beacon and report to it when a token is set", async () => {
    const { policy, instance } = await policyFor({ demo: true, token: "cf-token" });

    expect(policy).toContain("script-src 'self' https://static.cloudflareinsights.com");
    expect(policy).toContain("connect-src 'self' https://cloudflareinsights.com");
    expect(instance.analyticsToken).toBe("cf-token");
  });

  it.each([
    { name: "the demo without a token", env: { demo: true } },
    { name: "an instance that isn't the demo", env: { demo: false, token: "cf-token" } },
  ])("keeps the beacon out of $name", async ({ env }) => {
    const { policy, instance } = await policyFor(env);

    expect(policy).not.toContain("cloudflareinsights");
    expect(instance.analyticsToken).toBeNull();
  });
});
