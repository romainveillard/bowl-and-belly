import { expect, it } from "vitest";
import { clientOf, loginLimiter } from "./limiter.js";

it("blocks a key after ten failures within a minute, until they age out", () => {
  const limiter = loginLimiter();
  for (let second = 0; second < 10; second++) {
    expect(limiter.blocked("global", second * 1000)).toBe(false);
    limiter.fail("global", second * 1000);
  }
  expect(limiter.blocked("global", 10_000)).toBe(true);
  // The first failure, at 0 s, is a minute old at 60 s.
  expect(limiter.blocked("global", 60_000)).toBe(false);
});

it("counts each key apart", () => {
  const limiter = loginLimiter();
  for (let i = 0; i < 10; i++) {
    limiter.fail("203.0.113.7", 0);
  }
  expect(limiter.blocked("203.0.113.7", 1000)).toBe(true);
  expect(limiter.blocked("198.51.100.2", 1000)).toBe(false);
});

it("blocks every client once a hundred failures a minute come from many addresses", () => {
  const limiter = loginLimiter();
  for (let i = 0; i < 100; i++) {
    limiter.fail(`198.51.100.${i}`, 0);
  }
  expect(limiter.blocked("203.0.113.7", 1000)).toBe(true);
  expect(limiter.blocked("203.0.113.7", 60_000)).toBe(false);
});

it("counts an IPv6 /64 as one client", () => {
  expect(clientOf("2001:db8:85a3:12:8a2e:370:7334:1")).toBe("2001:db8:85a3:12::/64");
  expect(clientOf("2001:DB8:85A3:0012::9")).toBe("2001:db8:85a3:12::/64");
  expect(clientOf("2001:db8::1")).toBe("2001:db8:0:0::/64");
  expect(clientOf("::ffff:203.0.113.7")).toBe("203.0.113.7");
  expect(clientOf("203.0.113.7")).toBe("203.0.113.7");
});
