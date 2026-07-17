# DB設計書

対象: PostgreSQL 16(`docker-compose.yml`の`db`サービス)。ORM: TypeORM 0.3(`backend/src/orders/order.entity.ts`, `backend/src/products/product.entity.ts`, `backend/src/products/product-category.entity.ts`)。
スキーマは`synchronize: false`で運用し、`backend/src/database/migrations/`配下のマイグレーションファイルのみで変更する。

## 1. ER図

```
┌───────────────────────┐         ┌────────────────────┐         ┌─────────────────────────────┐
│ product_categories      │         │ products            │         │ orders                       │
├───────────────────────┤ 1     N ├────────────────────┤ 1     N ├─────────────────────────────┤
│ PK id (serial)           │◄────────│ FK product_category_id│         │ FK product_id (varchar)       │
│    name                   │         │ PK id (varchar)      │◄────────│ PK id (uuid)                  │
│    image_data (bytea)     │         │    image_data (bytea) │         │    customer_phone             │
│    created_at             │         │    name               │         │    customer_name              │
│    updated_at             │         │    description        │         │    customer_email             │
└───────────────────────┘         │    price_from         │         │    quantity                   │
                                     │    created_at         │         │    total_price                │
                                     │    updated_at         │         │    notes                      │
                                     └────────────────────┘         │    file_names (text[])        │
                                                                       │    file_paths (text[])        │
                                                                       │    status (enum)              │
                                                                       │    payment_link               │
                                                                       │    created_at                 │
                                                                       │    updated_at                 │
                                                                       └─────────────────────────────┘
```

- `orders.product_id` → `products.id` の外部キー。`ON DELETE RESTRICT`(商品削除時、参照している注文が1件でもあれば商品削除は失敗する)。
- `products.product_category_id` → `product_categories.id` の外部キー。`ON DELETE RESTRICT`(カテゴリ削除時、参照している商品が1件でもあればカテゴリ削除は失敗する)。
- 商品名(`productName`)は`orders`側に非正規化して持たず、API応答時に`products`をJOINして都度取得する(`OrdersRepository.findAll`/`findById`で`leftJoinAndSelect`)。カテゴリ名も同様に`products`側へ非正規化していない。

## 2. テーブル定義

### 2.1 product_categories(商品カテゴリマスタ)

| カラム名        | 型              | NULL     | デフォルト | 説明                                                               |
| --------------- | --------------- | -------- | ---------- | ------------------------------------------------------------------ |
| id              | serial(integer) | NOT NULL | 自動採番   | 主キー                                                             |
| name            | varchar(255)    | NOT NULL | -          | カテゴリ名                                                         |
| image_data      | bytea           | NULL可   | -          | カテゴリ画像のバイナリ。API一覧では返さず画像取得APIのみで読み込む |
| image_mime_type | varchar(100)    | NULL可   | -          | 画像のMIMEタイプ(`image/jpeg`等)                                   |
| created_at      | timestamptz     | NOT NULL | now()      | 作成日時                                                           |
| updated_at      | timestamptz     | NOT NULL | now()      | 更新日時(TypeORMの`@UpdateDateColumn`により自動更新)               |

- 主キー制約: `PK_product_categories_id` (id)
- 初期データ(9件、`id`は投入順の連番): 封筒・袋 / パッケージ・箱・フォルダー / 名刺 / カード・ペーパー / 冊子・ブックレット・ZINE / ポケットフォルダー / ペーパータグ・下げ札 / シール・ステッカー・商品ラベル / ラッピングペーパー・薄葉紙
- カテゴリの追加・編集・削除は管理画面(`/admin/master/product-categories`)から`GET/POST/PATCH/DELETE /api/product-categories`経由で行える(API定義書3.10〜3.13参照)。参照している商品が残っている状態での削除は外部キー制約により失敗する。

### 2.2 products(商品マスタ)

| カラム名            | 型           | NULL     | デフォルト | 説明                                                                                        |
| ------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------- |
| id                  | varchar(50)  | NOT NULL | -          | 主キー。スラッグ形式の文字列ID(例: `business-card`)。URLや`orders.product_id`から参照される |
| name                | varchar(255) | NOT NULL | -          | 商品名                                                                                      |
| description         | text         | NOT NULL | -          | 商品説明                                                                                    |
| price_from          | integer      | NOT NULL | -          | 参考価格(円)。実際は数量・仕様で変動する目安価格                                            |
| product_category_id | integer      | NOT NULL | -          | `product_categories.id`への外部キー                                                         |
| image_data          | bytea        | NULL可   | -          | 商品画像のバイナリ。API一覧では返さず画像取得APIのみで読み込む                              |
| image_mime_type     | varchar(100) | NULL可   | -          | 画像のMIMEタイプ                                                                            |
| created_at          | timestamptz  | NOT NULL | now()      | 作成日時                                                                                    |
| updated_at          | timestamptz  | NOT NULL | now()      | 更新日時(TypeORMの`@UpdateDateColumn`により自動更新)                                        |

- 主キー制約: `PK_0806c755e0aca124e67c0cf6d7d` (id)
- 外部キー制約: `FK_products_product_category_id` (product_category_id → product_categories.id, ON DELETE RESTRICT, ON UPDATE NO ACTION)
- 商品の追加・編集・削除は管理画面(`/admin/master/products`)から`GET/POST/PATCH/DELETE /api/products`経由で行える(API定義書3.1、3.7〜3.9参照)。`id`は作成後変更不可。参照している注文が残っている状態での削除は外部キー制約により失敗する。
- `GET /api/products`のAPIレスポンスには`productCategoryId`・`productCategoryName`(`product_categories`とのJOIN結果)が含まれる。このエンドポイントはお客様向け(商品選択画面)と管理画面(商品マスタ一覧)の両方から共通で使われている。

### 2.3 orders(注文)

| カラム名       | 型                 | NULL     | デフォルト | 説明                                                                                       |
| -------------- | ------------------ | -------- | ---------- | ------------------------------------------------------------------------------------------ |
| id             | uuid               | NOT NULL | -          | 主キー。アプリ側(`uuidv4()`)で発行しINSERTする。DB側の自動生成は使用していない             |
| product_id     | varchar(50)        | NOT NULL | -          | `products.id`への外部キー                                                                  |
| customer_name  | varchar(255)       | NOT NULL | -          | 注文者氏名                                                                                 |
| customer_email | varchar(255)       | NOT NULL | -          | 注文者メールアドレス                                                                       |
| customer_phone | varchar(50)        | NULL可   | -          | 注文者電話番号(任意入力)                                                                   |
| quantity       | integer            | NOT NULL | -          | 数量(1以上、DTOバリデーションのみでDB制約は無し)                                           |
| total_price    | integer            | NOT NULL | -          | 注文時点の総額。注文受付時の`products.price_from × quantity`を保存                         |
| notes          | text               | NULL可   | -          | 備考・要望                                                                                 |
| file_names     | text[]             | NOT NULL | `{}`       | アップロードされたファイルの元ファイル名一覧                                               |
| file_paths     | text[]             | NOT NULL | `{}`       | 保存先の相対パス一覧(`UPLOAD_DIR`からの相対パス、`{orderId}/{timestamp}-{sanitized name}`) |
| status         | order_status(enum) | NOT NULL | `'new'`    | 注文ステータス(詳細は2.4)                                                                  |
| payment_link   | text               | NULL可   | -          | 送信済みの支払いリンクURL                                                                  |
| created_at     | timestamptz        | NOT NULL | now()      | 作成日時(注文受付日時)                                                                     |
| updated_at     | timestamptz        | NOT NULL | now()      | 更新日時(TypeORMの`@UpdateDateColumn`により自動更新)                                       |

- 主キー制約: `PK_710e2d4957aa5878dfe94e4ac2f` (id)
- 外部キー制約: `FK_ac832121b6c331b084ecc4121fd` (product_id → products.id, ON DELETE RESTRICT, ON UPDATE NO ACTION)
- `file_names`と`file_paths`は同じ並び順・同じ要素数で対応している(配列インデックスで対応関係を取る設計。DB制約による整合性保証はしておらず、アプリ側のロジックでのみ保たれている)。
- `total_price`は注文受付時に計算して保存するスナップショットであり、その後`products.price_from`を変更しても既存注文の総額は変わらない。0以上のCHECK制約`CHK_orders_total_price_non_negative`を持つ。

### 2.4 order_status(列挙型)

`orders.status`カラムで使用するPostgresのENUM型。

| 値                  | 画面上のラベル | 意味                                                                                                       |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `new`               | 新規注文       | 注文受付直後の初期状態                                                                                     |
| `reviewing`         | 内容確認中     | 管理者が内容確認中であることを手動でマークした状態                                                         |
| `payment_link_sent` | メール送信済み | 支払いリンク送信済み(`POST /api/orders/:id/send-payment-link`実行後に自動遷移。管理画面から手動でもセット可能) |
| `completed`         | 完了           | 管理者が注文対応完了として手動で設定した状態。注文一覧では既定で除外される                                 |
| `cancelled`         | キャンセル     | 管理者が手動でキャンセル扱いにした状態                                                                     |

- ステータス間の遷移に業務ルール上の制約は無く、管理画面からどの値へも自由に変更可能(アプリケーション層・DB層とも遷移制約なし)。

### 2.5 admin_accounts(管理者アカウント)

| カラム名 | 型 | NULL | 説明 |
|---|---|---|---|
| id | uuid | NOT NULL | 主キー、自動採番 |
| login_id | varchar(100) | NOT NULL | 一意なログインID |
| name | varchar(100) | NOT NULL | 管理画面に表示する名前 |
| password_hash | varchar(255) | NOT NULL | scryptによるsalt付きパスワードハッシュ。平文は保存しない |
| is_active | boolean | NOT NULL | ログイン・API利用可否 |
| last_login_at | timestamptz | NULL可 | 最終ログイン成功日時 |
| created_at | timestamptz | NOT NULL | 作成日時 |
| updated_at | timestamptz | NOT NULL | 更新日時 |

初回起動時にレコードが0件の場合だけ、`ADMIN_USER_ID`・`ADMIN_PASSWORD`から初期管理者を1件作成する。以降の管理はアカウント管理画面から行う。

### 2.6 admin_sessions(管理者ログインセッション)

| カラム名 | 型 | NULL | 説明 |
|---|---|---|---|
| id | uuid | NOT NULL | 主キー、自動採番 |
| token_hash | varchar(64) | NOT NULL | リフレッシュトークンのSHA-256ハッシュ、一意 |
| account_id | uuid | NOT NULL | `admin_accounts.id`への外部キー、削除時CASCADE |
| expires_at | timestamptz | NOT NULL | セッション有効期限 |
| revoked_at | timestamptz | NULL可 | ログアウト・再発行・無効化による失効日時 |
| created_at | timestamptz | NOT NULL | 作成日時 |

リフレッシュトークン本体はDBへ保存せず、HttpOnly Cookieとハッシュの照合で検証する。再発行時は使用済みセッションを失効し、新しいトークンへローテーションする。

## 3. インデックス一覧

| インデックス名                 | テーブル           | 対象カラム | 種別                                      |
| ------------------------------ | ------------------ | ---------- | ----------------------------------------- |
| PK_product_categories_id       | product_categories | id         | PRIMARY KEY                               |
| PK_0806c755e0aca124e67c0cf6d7d | products           | id         | PRIMARY KEY                               |
| PK_710e2d4957aa5878dfe94e4ac2f | orders             | id         | PRIMARY KEY                               |
| IDX_775c9f06fc27ae3ff8fb26f2c4 | orders             | status     | INDEX(完全一致検索・ステータス絞り込み用) |
| IDX_c884e321f927d5b86aac7c8f9e | orders             | created_at | INDEX(期間絞り込み・ソート用)             |
| UQ_admin_accounts_login_id | admin_accounts | login_id | UNIQUE |
| IDX_admin_sessions_token_hash | admin_sessions | token_hash | UNIQUE |
| IDX_admin_sessions_account_id | admin_sessions | account_id | INDEX |

- `products.product_category_id`、`orders.product_id`はFK制約のみでインデックスは付与していない(現状カテゴリ・商品ごとの絞り込みクエリが無いため)。

- キーワード検索(顧客名・メール・商品名・注文IDの部分一致)は`ILIKE '%keyword%'`の前方ワイルドカード無し検索のため、上記インデックスは効かず全件スキャンになる(現状は許容。将来的に検索対象データが増える場合は`pg_trgm`拡張+GINインデックス等の追加を検討)。

## 4. マイグレーション履歴

| ファイル                                            | 内容                                                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1783676979855-InitSchema.ts`                       | `products`テーブル、`order_status`型、`orders`テーブル、上記インデックス・外部キーを作成                                                                                  |
| `1783676979856-SeedProducts.ts`                     | `backend/src/products/product.data.ts`に定義された初期商品5件(名刺・封筒・ポストカード・ラッピングペーパー・パッケージボックス)を`products`にINSERT                       |
| `1783908720243-AddProductCategories.ts`             | `product_categories`テーブルを新設し初期カテゴリ9件をINSERT。`products`に`product_category_id`列を追加し、既存5商品にカテゴリを割り当てた上でNOT NULL制約・外部キーを付与 |
| `1783910000000-AddCatalogImagesAndCustomerPhone.ts` | `product_categories`・`products`に画像バイナリ/MIME列を追加し、`orders`に任意の電話番号列を追加                                                                           |
| `1783911000000-AddCompletedOrderStatus.ts`          | PostgreSQL ENUM `order_status`へ`completed`を追加。ロールバック時は`completed`の注文を`reviewing`へ戻してENUMを再作成                                                     |
| `1784080000000-AddOrderTotalPrice.ts`               | `orders.total_price`を追加。既存注文はマイグレーション実行時点の`products.price_from × quantity`で補完し、NOT NULL・0以上のCHECK制約を設定                                 |
| `1784250000000-AddAdminAccountsAndSessions.ts` | `admin_accounts`・`admin_sessions`を追加し、複数管理者と失効可能なリフレッシュセッションに対応 |

運用コマンド(`backend/package.json`):

```
npm run migration:generate -- src/database/migrations/<名前>   # エンティティとDBの差分からマイグレーションを自動生成
npm run migration:run                                          # 未実行のマイグレーションを適用
npm run migration:revert                                       # 直近のマイグレーションを1件ロールバック
```

接続先はTypeORMの共通設定ファイル`backend/src/database/data-source.ts`で管理し、CLIとアプリ本体(`app.module.ts`の`TypeOrmModule.forRoot`)の両方から同じ設定を参照する。

## 5. 接続設定(環境変数)

| 変数名      | 説明           | ローカル既定値                                                         |
| ----------- | -------------- | ---------------------------------------------------------------------- |
| DB_HOST     | 接続先ホスト   | `localhost`(docker-compose経由でbackendコンテナから接続する場合は`db`) |
| DB_PORT     | 接続先ポート   | `5433`(ホスト公開ポート。コンテナ間通信では`5432`)                     |
| DB_USER     | ユーザー名     | `root`                                                                 |
| DB_PASSWORD | パスワード     | `password`                                                             |
| DB_NAME     | データベース名 | `haguruma-store-portal`                                                |

## 6. 現状の制約・今後の検討事項

- 管理者アカウントは`admin_accounts`で複数管理し、`ADMIN_USER_ID`・`ADMIN_PASSWORD`は初回アカウント作成時だけ使用する。
- お客様向け画面はカテゴリ選択後、取得済みの商品一覧を`product_category_id`でフロント側絞り込みして表示する。専用のカテゴリ別商品APIは無い。
- カテゴリ画像・商品画像は現時点ではDBの`bytea`列に保存する。公開APIは画像本体を一覧JSONへ埋め込まず、専用画像URLを返す。将来S3等へ移行する場合はこのURL契約を維持しつつ保存・配信実装を差し替える想定。
- アップロードファイルの実体(バイナリ)はDBに保存されておらず、`UPLOAD_DIR`配下のローカルディスクに保存される。`orders.file_paths`はその参照パスのみを保持する。
- `quantity`が1以上であることのDB制約(CHECK制約)は無く、アプリケーション層(DTOバリデーション)のみで担保している。
- 論理削除の仕組みは無い(注文・商品・商品カテゴリともに物理削除のみ。削除時は`ON DELETE RESTRICT`により参照整合性を保っている)。
- 商品作成時の`id`重複チェックはDBの一意制約違反(`23505`)をアプリ層で捕捉して409を返す方式。TypeORMの`repository.save()`は主キーが既存だとUPDATEになってしまうため、`repository.insert()`を使う必要がある点に注意(`backend/src/products/products.service.ts`の`create()`参照。過去に`save()`を使っていて既存商品を上書きしてしまう不具合があった)。
