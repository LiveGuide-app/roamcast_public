export class TourError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TourError';
  }
}

export function handleTourError(error: unknown): string {
  if (error instanceof TourError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
} 