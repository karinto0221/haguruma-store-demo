import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAccountEntity } from './admin-account.entity';
import { AdminSessionEntity } from './admin-session.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminController } from './admin.controller';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAuthGuard } from '../common/admin-auth.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AdminAccountEntity, AdminSessionEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256', expiresIn: 15 * 60 },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AdminController, AdminAccountsController],
  providers: [AdminAuthService, AdminAccountsService, AdminAuthGuard],
  exports: [AdminAuthService, AdminAuthGuard],
})
export class AdminModule {}
