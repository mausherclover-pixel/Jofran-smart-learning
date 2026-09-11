import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// @Public() opts a route out of the global JwtAuthGuard — login, refresh,
// OAuth callbacks, and health checks are the only routes that should use it.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
