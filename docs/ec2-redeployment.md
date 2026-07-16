# EC2更新・再デプロイ手順

## 1. 基本方針

更新は次の順序で行う。

```text
事前確認
  -> バックアップ
  -> Gitの更新を取得
  -> Dockerイメージをビルド
  -> (必要な場合) DBマイグレーション
  -> 新コンテナを起動
  -> 動作確認
```

マイグレーションがある場合は、旧backendと新DBスキーマの不整合を避けるため、backendを停止してから適用する。この間は短時間のメンテナンス状態になる。

## 2. 変更内容と必要作業

| 変更 | 再ビルド | 再作成 | マイグレーション |
|---|---|---|---|
| frontendのコード | frontend | frontend | 不要 |
| `frontend/.env` | frontend | frontend | 不要 |
| backendのコード | backend | backend | 通常不要 |
| `backend/.env` | 原則不要 | backend | 不要 |
| Entity・DBカラム・制約 | backend | backend | 必要 |
| マイグレーションファイルの追加 | backend | backend | 必要 |
| `docker-compose.yml` | 変更対象 | 変更対象 | 内容次第 |
| EC2本体のNginx設定 | 不要 | 不要 | 不要 |

Viteの`VITE_*`はビルド時に埋め込まれるため、`frontend/.env`の変更は必ずfrontendを再ビルドする。

## 3. 共通の事前確認

```bash
ssh -i ~/Downloads/your-key.pem ubuntu@<Elastic-IP>
cd /opt/haguruma-store-portal
pwd
git status
docker compose ps
```

`git status`に未コミットの変更がある場合は、すぐに`git pull`しない。EC2上での手修正がGitの変更と衝突する可能性がある。

本来、次のようなアプリ定義はローカルで変更・コミットし、EC2では直接編集しない。

- `docker-compose.yml`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- アプリのソースコード

EC2固有の機密値とOS設定だけをGit管理外にする。

- `backend/.env`
- `frontend/.env`
- `/etc/nginx/sites-available/haguruma-store-portal`
- SSL証明書

## 4. バックアップ

最低限、DBスキーマ変更前は`pg_dump`を取得する。

```bash
mkdir -p ~/backups
docker compose exec -T db pg_dump \
  -U root -d haguruma-store-portal \
  > ~/backups/haguruma-$(date +%Y%m%d-%H%M%S).sql
ls -lh ~/backups
```

- `exec -T`: 仮想端末を作らず、ダンプを標準出力へ流す
- `>`: 左側コマンドの出力をファイルへ保存
- `$(date ...)`: 現在日時をファイル名に埋め込む

DB名とユーザー名は実環境の`POSTGRES_DB`・`POSTGRES_USER`に合わせる。バックアップをEC2内に置いただけではEC2障害に備えられないため、定期的にS3等の別ストレージへ退避する。

## 5. Git変更の確認と取得

リモートの情報だけを先に取得する。

```bash
git fetch origin
git log --oneline --decorate HEAD..origin/main
```

- `fetch`: ワークツリーを書き換えず、リモートの最新情報だけを取得
- `HEAD..origin/main`: 現在のサーバーにはなく、リモート`main`にあるコミットを表示

内容を確認後、分岐を作らず更新できる場合だけ取り込む。

```bash
git pull --ff-only origin main
```

`--ff-only`は、EC2側に独自コミットがあって自動マージが必要な場合に失敗させる。サーバー上で意図しないマージコミットが作られることを防ぐ。

## 6. マイグレーションなしの通常更新

フロント・バックエンドをまとめて確実に更新する標準手順。

```bash
docker compose build --pull
docker compose up -d
docker compose ps
```

- `build`: Dockerfileから新しいイメージを作成
- `--pull`: Dockerfileのベースイメージの更新も確認
- `up -d`: 新イメージと現在のCompose定義でコンテナを再作成・起動

特定サービスだけ更新する場合はサービス名を付ける。

```bash
docker compose up -d --build frontend
```

```bash
docker compose up -d --build backend
```

## 7. マイグレーションありの更新

### 7.1 新イメージを作成

```bash
docker compose build --pull
```

### 7.2 backendを停止

```bash
docker compose stop backend
```

`stop`はコンテナを削除せず、プロセスだけ停止する。DBは停止しない。

### 7.3 新backendイメージでマイグレーション

```bash
docker compose run --rm backend \
  npx typeorm migration:run -d dist/database/data-source.js
```

- `run`: backendサービス定義を使って一時コンテナを実行
- `--rm`: 処理終了後に一時コンテナを削除
- `migration:run`: 未適用マイグレーションだけを適用

成功ログを確認してから次へ進む。失敗した場合は新backendを起動せず、エラー原因を調査する。

### 7.4 新コンテナを起動

```bash
docker compose up -d backend frontend
docker compose ps
```

## 8. Nginx設定の更新

EC2本体のNginx設定を変更した場合は必ず構文検査する。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t`が失敗したら`reload`しない。現在動いているNginxはそのままにして、設定ファイルやシンボリックリンクを修正する。

```bash
ls -l /etc/nginx/sites-available/
ls -l /etc/nginx/sites-enabled/
sudo grep -RIn "paper-order-site" /etc/nginx
```

## 9. 更新後の確認

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 db
curl -I http://127.0.0.1:8080
curl http://127.0.0.1:3000/api/products
curl -I http://<Elastic-IP>
curl http://<Elastic-IP>/api/products
```

ブラウザでは変更箇所に加え、次を回帰確認する。

- トップ画面の表示
- 画像の表示
- 注文送信
- 管理画面のログイン
- 注文一覧・詳細
- 添付ファイル参照
- マスタ管理
- `/admin`直接リロード

## 10. エラー時にまず見る場所

| 症状 | 確認先 |
|---|---|
| サイトに接続できない | セキュリティグループ、`systemctl status nginx`、Nginx error.log |
| 502 Bad Gateway | frontend/backendコンテナの起動状態とポート |
| APIが失敗 | backendログ、`FRONTEND_ORIGIN`、DB接続値 |
| DBエラー | dbログ、DB名・ユーザー・パスワードの一致 |
| `/admin`リロードで404 | `frontend/nginx.conf`の`try_files` |
| API・画像が表示されない | `VITE_API_BASE_URL`に`/api`が含まれるか、Nginxの`/api/`経路 |
| Nginx設定エラー | `sudo nginx -t`のファイル名と行番号、壊れたシンボリックリンク |

## 11. ロールバックの考え方

コードだけの変更なら、以前のコミットを再デプロイできる。DBマイグレーション後は、コードだけを戻すと旧コードと新DBスキーマが不整合になる可能性がある。

- 本番DBで安易に`migration:revert`しない
- 先にバックアップと影響範囲を確認する
- データ破壊を伴う場合はDBバックアップから復元する
- ロールバックではなく、前方互換の修正マイグレーションを追加することも検討する
