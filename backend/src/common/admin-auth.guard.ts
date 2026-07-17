import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService, AdminTokenPayload } from '../admin/admin-auth.service';

export interface AuthenticatedAdminRequest extends Request { admin: AdminTokenPayload }

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedAdminRequest>();
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('認証が必要です');
    const payload = this.auth.verifyAccessToken(authorization.slice(7));
    await this.auth.requireActiveAccount(payload.sub);
    req.admin = payload;
    return true;
  }
}
