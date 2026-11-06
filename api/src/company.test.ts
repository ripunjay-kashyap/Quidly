import { describe, expect, it } from "vitest";
import { normalizeWebsite, websiteIsReachable } from "./company.ts";

describe("company website checks", () => {
  it("keeps only the site's origin and refuses other protocols", () => {
    expect(normalizeWebsite("https://example.com/careers?x=1")).toBe("https://example.com");
    expect(normalizeWebsite("ftp://example.com")).toBeUndefined();
    expect(normalizeWebsite("example.com")).toBeUndefined();
  });

  it("refuses private and local addresses without fetching them", async () => {
    expect(await websiteIsReachable("http://127.0.0.1:4000")).toBe(false);
    expect(await websiteIsReachable("http://localhost")).toBe(false);
    expect(await websiteIsReachable("http://192.168.1.1")).toBe(false);
    expect(await websiteIsReachable("http://[::1]")).toBe(false);
  });
});
