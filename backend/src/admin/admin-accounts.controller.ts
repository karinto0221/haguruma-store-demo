import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, AuthenticatedAdminRequest } from '../common/admin-auth.guard';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateAdminAccountDto, UpdateAdminAccountDto, UpdateAdminPasswordDto } from './dto/admin-account.dto';

@Controller('admin/accounts')
@UseGuards(AdminAuthGuard)
export class AdminAccountsController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @Get() findAll() { return this.accounts.findAll(); }
  @Post() create(@Body() input: CreateAdminAccountDto) { return this.accounts.create(input); }
  @Patch(':id') update(@Param('id') id: string, @Body() input: UpdateAdminAccountDto, @Req() req: AuthenticatedAdminRequest) { return this.accounts.update(id, input, req.admin.sub); }
  @Patch(':id/password') updatePassword(@Param('id') id: string, @Body() input: UpdateAdminPasswordDto) { return this.accounts.updatePassword(id, input.password); }
}
