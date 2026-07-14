# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Instagramリール経由のアクセス向けの、紙製品(名刺・封筒・ポストカード等)のシンプルな注文受付サイト。決済自体は行わず、管理者が注文内容を確認して支払いリンク(Stripe/PayPal/銀行振込など)を貼り付けて送信するところまでを担当する。

```
paper-order-site/
├── backend/   NestJS API (商品API・注文受付・ファイル保存・メール通知・DB)
├── frontend/  React (Vite) の注文フォーム + 簡易管理画面
└── docs/      画面設計書・DB設計書・API定義書(実装の動きを正として記述)
```

## 必須ルール: 設計3点セットの同時更新

**画面・DBスキーマ・APIエンドポイントに変更を加えた場合、同じ変更の中で以下の該当箇所を必ず更新すること。**

- `docs/screen-design.md` — 画面設計書(画面追加・項目変更・遷移変更・バリデーション変更時)
- `docs/db-design.md` — DB設計書(テーブル・カラム・インデックス・制約・マイグレーション追加時)
- `docs/api-definition.md` — API定義書(エンドポイント追加・リクエスト/レスポンス形式・エラー仕様変更時)

これら3つのドキュメントは「あるべき姿」ではなく「今のアプリの実際の動き」を記録することを目的としている。ドキュメントを更新しないままコードだけ変更すると、次にこのリポジトリを触るとき(人間・Claude Code問わず)に誤った前提で作業することになるため、コード変更とドキュメント更新は同じコミット/同じタスクの中で完結させること。挙動に曖昧な点(未実装機能、エラー時の非対称な挙動など)がある場合も、推測で「あるべき姿」を書かず、実際に動かして確認した挙動を記載する。

## コマンド

### backend (`cd backend`)

```
npm install
npm run start:dev      # 開発サーバー起動 (nest start --watch)
npm run build           # 本番ビルド (nest build → dist/)
npm run start:prod      # ビルド済みdistを起動
```

DBマイグレーション(TypeORM。接続設定は`src/database/data-source.ts`):

```
npm run migration:generate -- src/database/migrations/<名前>   # エンティティとDBの差分から自動生成
npm run migration:run                                          # 未実行分を適用
npm run migration:revert                                       # 直近1件をロールバック
```

lint/testスクリプトは現状未整備(package.jsonに定義なし)。

### frontend (`cd frontend`)

```
npm install
npm run dev       # 開発サーバー (http://localhost:5173, /admin が管理画面)
npm run build     # 本番ビルド (vite build)
npm run preview   # ビルド結果のプレビュー
```

### ローカルDB (Docker)

```
docker compose up -d db     # Postgresをホスト5433番で起動(5432は他プロセスと衝突しやすいため回避)
```

backendを`docker compose`経由で起動する場合はコンテナ間通信用に`DB_HOST=db`/`DB_PORT=5432`が`docker-compose.yml`側で上書きされる。ローカルで`npm run start:dev`する場合は`backend/.env`の`DB_HOST=localhost`/`DB_PORT=5433`を使う。

## アーキテクチャ

### フロントエンド: feature単位の責務分離

今後、画面や機能を追加・変更する場合は、実装を`frontend/src/features/<feature-name>/`単位で切り出し、既存featureと同じ責務分離を維持すること。画面の実装を`pages`配下の1ファイルへ詰め込まない。

- `frontend/src/pages/*.tsx`: React Routerから参照する薄いエントリーポイント。原則として対応する`features/<feature-name>`を再エクスポートするだけにする。
- `features/<feature-name>/index.tsx`: ルーティングパラメータの受け取り、hookの呼び出し、`component/`に切り出した子コンポーネントの配置・組み合わせを担当する。詳細なJSXを直接詰め込まず、画面構成が読み取れる薄いコンポーネントにする。
- `features/<feature-name>/component/`: そのfeature内で使用する表示部品を責務ごとのファイルに分けて配置する。まとまりのあるヘッダー、操作領域、一覧、詳細表示などはindexへ直接記述せず、名前を持つコンポーネントとして切り出す。
- `features/<feature-name>/hook/`: API取得、フォーム、状態管理、副作用、画面操作などのロジックをカスタムhookとして分離する。
- `features/<feature-name>/type/`: そのfeature固有のPropsや型定義を配置する。

小規模なfeatureで不要なディレクトリを形式的に作る必要はないが、画面表示・状態管理・部品・型の責務が増えた場合は上記構成へ分割すること。複数featureから利用する汎用部品やロジックは、特定featureへ依存させず、`frontend/src/components/`など適切な共通領域へ配置する。

### バックエンド: 差し替え可能なインターフェース設計

このコードベースの一貫した設計方針は「呼び出し側は抽象化されたクラスのメソッドシグネチャのみに依存し、実装の中身は環境に応じて差し替えられるようにする」こと。将来的な本番移行(AWS)を見据えたもので、以下の3箇所に現れている。

- **`storage/storage.service.ts`**: ファイル保存の抽象化。現在はローカルディスク、本番はS3へ差し替え予定。呼び出し側(`OrdersService`)は`save()`のみ使用。
- **`data/orders.repository.ts`**: 注文データ永続化の抽象化。現在はTypeORM経由でPostgresに保存(以前はJSONファイル保存だったが移行済み)。呼び出し側(`OrdersService`)は`create()`/`findAll()`/`findById()`/`update()`のシグネチャのみに依存する。
- **`common/admin-auth.guard.ts`**: 管理者認証の抽象化。現在は環境変数(`ADMIN_USER_ID`/`ADMIN_PASSWORD`)とヘッダー(`x-admin-id`/`x-admin-password`)を比較するだけの簡易実装。将来Cognito等のJWT検証に差し替える想定でこの1ファイルに認証ロジックを集約している。

新しい永続化先や外部サービスに差し替える際は、これらのクラスの中身だけを変更し、呼び出し側やDTO/コントローラーには手を入れない設計を維持すること。

### データモデルとJOINの扱い

`orders`テーブルは`product_id`で`products`テーブルを参照するのみで、商品名等を非正規化して持たない。`OrdersRepository`が`leftJoinAndSelect`で都度JOINし、APIレスポンス用の`OrderRecord`(`productName`を含むフラットな型)に変換して返す。エンティティ(`OrderEntity`/`ProductEntity`, TypeORMデコレータ)とAPI/内部で使う`OrderRecord`インターフェースは別物であることに注意。

商品(`products`)の作成・編集・削除APIは未実装。商品ラインナップの変更はマイグレーション追加(`backend/src/database/migrations/`)、またはDB直接操作で行う。

### 認証はステートレスなヘッダー方式

管理者向けエンドポイント(`GET /orders`, `PATCH /orders/:id/status`, `POST /orders/:id/send-payment-link`)は、リクエストごとに`x-admin-id`/`x-admin-password`ヘッダーを比較検証するのみで、サーバー側にセッションやトークンの概念は無い。フロントエンドは`AdminAuthProvider`のReact stateとブラウザの`sessionStorage`に認証情報を保持するため、同じタブのリロードではログイン状態を復元する。ログアウトまたはタブを閉じると認証情報は破棄される。

### メール送信のエラーハンドリング

- `createOrder`: DB保存後に、管理者向け新規注文通知とお客様向け注文受付通知を`Promise.allSettled`で独立送信する。片方または両方が失敗しても注文は成立し、失敗を注文ID付きでログに記録して201を返す。
- `sendPaymentLink`: メール送信 → ステータス更新の順で、メール送信が失敗するとステータス更新は実行されない。

この挙動を変更する場合は`docs/api-definition.md`の該当セクション(1.5, 3.2, 3.5)を合わせて更新すること。

## 参照ドキュメント

- `README.md`: セットアップ手順、本番(AWS)デプロイ方針
- `docs/screen-design.md`: 全画面の表示項目・遷移・バリデーション
- `docs/db-design.md`: テーブル定義・ER関係・インデックス・マイグレーション履歴
- `docs/api-definition.md`: 全エンドポイントのリクエスト/レスポンス仕様・エラー仕様
