/** Maps documented HTTP status codes to a short machine-friendly name. */
export const ERROR_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  412: 'Precondition Failed',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/**
 * Domain error carrying an HTTP status. Thrown by services and mapped to the
 * documented `{ success:false, error:{...} }` envelope by `handle()`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: string | string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const BadRequest = (msg: string, detail?: string | string[]) =>
  new ApiError(400, msg, detail);
export const NotFound = (msg: string) => new ApiError(404, msg);
export const Conflict = (msg: string) => new ApiError(409, msg);
