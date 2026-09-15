import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = {
  user: undefined,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} satisfies TrpcContext;

describe("tours public procedures", () => {
  it("rejects malformed public tour slugs before querying the database", async () => {
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tours.getBySlug({ slug: "Not A Valid Slug!" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("accepts a valid slug shape for a missing or unpublished tour", async () => {
    const caller = appRouter.createCaller(ctx);

    // The database-backed helper returns null for an unavailable public tour.
    // This assertion also confirms the public procedure is callable anonymously.
    await expect(caller.tours.getBySlug({ slug: "missing-tour" })).resolves.toBeNull();
  });
});
