import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public (skip authentication)
 * Use this for routes that don't require authentication like sign-up and sign-in
 *
 * @example
 * @Public()
 * @Post('sign-up')
 * signUp() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
