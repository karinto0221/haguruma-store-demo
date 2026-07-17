import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAccountEntity } from './admin-account.entity';
import { AdminSessionEntity } from './admin-session.entity';
import { AdminAuthService } from './admin-auth.service';
import { CreateAdminAccountDto, UpdateAdminAccountDto } from './dto/admin-account.dto';

@Injectable()
export class AdminAccountsService {
  constructor(
    @InjectRepository(AdminAccountEntity) private readonly accounts: Repository<AdminAccountEntity>,
    @InjectRepository(AdminSessionEntity) private readonly sessions: Repository<AdminSessionEntity>,
    private readonly auth: AdminAuthService,
  ) {}

  async findAll() {
    const rows = await this.accounts.find({ order: { createdAt: 'ASC' } });
    return rows.map((row) => this.auth.toPublicAccount(row));
  }

  async create(input: CreateAdminAccountDto) {
    if (await this.accounts.exists({ where: { loginId: input.loginId } })) throw new ConflictException('同じログインIDが既に登録されています');
    const account = await this.accounts.save(this.accounts.create({
      loginId: input.loginId,
      name: input.name,
      passwordHash: await this.auth.hashPassword(input.password),
      isActive: true,
    }));
    return this.auth.toPublicAccount(account);
  }

  async update(id: string, input: UpdateAdminAccountDto, currentAccountId: string) {
    const account = await this.get(id);
    if (input.loginId && input.loginId !== account.loginId && await this.accounts.exists({ where: { loginId: input.loginId } })) {
      throw new ConflictException('同じログインIDが既に登録されています');
    }
    if (input.isActive === false) {
      if (id === currentAccountId) throw new BadRequestException('ログイン中のアカウントは無効化できません');
      if (account.isActive && await this.accounts.count({ where: { isActive: true } }) <= 1) throw new BadRequestException('最後の有効な管理者は無効化できません');
    }
    Object.assign(account, input);
    const saved = await this.accounts.save(account);
    if (input.isActive === false) await this.sessions.update({ accountId: id }, { revokedAt: new Date() });
    return this.auth.toPublicAccount(saved);
  }

  async updatePassword(id: string, password: string) {
    const account = await this.get(id);
    account.passwordHash = await this.auth.hashPassword(password);
    const saved = await this.accounts.save(account);
    await this.sessions.update({ accountId: id }, { revokedAt: new Date() });
    return this.auth.toPublicAccount(saved);
  }

  private async get(id: string) {
    const account = await this.accounts.findOne({ where: { id } });
    if (!account) throw new NotFoundException('管理者アカウントが見つかりません');
    return account;
  }
}
