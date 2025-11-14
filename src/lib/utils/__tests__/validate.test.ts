import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateRequest } from "../validate";

describe("validateRequest", () => {
  it("parses and validates request body", async () => {
    const schema = z.object({ name: z.string().min(2) });
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "Mercimek" }),
    });

    const result = await validateRequest(req, schema);
    expect(result.name).toBe("Mercimek");
  });

  it("throws when validation fails", async () => {
    const schema = z.object({ count: z.number().int().positive() });
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ count: -2 }),
    });

    await expect(validateRequest(req, schema)).rejects.toThrow();
  });
});

