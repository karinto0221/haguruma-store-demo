# メール送信設定

## 1. 対応する送信方法

同じ`MailService`を環境変数で切り替え、次の2種類を利用できる。

| 方法 | 用途 | 実際の宛先へ配信 |
|---|---|---|
| Gmail SMTP | 仮運用・少量の実送信確認 | する |
| Mailpit | 件名・宛先・HTML本文の開発確認 | しない |

サイトのHTTP/HTTPSと、backendからSMTPサーバーへの通信は別経路。サイトがHTTPでもSMTP送信は可能だが、実運用では顧客情報と管理者認証情報を保護するためサイトもHTTPS化する。

## 2. Gmail SMTPで実際に送信する

### 2.1 Googleアカウントの準備

Gmailアカウントで2段階認証を有効にし、このアプリ専用のアプリパスワードを発行する。通常のGoogleアカウントパスワードは`SMTP_PASS`へ設定しない。

1. Googleアカウントの「セキュリティ」を開く
2. 2段階認証を有効にする
3. 「アプリパスワード」を開く
4. `haguruma-store-portal`用のアプリパスワードを発行
5. 表示された値をパスワードマネージャー等で保管

Advanced Protectionが有効なGoogleアカウントや、管理者ポリシーで禁止されたGoogle Workspaceではアプリパスワードを使えない場合がある。

### 2.2 backend/.env

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=your-account@gmail.com
SMTP_PASS=<Googleのアプリパスワード>

MAIL_FROM="HAGURUMA STORE PORTAL <your-account@gmail.com>"
MAIL_REPLY_TO=your-account@gmail.com
ADMIN_NOTIFY_EMAIL=your-account@gmail.com
```

- 587番は初期接続後にSTARTTLSで暗号化するため`SMTP_SECURE=false`、`SMTP_REQUIRE_TLS=true`にする
- `SMTP_USER`はGmailアドレス全体
- `SMTP_PASS`は通常のGoogleパスワードではなくアプリパスワード
- Gmailでは`MAIL_FROM`のアドレスを基本的に`SMTP_USER`と同じにする
- `MAIL_REPLY_TO`は注文者が返信したときの宛先

`.env`には機密情報があるためGitへコミットしない。

### 2.3 反映

EC2のDocker Compose環境:

```bash
cd /opt/haguruma-store-portal
docker compose up -d --build --force-recreate backend
docker compose logs -f backend
```

ローカル環境:

```bash
cd backend
npm run start:dev
```

注文すると、次の2通をGmail SMTP経由で送信する。

1. `ADMIN_NOTIFY_EMAIL`宛の新規注文通知
2. 注文者が入力したメールアドレス宛の注文受付通知

注文詳細から支払いURLを送信した場合も、同じGmail SMTPを使う。

### 2.4 制約

Gmail SMTPは仮運用と少量の確認用。

- Google側の送信上限や不正判定の影響を受ける
- 短時間の連続送信は制限される可能性がある
- 到達性、バウンス管理、苦情通知は本番向けメールサービスより弱い
- 安定運用時はAmazon SES等へ移行する

## 3. Mailpitでメール内容を確認する

Mailpitは実際のメールアドレスへ配信せず、受け取ったメールをWeb UIに表示する。

### 3.1 起動

MailpitはCompose profileで必要時だけ起動する。

```bash
docker compose --profile mailpit up -d mailpit
docker compose ps
```

### 3.2 backend/.env

```dotenv
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_REQUIRE_TLS=false
SMTP_USER=
SMTP_PASS=

MAIL_FROM="HAGURUMA STORE PORTAL <no-reply@example.com>"
MAIL_REPLY_TO=
ADMIN_NOTIFY_EMAIL=admin@example.com
```

backendを再作成する。

```bash
docker compose up -d --build --force-recreate backend
```

### 3.3 Web UI

Mailpitの8025番はEC2の`127.0.0.1`だけにバインドする。AWSセキュリティグループで8025番を開放しない。

ローカルPCからSSHトンネルを作る。

```bash
ssh -i ~/Downloads/your-key.pem \
  -L 8025:127.0.0.1:8025 \
  ubuntu@<Elastic-IP>
```

SSH接続を開いたまま、ローカルPCのブラウザで次を開く。

```text
http://localhost:8025
```

### 3.4 Gmailへ戻す

`backend/.env`を2.2のGmail設定に戻し、backendを再作成する。

```bash
docker compose up -d --build --force-recreate backend
docker compose --profile mailpit stop mailpit
```

## 4. 障害切り分け

```bash
docker compose logs --tail=100 backend
docker compose --profile mailpit logs --tail=100 mailpit
```

| 症状 | 主な確認項目 |
|---|---|
| `535 Username and Password not accepted` | Gmailアドレス、アプリパスワード、2段階認証 |
| `ECONNREFUSED mailpit:1025` | Mailpit profileが起動しているか |
| SMTP未設定の警告 | `SMTP_HOST`が空ではないか、backendを再作成したか |
| Gmailの迷惑メールに入る | 送信元、件名、本文、送信頻度を確認 |
| 注文は成功したがメールが無い | backendログで注文ID付きの送信エラーを確認 |

## 5. 機密情報の扱い

- Gmailの通常パスワードをサーバーに保存しない
- アプリパスワードは`backend/.env`のみに保存する
- `backend/.env`をGitにコミットしない
- `chmod 600 backend/.env`で読み取り権限を制限する
- アプリパスワードを画面共有・ログ・チャットへ貼らない
- 漏洩が疑われる場合はGoogleアカウントから即時失効させる

## 6. 参考資料

- [Googleアカウント: アプリパスワード](https://support.google.com/accounts/answer/2461835)
- [Google Workspace: Gmail SMTPサーバー設定](https://support.google.com/a/answer/176600)
- [Mailpit: Dockerイメージ](https://mailpit.axllent.org/docs/install/docker/)
