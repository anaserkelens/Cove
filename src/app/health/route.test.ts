import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /health", () => {
  it("returns a safe health payload", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      service: "cove",
    });
    expect(JSON.stringify(body)).not.toMatch(/secret|token|key|SUPABASE/i);
  });
});
