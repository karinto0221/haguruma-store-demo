# EC2初回デプロイ手順

## 1. この手順の前提

この手順は、1台のUbuntu EC2上で次の3コンテナをDocker Composeで動かす構成を対象とする。

- `frontend`: Reactのビルド結果をNginxで配信
- `backend`: NestJS API
- `db`: PostgreSQL

外部からはEC2本体のNginxのみに接続し、コンテナのポートは外部公開しない。

```text
Internet
   |
   | TCP 80 / 443
   v
EC2本体のNginx
   |-- frontend -> 127.0.0.1:8080
   `-- backend  -> 127.0.0.1:3000
                         |
                         `-- db:5432 (Docker内部通信)
```

以下の値は実際の環境に置き換える。

```text
Elastic IP: 203.0.113.10
リポジトリ: https://github.com/OWNER/haguruma-store-portal.git
EC2上の配置先: /opt/haguruma-store-portal
```

> IP直打ちのHTTP接続は通信が暗号化されない。実データを扱う前にドメインとHTTPSを設定する。

## 2. AWS側の準備

### 2.1 EC2

- Ubuntu Server 24.04 LTS
- Dockerビルド用に`t3.small`以上を推奨
- EBS 20〜30GB以上
- Elastic IPをEC2に関連付ける

### 2.2 セキュリティグループ

| タイプ | ポート | ソース | 用途 |
|---|---:|---|---|
| SSH | 22 | 管理者のグローバルIP`/32` | SSH接続 |
| HTTP | 80 | `0.0.0.0/0` | HTTP公開・HTTPSへの転送 |
| HTTPS | 443 | `0.0.0.0/0` | HTTPS化後の公開 |

`3000`、`8080`、`5432`、`5433`は開放しない。

## 3. SSH接続

ローカルPCで秘密鍵の権限を制限し、EC2へ接続する。

```bash
chmod 600 ~/Downloads/your-key.pem
ssh -i ~/Downloads/your-key.pem ubuntu@203.0.113.10
```

- `chmod 600`: 所有者だけが鍵を読み書きできるようにする
- `ssh`: 暗号化されたリモートログイン
- `-i`: 利用する秘密鍵を指定

## 4. OSと必要ツールの準備

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx ca-certificates curl
```

- `sudo`: 管理者権限で実行
- `apt update`: インストール可能なパッケージ一覧を更新
- `apt upgrade`: インストール済みパッケージを更新
- `git`: GitHubからコードを取得
- `nginx`: 外部公開の入口とリバースプロキシ
- `curl`: HTTPの動作確認

## 5. Docker EngineとComposeのインストール

Docker公式リポジトリの署名鍵と配布先をUbuntuに登録する。

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Docker本体とComposeプラグインをインストールする。

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

- `systemctl enable`: OS起動時にDockerも自動起動
- `--now`: 今すぐもDockerを起動
- `usermod -aG docker ubuntu`: `ubuntu`ユーザーを`docker`グループに追加

グループ変更を反映するため、一度切断してSSH接続し直す。

```bash
exit
ssh -i ~/Downloads/your-key.pem ubuntu@203.0.113.10
docker version
docker compose version
docker run --rm hello-world
```

## 6. リポジトリの配置

```bash
sudo mkdir -p /opt/haguruma-store-portal
sudo chown ubuntu:ubuntu /opt/haguruma-store-portal
git clone https://github.com/OWNER/haguruma-store-portal.git \
  /opt/haguruma-store-portal
cd /opt/haguruma-store-portal
git status
```

- `mkdir -p`: ディレクトリを作成
- `chown`: ディレクトリの所有者を変更
- `git clone`: リポジトリ全体を取得
- `cd`: 作業ディレクトリを移動

非公開リポジトリはGitHub Deploy Keyまたは読み取り専用トークンを使う。個人用パスワードをサーバーのURLやファイルに直書きしない。

## 7. 環境変数

### 7.1 backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

主な本番値は次のとおり。

```dotenv
PORT=3000
DB_HOST=db
DB_PORT=5432
DB_USER=root
DB_PASSWORD=<十分に長いランダム文字列>
DB_NAME=haguruma-store-portal

ADMIN_USER_ID=<管理者ID>
ADMIN_PASSWORD=<十分に長いランダム文字列>

ADMIN_NOTIFY_EMAIL=<通知先>
SMTP_HOST=<SMTPホスト>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=<SMTPユーザー>
SMTP_PASS=<SMTPパスワード>
MAIL_FROM="HAGURUMA STORE PORTAL <no-reply@example.com>"
MAIL_REPLY_TO=<返信先>

UPLOAD_DIR=/app/uploads
FRONTEND_ORIGIN=http://203.0.113.10
```

`DB_HOST=db`の`db`はDocker Composeのサービス名。コンテナ内で`localhost`を指定するとbackendコンテナ自身を指すため、PostgreSQLへは接続できない。

### 7.2 frontend

```bash
cp frontend/.env.example frontend/.env
nano frontend/.env
```

```dotenv
VITE_API_BASE_URL=/api
```

`VITE_API_BASE_URL`は同一オリジンの`/api`を指定する。ブラウザは現在表示しているIP・ドメインの`/api`へ接続するため、Elastic IPへの変更やHTTPS・ドメイン導入時もこの値を変更する必要はない。ローカル開発時はVite、EC2ではホストNginxが`/api`をバックエンドへ転送する。

Viteの環境変数はfrontendのビルド時にJavaScriptへ埋め込まれる。変更時はコンテナの再起動だけではなく再ビルドする。

```bash
chmod 600 backend/.env frontend/.env
```

`.env`はGitへコミットしない。Gmail SMTPとMailpitの切り替えは`docs/email-delivery.md`を参照する。

### 7.3 DB設定の整合性

次の値は必ず一致させる。

| backend/.env | docker-compose.yml |
|---|---|
| `DB_USER` | `POSTGRES_USER` |
| `DB_PASSWORD` | `POSTGRES_PASSWORD` |
| `DB_NAME` | `POSTGRES_DB` |

現行のサンプルではDB名が異なる可能性があるため、そのまま転記せず必ず確認する。

## 8. Docker Composeの本番向け設定

本番環境では次を守る。

- `db`に`ports`を設定しない
- backendは`127.0.0.1:3000:3000`
- frontendは`127.0.0.1:8080:80`
- 各サービスに`restart: unless-stopped`を設定
- `POSTGRES_PASSWORD`を開発用値から変更

`127.0.0.1`にバインドするとEC2本体からのみ接続でき、インターネットからコンテナのポートへ直接接続できない。

## 9. frontendコンテナのNginx

React RouterのURLを直接開いても`index.html`を返すため、`frontend/nginx.conf`を作成する。

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`frontend/Dockerfile`のNginxステージで設定をコピーする。

```dockerfile
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

これらはEC2上だけで修正せず、リポジトリへコミットして全環境の定義を揃える。

## 10. コンテナの初回起動

```bash
cd /opt/haguruma-store-portal
docker compose config
docker compose up -d --build
docker compose ps
```

- `docker compose config`: Compose設定の解析結果を確認。シークレットも表示され得るため他人に共有しない
- `up`: コンテナを必要に応じて作成・起動
- `-d`: バックグラウンド実行
- `--build`: Dockerfileからイメージを作成し直す
- `ps`: コンテナ状態を表示

## 11. DBマイグレーション

初回起動後に、コンパイル済みのDataSourceを使って未適用マイグレーションを実行する。

```bash
docker compose exec backend \
  npx typeorm migration:run -d dist/database/data-source.js
```

`docker compose up`だけではマイグレーションは実行されない。

## 12. EC2本体のNginx

`/etc/nginx/sites-available/haguruma-store-portal`を作成する。

```nginx
upstream haguruma_frontend {
    server 127.0.0.1:8080;
}

upstream haguruma_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 30M;

    # APIはすべて/api配下に集約する。新しいAPIを追加してもNginxの変更は不要。
    location /api/ {
        proxy_pass http://haguruma_backend;
        include proxy_params;
    }

    location / {
        proxy_pass http://haguruma_frontend;
        include proxy_params;
    }
}
```

設定を有効化する。

```bash
sudo ln -s \
  /etc/nginx/sites-available/haguruma-store-portal \
  /etc/nginx/sites-enabled/haguruma-store-portal
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t`が失敗した場合は`reload`しない。

## 13. 動作確認

EC2内部の接続を先に確認する。

```bash
curl -I http://127.0.0.1:8080
curl http://127.0.0.1:3000/api/products
curl -I http://127.0.0.1:8080/admin
```

Nginx経由を確認する。

```bash
curl -I http://203.0.113.10
curl http://203.0.113.10/api/products
```

ブラウザで次を確認する。

- `/`でカテゴリ・商品画像が表示される
- `/admin`でログインできる
- `/admin`を直接リロードしても404にならない
- 注文作成・添付ファイル確認・ステータス変更ができる

## 14. ログと障害切り分け

```bash
docker compose logs --tail=100 frontend
docker compose logs --tail=100 backend
docker compose logs --tail=100 db
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
```

確認順序は次のとおり。

1. `docker compose ps`でコンテナが起動しているか
2. `127.0.0.1:3000`と`127.0.0.1:8080`にEC2内から接続できるか
3. `sudo nginx -t`が成功するか
4. Elastic IPの80番に外部から接続できるか
5. セキュリティグループの80番が開いているか

## 15. 本番運用前の必須項目

- ドメインとHTTPSを導入する
- PostgreSQLボリュームと`uploads`ボリュームを定期バックアップする
- AWS Budgetsと請求アラートを設定する
- SMTP/SESの送信元を検証する
- ディスク使用量とDockerログを監視する
- Elastic IPが不要になったら関連付け解除だけでなく、Elastic IP自体を解放する
