import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard: authenticates the request when a valid JWT is present
 * (cookie `supervision_token` or Bearer token), but NEVER rejects anonymous
 * requests. `request.user` will be populated for authenticated callers and
 * left as `undefined` for anonymous ones.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser | undefined {
    return user || undefined;
  }
}
