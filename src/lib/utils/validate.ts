import { ZodSchema } from "zod";

/**
 * Centralized helper to parse + validate JSON requests.
 * Ensures every API endpoint shares the same error surface.
 */
export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const payload = await req.json();
  return schema.parse(payload);
}

