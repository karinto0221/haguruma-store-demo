import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminAuthGuard, AuthenticatedAdminRequest } from '../common/admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-auth.dto';

const COOKIE_NAME = 'haguruma_admin_refresh';

function readCookie(req: Request, name: string) {
  const entry = (req.headers.cookie || '').split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/admin/auth', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

@Controller('admin/auth')
export class AdminController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(input.loginId, input.password);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(readCookie(req, COOKIE_NAME) || '');
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readCookie(req, COOKIE_NAME));
    res.clearCookie(COOKIE_NAME, { path: '/api/admin/auth' });
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async me(@Req() req: AuthenticatedAdminRequest) {
    return this.auth.toPublicAccount(await this.auth.requireActiveAccount(req.admin.sub));
  }
}
