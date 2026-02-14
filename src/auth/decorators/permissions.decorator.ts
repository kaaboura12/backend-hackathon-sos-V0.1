import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * @param permissions - Array of permission strings required to access the route
 *
 * @example
 * @Permissions('REPORT_CREATE', 'REPORT_READ')
 * @Get('reports')
 * getReports() { ... }
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
