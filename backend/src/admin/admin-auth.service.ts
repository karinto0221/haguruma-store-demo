import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { Repository } from "typeorm";
import { AdminAccountEntity } from "./admin-account.entity";
import { AdminSessionEntity } from "./admin-session.entity";

const scrypt = promisify(scryptCallback);
const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_DAYS = 7;

export interface AdminTokenPayload {
  sub: string;
  loginId: string;
  exp: number;
}

@Injectable()
export class AdminAuthService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminAccountEntity)
    private readonly accounts: Repository<AdminAccountEntity>,
    @InjectRepository(AdminSessionEntity)
    private readonly sessions: Repository<AdminSessionEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    if (await this.accounts.count()) return;
    const loginId = process.env.ADMIN_USER_ID;
    const password = process.env.ADMIN_PASSWORD;
    if (!loginId || !password) return;
    await this.accounts.save(
      this.accounts.create({
        loginId,
        name: "管理者",
        passwordHash: await this.hashPassword(password),
        isActive: true,
      }),
    );
  }

  async hashPassword(password: string) {
    const salt = randomBytes(16);
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
  }

  async verifyPassword(password: string, encoded: string) {
    const [algorithm, saltHex, hashHex] = encoded.split(":");
    if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = (await scrypt(
      password,
      Buffer.from(saltHex, "hex"),
      expected.length,
    )) as Buffer;
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  issueAccessToken(account: AdminAccountEntity) {
    return this.jwtService.sign({
      sub: account.id,
      loginId: account.loginId,
    });
  }

  verifyAccessToken(token: string): AdminTokenPayload {
    try {
      const payload = this.jwtService.verify<AdminTokenPayload>(token);
      if (!payload.sub || !payload.loginId || !payload.exp) throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException("認証が必要です");
    }
  }

  private tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async login(loginId: string, password: string) {
    const account = await this.accounts.findOne({ where: { loginId } });
    if (
      !account?.isActive ||
      !(await this.verifyPassword(password, account.passwordHash))
    ) {
      throw new UnauthorizedException(
        "ログインIDまたはパスワードが正しくありません",
      );
    }
    account.lastLoginAt = new Date();
    await this.accounts.save(account);
    return this.createSession(account);
  }

  private async createSession(account: AdminAccountEntity) {
    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.sessions.save(
      this.sessions.create({
        accountId: account.id,
        tokenHash: this.tokenHash(refreshToken),
        expiresAt,
      }),
    );
    return {
      accessToken: this.issueAccessToken(account),
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken,
      account: this.toPublicAccount(account),
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.sessions.findOne({
      where: { tokenHash: this.tokenHash(refreshToken) },
      relations: { account: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.account.isActive
    )
      throw new UnauthorizedException("再ログインしてください");
    session.revokedAt = new Date();
    await this.sessions.save(session);
    return this.createSession(session.account);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const session = await this.sessions.findOne({
      where: { tokenHash: this.tokenHash(refreshToken) },
    });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessions.save(session);
    }
  }

  async requireActiveAccount(id: string) {
    const account = await this.accounts.findOne({ where: { id } });
    if (!account?.isActive)
      throw new UnauthorizedException("アカウントが無効です");
    return account;
  }

  toPublicAccount(account: AdminAccountEntity) {
    const { passwordHash: _passwordHash, ...result } = account;
    return result;
  }
}
