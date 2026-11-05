import { describe, expect, it } from "vitest";
import { readsAsSentences } from "./feedback.ts";

describe("readsAsSentences", () => {
  it("blocks a keyword list", () => {
    expect(readsAsSentences("Go Postgres Kubernetes AWS Lambda on-call backend engineer fintech migration.")).toBe(
      false,
    );
  });

  it("passes specific written feedback", () => {
    expect(
      readsAsSentences(
        "Your payment API experience in Go fits well, but we need hands-on Kubernetes operations, and your cloud work appears limited to AWS Lambda.",
      ),
    ).toBe(true);
  });
});
