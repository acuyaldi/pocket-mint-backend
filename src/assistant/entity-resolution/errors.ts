export type EntityResolutionErrorCode =
  | 'ENTITY_RESOLUTION_CANDIDATE_LIMIT_EXCEEDED'
  | 'ENTITY_RESOLUTION_CONFIGURATION_ERROR'
  | 'ENTITY_RESOLUTION_FAILED';

export class EntityResolutionError extends Error {
  readonly isOperational = true;

  private constructor(
    message: string,
    readonly statusCode: number,
    readonly code: EntityResolutionErrorCode,
  ) {
    super(message);
    this.name = 'EntityResolutionError';
    Object.setPrototypeOf(this, EntityResolutionError.prototype);
  }

  static candidateLimitExceeded(): EntityResolutionError {
    return new EntityResolutionError(
      'Entity resolution candidate limit exceeded.',
      413,
      'ENTITY_RESOLUTION_CANDIDATE_LIMIT_EXCEEDED',
    );
  }

  static configuration(): EntityResolutionError {
    return new EntityResolutionError(
      'Entity resolution configuration is invalid.',
      500,
      'ENTITY_RESOLUTION_CONFIGURATION_ERROR',
    );
  }

  static failed(): EntityResolutionError {
    return new EntityResolutionError(
      'Entity resolution failed safely.',
      500,
      'ENTITY_RESOLUTION_FAILED',
    );
  }
}
