import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

// 簡易的な管理者認証。ヘッダー `x-admin-key` に ADMIN_API_KEY と一致する値が
// 入っていれば管理者操作(注文一覧の閲覧・支払いリンク送信)を許可する。
// 本番でユーザー管理が必要になったら、ここをCognito等のJWT検証に差し替える想定。
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-admin-key'];
    const expected = process.env.ADMIN_API_KEY;

    if (!expected || key !== expected) {
      throw new UnauthorizedException('管理者キーが正しくありません');
    }
    return true;
  }
}
