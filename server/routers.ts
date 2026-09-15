import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createTour, getPublishedTourBySlug } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  tours: router({
    create: publicProcedure
      .input(z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(5000).optional(),
        coverImageUrl: z.string().trim().max(1024).refine(
          (value) => value.startsWith("/") || value.startsWith("https://"),
          "Cover image must be an absolute HTTPS URL or an internal asset path",
        ).optional(),
        propertyData: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input }) => {
        const slug = `scan-${nanoid(10).toLowerCase()}`;
        const tour = await createTour({
          slug,
          title: input.title,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          propertyData: input.propertyData,
          isPublished: 1,
        });
        return { slug: tour.slug, title: tour.title };
      }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }))
      .query(async ({ input }) => {
        const tour = await getPublishedTourBySlug(input.slug);
        return tour ?? null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
