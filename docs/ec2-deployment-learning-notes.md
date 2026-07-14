# EC2デプロイ学習メモ

## 1. デプロイとは

デプロイは、ソースコードをサーバーへコピーすることだけではない。

```text
コードを取得
  -> 環境固有設定を準備
  -> 実行可能な形にビルド
  -> DB構造を更新
  -> プロセスを起動
  -> 外部からの接続経路を作る
  -> 動作確認
```

これら全体がデプロイである。

## 2. IPアドレスの種類

### 2.1 プライベートIP

VPCやDockerネットワーク内だけで使うIP。インターネットから直接接続できない。

```text
EC2のプライベートIP: 10.x.x.xなど
DockerコンテナIP: 172.x.x.xなど
```

DockerコンテナIPは再作成で変わり得るため、通常はIPを直書きせずComposeのサービス名を使う。

```dotenv
DB_HOST=db
```

### 2.2 パブリックIP

インターネットからEC2に接続するためのIP。自動割り当てのIPはEC2を停止・起動すると変わる可能性がある。

### 2.3 Elastic IP

AWSアカウントに割り当て、EC2へ関連付ける固定パブリックIPv4。EC2を停止・起動しても同じIPを利用できる。

- SSH接続先を固定できる
- DNSのAレコードを固定できる
- frontend/backendの公開URLが変わらない
- 使用中でも未使用でもパブリックIPv4課金の対象になり得る

## 3. OriginとCORS

Originは次の3要素の組み合わせ。

```text
スキーム + ホスト + ポート
```

```text
http://203.0.113.10
https://example.com
http://localhost:5173
```

`http`と`https`は別Origin。ポートが違う場合も別Origin。

`FRONTEND_ORIGIN`にはコンテナのプライベートIPではなく、利用者のブラウザが実際に開くURLを指定する。

```dotenv
FRONTEND_ORIGIN=http://203.0.113.10
```

CORSはブラウザに対するルールであり、セキュリティグループやファイアウォールの代わりではない。

## 4. セキュリティグループ

セキュリティグループはEC2の外側にある仮想ファイアウォール。

### インバウンド

EC2へ入ってくる通信を制御する。

```text
22  -> 管理者IPだけ
80  -> 全世界
443 -> 全世界
```

### アウトバウンド

EC2から外へ出る通信を制御する。GitHub、Docker Hub、Ubuntuリポジトリ、SMTP等へ接続するため、当面はデフォルトの全許可でよい。

セキュリティグループはステートフルなため、許可されたインバウンド通信への返答は自動的に許可される。

## 5. ポートとバインド

ポートは1台のマシン内で接続先のプロセスを区別する番号。

```text
22   SSH
80   HTTP
443  HTTPS
3000 backend
8080 frontendコンテナ
5432 PostgreSQL
```

Docker Composeの次の設定は、EC2本体の`127.0.0.1:3000`をコンテナの`3000`番へ接続する。

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

```text
ホストの待受IP : ホストのポート : コンテナのポート
```

`127.0.0.1`はそのマシン自身だけを表すループバックアドレス。`0.0.0.0:3000:3000`や`3000:3000`は全インターフェースで待ち受けるため、セキュリティグループの開放と組み合わせると外部から直接接続され得る。

## 6. Nginxとリバースプロキシ

Nginxはブラウザの接続を最初に受け、URLに応じて内部サービスへ中継する。これをリバースプロキシと呼ぶ。

```text
/products             -> backend
/product-categories   -> backend
/orders               -> backend
/admin/login          -> backend
それ以外               -> frontend
```

入口をNginxに統一するメリット:

- 外部公開ポートを80・443に限定できる
- SSL証明書を1か所で管理できる
- アクセスログ、アップロード上限、タイムアウトを集約できる
- frontend・backendの内部ポートを利用者に見せない

## 7. 今回Nginxが2つある理由

```text
EC2本体のNginx
  -> 公開入口、振り分け、将来のHTTPS

frontendコンテナ内のNginx
  -> ReactのHTML/CSS/JavaScript配信、SPAフォールバック
```

frontendコンテナの次の設定は、実ファイルが無いURLでも`index.html`を返す。

```nginx
try_files $uri $uri/ /index.html;
```

React Routerはブラウザ側で`/admin`等のURLを解釈するため、Nginxが最初に`index.html`を返す必要がある。

## 8. Ubuntu Nginxの設定構造

```text
/etc/nginx/nginx.conf
  |
  `-- include /etc/nginx/sites-enabled/*;
                         |
                         `-- haguruma-store-portal (シンボリックリンク)
                                      |
                                      `-- /etc/nginx/sites-available/haguruma-store-portal
```

- `sites-available`: 作成済み設定の保管場所
- `sites-enabled`: 現在有効にする設定のリンクを置く場所
- `nginx.conf`: `sites-enabled/*`を読み込むメイン設定

## 9. シンボリックリンク

シンボリックリンクは、実ファイルの内容をコピーせず、実ファイルのパスを指し示す別名・ショートカット。

```bash
sudo ln -s \
  /etc/nginx/sites-available/haguruma-store-portal \
  /etc/nginx/sites-enabled/haguruma-store-portal
```

```text
ln -s <リンク先の実物> <作成するリンク>
```

確認すると矢印で表示される。

```bash
ls -l /etc/nginx/sites-enabled/
```

```text
haguruma-store-portal -> /etc/nginx/sites-available/haguruma-store-portal
```

`sites-enabled`側のリンクを削除しても、`sites-available`側の実ファイルは残る。

```bash
sudo rm /etc/nginx/sites-enabled/haguruma-store-portal
```

実ファイルの名前だけを変更すると、リンクは古いパスを指し続ける。これが壊れたシンボリックリンク。

```text
sites-enabled/paper-order-site
  -> sites-available/paper-order-site (存在しない)
```

この状態では`nginx -t`が`No such file or directory`で失敗する。

## 10. Dockerの基本概念

### 10.1 Dockerfile

1つのイメージをどのように作るかを定義する設計図。

### 10.2 イメージ

アプリ、実行環境、必要ファイルを固めた読み取り中心のテンプレート。

### 10.3 コンテナ

イメージから作られた実行中のプロセス。イメージを再ビルドしただけでは実行中コンテナは入れ替わらない。`docker compose up -d`で新イメージを使うコンテナへ再作成する。

### 10.4 ボリューム

コンテナを削除・再作成しても残すデータ領域。

```text
postgres-data -> PostgreSQLデータ
uploads       -> 注文添付ファイル
```

`docker compose down` では通常ボリュームは残るが、`docker compose down -v`はボリュームも削除する。本番環境では安易に`-v`を使わない。

### 10.5 Docker Compose

複数コンテナの起動方法、環境変数、ポート、ボリューム、依存関係を1ファイルで定義する。同じComposeプロジェクト内のサービスはサービス名で通信できる。

```text
backend -> db:5432
```

## 11. 環境変数の読まれるタイミング

### backend

backendの`.env`は実行時に読まれる。変更後はbackendコンテナの再作成が必要。

```bash
docker compose up -d --force-recreate backend
```

### frontend

Viteの`VITE_*`はビルド時に配信用JavaScriptへ埋め込まれる。コンテナを再起動するだけでは変わらない。

```bash
docker compose up -d --build frontend
```

機密情報を`VITE_*`に入れない。frontendのJavaScriptは利用者のブラウザへ配信されるため、内容を誰でも読める。

## 12. DBマイグレーション

マイグレーションは、DBの構造変更を履歴付きで順番に適用する仕組み。

```text
カラム追加
テーブル追加
制約変更
インデックス追加
初期データ追加
```

Entityのコードを変更しただけでは本番DBは変わらない。本プロジェクトは` synchronize: false`のため、必ずマイグレーションを実行する。

```bash
docker compose exec backend \
  npx typeorm migration:run -d dist/database/data-source.js
```

適用済みマイグレーションはTypeORMの管理テーブルに記録され、再実行時は未適用分だけが実行される。

## 13. よく使うLinuxコマンド

| コマンド | 意味 |
|---|---|
| `pwd` | 現在のディレクトリを表示 |
| `ls -la` | 隠しファイル・権限・所有者を含めて一覧表示 |
| `cd <path>` | 作業ディレクトリを移動 |
| `cp <src> <dest>` | ファイルをコピー |
| `mv <src> <dest>` | ファイルを移動・改名 |
| `rm <path>` | ファイルを削除。ゴミ箱に入らない |
| `mkdir -p <path>` | ディレクトリを作成 |
| `nano <path>` | テキストエディタで開く |
| `sed -n '1,120p' <file>` | ファイルの1〜120行を表示 |
| `grep -RIn <word> <dir>` | ディレクトリ内を再帰的に文字列検索 |
| `chmod` | ファイル権限を変更 |
| `chown` | 所有者・所有グループを変更 |
| `sudo` | 管理者権限で実行 |
| `systemctl status <service>` | サービスの状態を確認 |
| `systemctl reload <service>` | サービスを停止せず設定を再読み込み |
| `curl <url>` | HTTPリクエストを送信 |
| `tail -n 100 <file>` | ファイルの最後100行を表示 |

`rm`、`docker compose down -v`、DB変更コマンドは、対象とバックアップを確認してから実行する。

## 14. トラブルシューティングの考え方

いきなり外部アクセス全体を調べず、内側から外側へ順番に確認する。

```text
1. プロセス・コンテナは起動しているか
2. EC2内の127.0.0.1経由で接続できるか
3. Nginxが内部サービスへ中継できるか
4. EC2本体の80/443番で待ち受けているか
5. セキュリティグループが許可しているか
6. DNSが正しいIPを向いているか
```

主な確認コマンド:

```bash
docker compose ps
docker compose logs --tail=100 backend
curl http://127.0.0.1:3000/products
curl -I http://127.0.0.1:8080
sudo nginx -t
sudo systemctl status nginx
sudo tail -n 100 /var/log/nginx/error.log
```

HTTPステータスの代表例:

| ステータス | 意味 |
|---:|---|
| 200 | 成功 |
| 301/302 | 別URLへリダイレクト |
| 400 | リクエスト不正 |
| 401 | 認証失敗 |
| 403 | アクセス拒否 |
| 404 | URLまたはファイルが見つからない |
| 413 | Nginx等のアップロード上限超過 |
| 500 | アプリ内部エラー |
| 502 | Nginxがfrontend/backendへ接続できない |
| 504 | 中継先の応答タイムアウト |
