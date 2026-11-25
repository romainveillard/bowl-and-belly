import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Read when the modules load, so set before importing them.
delete process.env.BOWL_PASSWORD;
process.env.BOWL_HOSTS = " Pets.Example.org ,nas.home.arpa";
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-hosts-"));
const { web } = await import("../web.js");

const statusFor = async (url: string) => (await web.request(url)).status;

describe("without a password", () => {
  it("answers localhost, IP addresses and the listed names, port or not", async () => {
    const statuses = await Promise.all(
      [
        "http://localhost:3000/api/health",
        "http://127.0.0.1/api/health",
        "http://192.168.1.20:3000/api/health",
        "http://[::1]:3000/api/health",
        "http://pets.example.org/api/health",
        "http://NAS.home.arpa:3000/api/health",
      ].map(statusFor),
    );

    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
  });

  it("refuses any other name, for the API and the pages alike", async () => {
    const responses = await Promise.all(
      [
        "http://attacker.example:3000/api/settings",
        "http://attacker.example:3000/",
        "http://pets.example.org.attacker.example/api/settings",
      ].map(async (url) => {
        const response = await web.request(url);
        return [response.status, await response.json()];
      }),
    );

    expect(responses).toEqual(Array.from({ length: 3 }, () => [403, { code: "forbidden" }]));
  });
});
