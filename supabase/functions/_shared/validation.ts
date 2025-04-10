import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export function validateRequest<T>(
  data: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors in a user-friendly way
      const formattedErrors = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      }).join(', ');
      return { success: false, error: formattedErrors };
    }
    return { success: false, error: "Invalid request data" };
  }
} 