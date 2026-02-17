import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

// Organization access mapping
const ORG_ACCESS: Record<string, string[]> = {
  [Role.SUPER_ADMIN]: ['uac', 'mbcs', 'mec'],
  [Role.DIRECTOR]: ['uac', 'mbcs', 'mec'],
  [Role.ACCOUNTANT_UAC]: ['uac'],
  [Role.ACCOUNTANT_MBCS]: ['mbcs'],
  [Role.ACCOUNTANT_MEC]: ['mec'],
};

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Extract organization from URL path (e.g., /api/uac/students -> 'uac')
    const path: string = request.url;
    const orgMatch = path.match(/\/(uac|mbcs|mec)\//);

    // If no organization in path, allow access (for non-org-specific routes)
    if (!orgMatch) {
      return true;
    }

    const requestedOrg = orgMatch[1];
    const allowedOrgs = ORG_ACCESS[user.role] || [];

    if (!allowedOrgs.includes(requestedOrg)) {
      throw new ForbiddenException(
        `You do not have access to ${requestedOrg.toUpperCase()} organization`,
      );
    }

    return true;
  }
}
