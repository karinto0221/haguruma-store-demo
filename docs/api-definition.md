# API定義書

対象: `backend/`(NestJS 10)。以下は実装済みエンドポイントを、実際に動作検証した結果を元に記載している。

## 1. 共通仕様

### 1.1 ベースURL

- ローカル: `http://localhost:3000/api`(`.env`の`PORT`で変更可)
- `main.ts`でグローバルプレフィックス`/api`を設定している。各コントローラーの`@Controller()`パスはこの配下に置かれる。
- EC2のNginxは`location /api/`を一律でバックエンドへ転送する。API追加時にパスごとのNginx設定は不要。

### 1.2 認証方式

管理者向けエンドポイント(表2.1で「要」と記載)は`Authorization: Bearer <accessToken>`ヘッダーが必須。

- `POST /api/admin/auth/login`でログインID・パスワードを検証し、有効期間15分の署名付きアクセストークンを返す。
- アクセストークンのHS256署名、`iat`・`exp`付与、署名・有効期限・許可アルゴリズムの検証は`@nestjs/jwt`の`JwtService`へ委譲する。`JWT_SECRET`は`AdminModule`初期化時に必須検証し、未設定の場合はアプリを起動しない。
- リフレッシュトークンは有効期間7日のHttpOnly・SameSite=Strict Cookieとして返し、DBにはSHA-256ハッシュだけを保存する。
- `POST /api/admin/auth/refresh`はCookieを検証してアクセストークンとリフレッシュトークンをローテーションする。
- アカウント無効化、パスワード変更、ログアウト時は該当するDBセッションを失効する。
- 署名鍵は`JWT_SECRET`環境変数から取得する。
- お客様向けエンドポイント(カテゴリ一覧、商品一覧・詳細・画像取得、注文作成)は認証不要。

### 1.3 CORS

`FRONTEND_ORIGIN`環境変数(既定値`http://localhost:5173`)からのオリジンのみ許可し、Cookie送信のためcredentialsを許可している。

### 1.4 リクエストのバリデーション

グローバルに`ValidationPipe({ whitelist: true, transform: true })`を適用している。

- `whitelist: true`: DTOに定義の無いフィールドは、エラーにはならず黙って除去される。
- `transform: true`: パスパラメータ・クエリパラメータ・ボディの型変換(例: `quantity`を数値へ)を自動で行う。
- バリデーション違反時は`400 Bad Request`(詳細は3.1)。

### 1.5 エラーレスポンスの共通形式

| ケース | HTTPステータス | レスポンス例 |
|---|---|---|
| DTOバリデーションエラー | 400 | `{"message":["customerName should not be empty", "..."],"error":"Bad Request","statusCode":400}` |
| 認証エラー | 401 | `{"message":"ユーザーIDまたはパスワードが正しくありません","error":"Unauthorized","statusCode":401}` |
| リソース未検出 | 404 | `{"message":"注文が見つかりません","error":"Not Found","statusCode":404}` |
| 一意制約・外部キー制約違反(商品ID重複、参照が残っている状態での削除など) | 409 | `{"message":"このIDは既に使用されています","error":"Conflict","statusCode":409}` |
| 想定外の例外 | 500 | `{"statusCode":500,"message":"Internal server error"}` |

> **メール送信失敗時の挙動**: `POST /api/orders`は注文保存後に管理者向け新規注文通知とお客様向け注文受付通知を独立して送信する。どちらか、または両方のSMTP送信が失敗しても失敗内容をサーバーログへ記録し、保存済み注文の`orderId`を含む201レスポンスを返す。一方、`POST /api/orders/:id/send-payment-link`はメール送信失敗時に500を返し、ステータスを`payment_link_sent`に更新しない。

---

## 2. エンドポイント一覧

| # | メソッド | パス | 概要 | 認証 |
|---|---|---|---|---|
| 1 | GET | `/api/products` | 商品一覧取得(カテゴリ情報を含む) | 不要 |
| 2 | POST | `/api/orders` | 注文作成 | 不要 |
| 3 | GET | `/api/orders` | 注文一覧取得・検索 | 要 |
| 4 | PATCH | `/api/orders/:id/status` | 注文ステータス変更 | 要 |
| 5 | POST | `/api/orders/:id/send-payment-link` | 支払いリンク送信 | 要 |
| 6 | POST | `/api/admin/auth/login` | 管理者ログイン | 不要 |
| 7 | POST | `/api/products` | 商品を新規作成(マスタ管理) | 要 |
| 8 | PATCH | `/api/products/:id` | 商品を更新(マスタ管理) | 要 |
| 9 | DELETE | `/api/products/:id` | 商品を削除(マスタ管理) | 要 |
| 10 | GET | `/api/product-categories` | 商品カテゴリ一覧取得(購入画面・マスタ管理共通) | 不要 |
| 11 | POST | `/api/product-categories` | 商品カテゴリを新規作成(マスタ管理) | 要 |
| 12 | PATCH | `/api/product-categories/:id` | 商品カテゴリを更新(マスタ管理) | 要 |
| 13 | DELETE | `/api/product-categories/:id` | 商品カテゴリを削除(マスタ管理) | 要 |
| 14 | GET | `/api/products/:id` | 商品詳細取得 | 不要 |
| 15 | GET | `/api/products/:id/image` | 商品画像取得 | 不要 |
| 16 | PUT | `/api/products/:id/image` | 商品画像登録・差し替え | 要 |
| 17 | GET | `/api/product-categories/:id/image` | カテゴリ画像取得 | 不要 |
| 18 | PUT | `/api/product-categories/:id/image` | カテゴリ画像登録・差し替え | 要 |
| 19 | GET | `/api/orders/:id` | 注文詳細取得 | 要 |
| 20 | GET | `/api/orders/:id/files/:fileIndex` | 注文添付ファイル取得 | 要 |
| 21 | POST | `/api/order-analysis` | 個人情報を除外した注文データのAI分析 | 要 |
| 22 | POST | `/api/admin/auth/refresh` | アクセストークン再発行 | Cookie |
| 23 | POST | `/api/admin/auth/logout` | ログアウト | Cookie |
| 24 | GET | `/api/admin/auth/me` | ログイン中のアカウント取得 | 要 |
| 25 | GET | `/api/admin/accounts` | 管理者アカウント一覧 | 要 |
| 26 | POST | `/api/admin/accounts` | 管理者アカウント作成 | 要 |
| 27 | PATCH | `/api/admin/accounts/:id` | 管理者アカウント更新 | 要 |
| 28 | PATCH | `/api/admin/accounts/:id/password` | 管理者パスワード変更 | 要 |

---

## 3. エンドポイント詳細

### 3.1 GET /api/products — 商品一覧取得

- 認証: 不要(お客様向け・管理画面向け共通。カテゴリ名は非公開情報ではないため認証なしで返す)
- リクエストパラメータ: 無し

**レスポンス 200**

```json
[
  {
    "id": "business-card",
    "name": "名刺",
    "description": "デザイン入稿によるオリジナル名刺印刷",
    "priceFrom": 3000,
    "productCategoryId": 3,
    "productCategoryName": "名刺",
    "imageUrl": "/products/business-card/image?v=1783910000000"
  }
]
```

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | 商品ID(スラッグ) |
| name | string | 商品名 |
| description | string | 商品説明 |
| priceFrom | number | 参考価格(円) |
| productCategoryId | number | 商品カテゴリID(`product_categories.id`) |
| productCategoryName | string | 商品カテゴリ名(`products`とJOINして取得) |
| imageUrl | string \| undefined | 画像登録済みの場合のみ存在する相対URL。`v`は更新日時由来のキャッシュ更新値 |

商品は`created_at`昇順で返る(登録順)。並び替え・絞り込みクエリパラメータは無い。

---

### 3.2 POST /api/orders — 注文作成

- 認証: 不要
- Content-Type: `multipart/form-data`

**リクエストフィールド**

| フィールド名 | 型 | 必須 | バリデーション | 説明 |
|---|---|---|---|---|
| productId | string | ○ | 空文字不可 | 商品ID。DBに存在しない場合は404 |
| customerName | string | ○ | 空文字不可 | 注文者氏名 |
| customerEmail | string | ○ | メール形式 | 注文者メールアドレス |
| customerPhone | string | 任意 | 文字列 | 注文者電話番号 |
| quantity | number | ○ | 整数、1以上 | 数量(フォームでは文字列で送られ、サーバー側で数値変換) |
| notes | string | 任意 | - | 備考 |
| files | file(複数) | 任意 | 最大5ファイル、1ファイルあたり最大20MB | デザインファイル。フィールド名は`files`固定。HEIC/HEIF画像はJPEGへ変換して保存 |

**レスポンス 201**

```json
{ "orderId": "403282b4-3cc5-40bb-825e-bddad7117d07" }
```

作成された注文の全項目は返らず、`orderId`のみ返る。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| 必須項目欠落・型不正 | 400 | `{"message":["customerName should not be empty","quantity must not be less than 1"],"error":"Bad Request","statusCode":400}` |
| ファイル数が5件超過 | 400 | `{"message":"Unexpected field","error":"Bad Request","statusCode":400}` |
| productIdに一致する商品が無い | 404 | `{"message":"指定された商品が見つかりません","error":"Not Found","statusCode":404}` |

**処理内容(参考)**

1. `productId`が実在するか確認
2. 商品の`priceFrom × quantity`で注文総額`totalPrice`を計算
3. HEIC/HEIF画像は表示互換性のためJPEGへ変換し、それ以外の添付ファイルとともにディスク(`UPLOAD_DIR/{orderId}/`)へ保存
4. 注文総額を含む注文をDB(`orders`テーブル)に`status: 'new'`で保存
5. `ADMIN_NOTIFY_EMAIL`宛に、注文ID・商品・注文者・数量・備考・添付ファイル名を含む新規注文通知メールを送信
6. `customerEmail`宛に、注文を受け付けたこと、注文ID、商品、数量、後ほど支払い用URLを送ることを記載した注文受付メールを送信

2通のメールは独立して送信する。片方が失敗してももう片方の送信は実行し、失敗は注文IDとともにサーバーログへ記録する。SMTP未設定時は両方ともログ出力のみでスキップする。

---

### 3.3 GET /api/orders — 注文一覧取得・検索

- 認証: 要(`Authorization: Bearer <accessToken>`)

**クエリパラメータ(すべて任意、AND条件)**

| パラメータ | 型 | 説明 |
|---|---|---|
| status | string | `new` / `reviewing` / `payment_link_sent` / `completed` / `cancelled` のいずれか。それ以外の値は400エラー |
| includeCompleted | boolean | 省略時/`false`は、`status`未指定の場合に`completed`を除外。`true`なら完了分も含める |
| keyword | string | 顧客名・顧客メール・電話番号・商品名・注文IDのいずれかに大文字小文字を区別しない部分一致(`ILIKE '%keyword%'`) |
| dateFrom | string | `YYYY-MM-DD`形式。この日の`00:00:00.000Z`以降の注文が対象 |
| dateTo | string | `YYYY-MM-DD`形式。この日の`23:59:59.999Z`以前の注文が対象 |

`status`を明示した場合はその値で完全一致し、`includeCompleted`による既定除外より優先する。管理画面は「完了」指定時に`includeCompleted=true`も送る。日付の境界判定はUTC基準(サーバーのタイムゾーン設定に依存し、JSTとのずれを補正する処理は無い)。

**レスポンス 200**

```json
[
  {
    "id": "403282b4-3cc5-40bb-825e-bddad7117d07",
    "productId": "business-card",
    "productName": "名刺",
    "customerName": "テスト太郎",
    "customerEmail": "test@example.com",
    "customerPhone": "090-1234-5678",
    "quantity": 2,
    "totalPrice": 6000,
    "notes": "DB移行確認用の注文",
    "fileNames": [],
    "filePaths": [],
    "status": "new",
    "createdAt": "2026-07-10T09:53:28.137Z"
  }
]
```

| フィールド | 型 | 説明 |
|---|---|---|
| id | string(uuid) | 注文ID |
| productId | string | 商品ID |
| productName | string | 商品名(`products`テーブルとJOINして取得。該当商品が存在しない状態は通常発生しない) |
| customerName | string | 注文者氏名 |
| customerEmail | string | 注文者メールアドレス |
| customerPhone | string \| undefined | 注文者電話番号。未入力時はキー自体が存在しない |
| quantity | number | 数量 |
| totalPrice | number | 注文時点の総額。注文受付時の`products.price_from × quantity`を保存するため、後の商品価格変更の影響を受けない |
| notes | string \| undefined | 備考。未入力時はキー自体が存在しない |
| fileNames | string[] | 添付ファイルの元ファイル名一覧 |
| filePaths | string[] | サーバー内保存パス一覧(公開URLではない。画面からの取得には認証付き3.20を使用する) |
| status | string | 注文ステータス(`new`/`reviewing`/`payment_link_sent`/`completed`/`cancelled`) |
| paymentLink | string \| undefined | 送信済み支払いリンク。未送信時はキー自体が存在しない |
| createdAt | string(ISO8601) | 作成日時 |

一覧は`createdAt`降順(新しい注文が先頭)。ページネーションは無い。`status`未指定かつ`includeCompleted`が省略/falseの場合は`completed`を除いた全件を返す。

**エラー**

| ケース | ステータス |
|---|---|
| アクセストークンが無い、無効、または期限切れ | 401 |
| `status`に不正な値を指定 | 400 |
| `includeCompleted`に`true`/`false`以外を指定 | 400 |

---

### 3.4 PATCH /api/orders/:id/status — 注文ステータス変更

- 認証: 要(`Authorization: Bearer <accessToken>`)

**パスパラメータ**

| 名前 | 型 | 説明 |
|---|---|---|
| id | string(uuid) | 注文ID |

**リクエストボディ**

```json
{ "status": "reviewing" }
```

| フィールド | 型 | 必須 | バリデーション |
|---|---|---|---|
| status | string | ○ | `new` / `reviewing` / `payment_link_sent` / `completed` / `cancelled` のいずれか |

ステータス遷移に業務ルール上の制約は無い(例: `payment_link_sent`から`new`に戻す、といった操作もAPIレベルでは許可される)。`payment_link`フィールドの更新・クリアは行わない(過去に送信したリンクは残ったままになる)。

**レスポンス 200**

3.3と同じ`OrderRecord`形式(更新後の内容)。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| 認証失敗 | 401 | 3.3と同じ |
| `status`が不正な値 | 400 | `{"message":["status must be one of the following values: new, reviewing, payment_link_sent, completed, cancelled"],"error":"Bad Request","statusCode":400}` |
| `id`に一致する注文が無い | 404 | `{"message":"注文が見つかりません","error":"Not Found","statusCode":404}` |

---

### 3.5 POST /api/orders/:id/send-payment-link — 支払いリンク送信

- 認証: 要(`Authorization: Bearer <accessToken>`)

**パスパラメータ**

| 名前 | 型 | 説明 |
|---|---|---|
| id | string(uuid) | 注文ID |

**リクエストボディ**

```json
{ "paymentLink": "https://example.com/pay/123" }
```

| フィールド | 型 | 必須 | バリデーション |
|---|---|---|---|
| paymentLink | string | ○ | URL形式(プロトコル必須。`@IsUrl({ require_protocol: true })`) |

**処理内容**

1. 注文の存在確認(無ければ404)
2. 顧客に支払い案内メールを送信(SMTP未設定時はログ出力のみでスキップし、正常応答する)
3. メール送信に成功した場合のみ、ステータスを`payment_link_sent`に更新し、`paymentLink`を保存

**レスポンス 200**

3.3と同じ`OrderRecord`形式(`status: "payment_link_sent"`, `paymentLink`が設定された状態)。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| 認証失敗 | 401 | 3.3と同じ |
| `paymentLink`がURL形式でない | 400 | `{"message":["paymentLink must be a URL address"],"error":"Bad Request","statusCode":400}` |
| `id`に一致する注文が無い | 404 | `{"message":"注文が見つかりません","error":"Not Found","statusCode":404}` |
| メール送信に失敗(SMTP到達不可・認証エラー等) | 500 | `{"statusCode":500,"message":"Internal server error"}`(この場合ステータスは更新されない) |

---

### 3.6 POST /api/admin/auth/login — 管理者ログイン

- 認証: 不要
- リクエスト: `{"loginId":"admin","password":"..."}`
- レスポンス200: `accessToken`、`expiresIn`(900秒)、公開アカウント情報。リフレッシュトークンはHttpOnly Cookieで返す。
- 無効なアカウント、ID・パスワード不一致は401。

---

### 3.7 POST /api/products — 商品を新規作成

- 認証: 要(`Authorization: Bearer <accessToken>`)

**リクエストボディ**

```json
{
  "id": "gift-tag",
  "name": "ギフトタグ",
  "description": "手作り感のあるギフトタグ",
  "priceFrom": 500,
  "productCategoryId": 7
}
```

| フィールド | 型 | 必須 | バリデーション |
|---|---|---|---|
| id | string | ○ | 半角英小文字・数字・ハイフンのみ、50文字以内。作成後は変更不可(更新APIにidフィールドは無い) |
| name | string | ○ | 空文字不可、255文字以内 |
| description | string | ○ | 空文字不可 |
| priceFrom | number | ○ | 整数、0以上 |
| productCategoryId | number | ○ | 整数。実在する`product_categories.id`である必要がある |

**レスポンス 201**

3.1と同じ商品オブジェクト形式(`productCategoryName`を含む)。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| 必須項目欠落・型不正・id形式違反 | 400 | `{"message":["idは半角英小文字・数字・ハイフンのみ使用できます"],"error":"Bad Request","statusCode":400}` |
| idが既に使用されている | 409 | `{"message":"このIDは既に使用されています","error":"Conflict","statusCode":409}` |
| productCategoryIdに一致するカテゴリが無い | 404 | `{"message":"指定されたカテゴリ(id: 9999)が見つかりません","error":"Not Found","statusCode":404}` |
| 認証失敗 | 401 | 3.3と同じ |

> **実装上の注意(修正済みの既知の不具合)**: 当初の実装では新規作成にTypeORMの`repository.save()`を使っており、指定した`id`が既存の商品と重複した場合に**エラーにならずUPDATE(上書き)されてしまう**不具合があった(`save()`は主キーが既存なら更新、無ければ新規作成という挙動をするため)。現在は`repository.insert()`を使い、重複時は一意制約違反(409)を返すよう修正済み。

---

### 3.8 PATCH /api/products/:id — 商品を更新

- 認証: 要(`Authorization: Bearer <accessToken>`)

**パスパラメータ**

| 名前 | 型 | 説明 |
|---|---|---|
| id | string | 商品ID |

**リクエストボディ**

`id`以外の全フィールドが必須(部分更新ではなく、フォーム全体を毎回送る想定)。

```json
{
  "name": "ギフトタグ(改)",
  "description": "更新後の説明",
  "priceFrom": 600,
  "productCategoryId": 7
}
```

| フィールド | 型 | 必須 | バリデーション |
|---|---|---|---|
| name | string | ○ | 空文字不可 |
| description | string | ○ | 空文字不可 |
| priceFrom | number | ○ | 整数、0以上 |
| productCategoryId | number | ○ | 整数。実在する`product_categories.id`である必要がある |

**レスポンス 200**

3.1と同じ商品オブジェクト形式。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| 必須項目欠落・型不正 | 400 | 3.7と同様 |
| idに一致する商品が無い | 404 | `{"message":"指定された商品が見つかりません","error":"Not Found","statusCode":404}` |
| productCategoryIdに一致するカテゴリが無い | 404 | 3.7と同様 |
| 認証失敗 | 401 | 3.3と同じ |

---

### 3.9 DELETE /api/products/:id — 商品を削除

- 認証: 要(`Authorization: Bearer <accessToken>`)

**レスポンス 200**: 空ボディ。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| idに一致する商品が無い | 404 | `{"message":"指定された商品が見つかりません","error":"Not Found","statusCode":404}` |
| この商品を参照している注文が残っている(外部キー制約) | 409 | `{"message":"この商品を参照している注文が存在するため削除できません","error":"Conflict","statusCode":409}` |
| 認証失敗 | 401 | 3.3と同じ |

---

### 3.10 GET /api/product-categories — 商品カテゴリ一覧取得

- 認証: 不要(購入画面と管理画面で共通利用)
- リクエストパラメータ: 無し

**レスポンス 200**

```json
[
  { "id": 1, "name": "封筒・袋", "imageUrl": "/product-categories/1/image?v=1783910000000" },
  { "id": 2, "name": "パッケージ・箱・フォルダー" }
]
```

`id`昇順(投入順)で返る。ページネーション・絞り込みは無い。
`imageUrl`は画像登録済みの場合のみ存在し、未登録カテゴリではキー自体を返さない。

---

### 3.11 POST /api/product-categories — 商品カテゴリを新規作成

- 認証: 要(`Authorization: Bearer <accessToken>`)

**リクエストボディ**

```json
{ "name": "新しいカテゴリ" }
```

| フィールド | 型 | 必須 | バリデーション |
|---|---|---|---|
| name | string | ○ | 空文字不可、255文字以内 |

**レスポンス 201**

```json
{ "id": 10, "name": "新しいカテゴリ" }
```

`id`はSERIAL(自動採番)。

**エラー**

| ケース | ステータス |
|---|---|
| 必須項目欠落 | 400 |
| 認証失敗 | 401 |

---

### 3.12 PATCH /api/product-categories/:id — 商品カテゴリを更新

- 認証: 要(`Authorization: Bearer <accessToken>`)

**パスパラメータ**

| 名前 | 型 | 説明 |
|---|---|---|
| id | number | 商品カテゴリID |

**リクエストボディ**: 3.11と同じ(`name`のみ)。

**レスポンス 200**: 3.10の要素と同じ形式。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| 必須項目欠落 | 400 | |
| idに一致するカテゴリが無い | 404 | `{"message":"指定された商品カテゴリが見つかりません","error":"Not Found","statusCode":404}` |
| 認証失敗 | 401 | |

---

### 3.13 DELETE /api/product-categories/:id — 商品カテゴリを削除

- 認証: 要(`Authorization: Bearer <accessToken>`)

**レスポンス 200**: 空ボディ。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| idに一致するカテゴリが無い | 404 | `{"message":"指定された商品カテゴリが見つかりません","error":"Not Found","statusCode":404}` |
| このカテゴリに属する商品が残っている(外部キー制約) | 409 | `{"message":"このカテゴリに属する商品が存在するため削除できません。先に商品のカテゴリを変更するか、商品を削除してください","error":"Conflict","statusCode":409}` |
| 認証失敗 | 401 | |

---

### 3.14 GET /api/products/:id — 商品詳細取得

- 認証: 不要
- パスの`id`に一致する商品1件を返す。レスポンス形式は3.1の配列要素と同じ。
- 商品詳細画面で利用する。一致する商品が無い場合は404「指定された商品が見つかりません」。

---

### 3.15 GET /api/products/:id/image — 商品画像取得

- 認証: 不要
- 登録済み画像のバイナリを、保存された`image_mime_type`を`Content-Type`として返す。過去にHEIC/HEIFのまま保存された画像は、初回取得時にJPEGへ変換して`image/jpeg`で返し、変換結果をDBへ保存する。以降の取得では保存済みJPEGをそのまま返す。
- `Cache-Control: public, max-age=3600`を付与する。JSON一覧の`imageUrl`には更新日時由来の`v`が付くため、画像差し替え後は別URLとして再取得される。
- 商品が無い場合、または商品はあるが画像未登録の場合は404。

---

### 3.16 PUT /api/products/:id/image — 商品画像登録・差し替え

- 認証: 要
- Content-Type: `multipart/form-data`
- フィールド名`image`で画像を1点送る。MIMEタイプが`image/*`であること(HEIC/HEIFは拡張子判定も許可)、ファイルサイズが5MB以下であることを検証する。
- HEIC/HEIF画像はブラウザで表示できるよう、アップロード時にJPEG(品質90)へ変換してからDBへ保存する。変換できないファイルは400を返す。
- 既存画像がある場合はDBの`products.image_data`・`image_mime_type`を上書きする。
- レスポンス200は更新後の商品オブジェクト(3.1と同形式)。ファイル欠落・画像以外は400、商品未検出は404、5MB超過はMulterのファイルサイズ超過エラーになる。

---

### 3.17 GET /api/product-categories/:id/image — カテゴリ画像取得

- 認証: 不要
- 3.15と同じ方式でカテゴリ画像を返す。過去にHEIC/HEIFのまま保存された画像は初回取得時にJPEGへ変換してDBへ保存する。カテゴリ未検出または画像未登録は404。

---

### 3.18 PUT /api/product-categories/:id/image — カテゴリ画像登録・差し替え

- 認証: 要
- Content-Type: `multipart/form-data`
- フィールド名`image`、MIMEタイプ`image/*`(HEIC/HEIFは拡張子判定も許可)、最大5MB。DBの`product_categories.image_data`・`image_mime_type`を上書きする。
- HEIC/HEIF画像は商品画像と同じくJPEGへ変換して保存する。変換できないファイルは400を返す。
- レスポンス200は更新後カテゴリ(3.10の要素と同形式)。ファイル欠落・画像以外は400、カテゴリ未検出は404。

> 画像作成・更新API(`POST/PATCH`)はJSONのマスタ項目のみを扱い、画像は上記`PUT`で別送する。管理画面はマスタ保存成功後、画像が選択されている場合だけ続けて`PUT`を実行する。画像を選択しなければ既存画像は維持される。

---

### 3.19 GET /api/orders/:id — 注文詳細取得

- 認証: 要(`Authorization: Bearer <accessToken>`)
- パスの`id`に一致する注文1件を返す。レスポンス形式は3.3の配列要素と同じ。
- 注文詳細画面の初期表示で使用する。注文が無い場合は404「注文が見つかりません」。

---

### 3.20 GET /api/orders/:id/files/:fileIndex — 注文添付ファイル取得

- 認証: 要(`Authorization: Bearer <accessToken>`)
- `fileIndex`は`fileNames` / `filePaths`配列の0始まりインデックス。注文詳細画面は各`fileNames`に対応する番号を指定する。
- 保存ファイルをバイナリで返し、元ファイル名の拡張子から次の`Content-Type`を設定する。

| 拡張子 | Content-Type |
|---|---|
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.gif` | `image/gif` |
| `.webp` | `image/webp` |
| `.heic`, `.heif` | JPEGへ変換して`image/jpeg` |
| `.pdf` | `application/pdf` |
| その他 | `application/octet-stream` |

- `Content-Disposition: inline`、`Cache-Control: private, no-store`、`X-Content-Type-Options: nosniff`を付ける。
- フロントエンドはBearer認証付きでBlobとして取得し、一時Blob URLを画像/PDFプレビューとファイルを開くリンクに利用する。新規注文のHEIC/HEIFはアップロード時にJPEGへ変換して保存し、過去にHEIC/HEIFのまま保存された添付も取得時にJPEGへ変換する。
- 注文未検出、範囲外の`fileIndex`、ディスク上のファイル欠落は404「添付ファイルが見つかりません」。整数でない`fileIndex`は400。
- DBから取得した相対パスを`UPLOAD_DIR`配下の絶対パスへ解決し、保存領域外を指すパスは読み込まない。

---

### 3.21 POST /api/order-analysis — AI注文分析

- 認証: 要(`Authorization: Bearer <accessToken>`)
- Content-Type: `application/json`
- 用途: 管理者の質問からOpenAI Function Callingで検索条件を決定し、DBで対象を絞り込んだ注文データをOpenAI Responses APIへ送って回答を返す。注文やマスタの更新は行わない。

**リクエストボディ**

```json
{
  "question": "商品別の注文数と売上を教えて",
  "history": [
    { "role": "user", "content": "今月の注文状況をまとめて" },
    { "role": "assistant", "content": "今月は合計10件です。" }
  ]
}
```

| フィールド | 型 | 必須 | バリデーション | 説明 |
|---|---|---|---|---|
| question | string | ○ | 1〜1000文字 | 今回の質問 |
| history | array | 任意 | 最大8件 | 同一画面内の直近の会話。各要素は`role`と`content`を持つ |
| history[].role | string | ○ | `user` / `assistant` | 発言者 |
| history[].content | string | ○ | 1〜4000文字 | 過去の発言本文 |

**外部AIへ送信する注文フィールド**

| フィールド | 説明 |
|---|---|
| productName | 商品名 |
| quantity | 数量 |
| totalPrice | 注文時点の総額(円) |
| status | 注文ステータス |
| orderedAt | 注文日時(ISO 8601) |
| hasAttachment | 添付ファイルの有無 |

注文ID、氏名、メールアドレス、電話番号、備考、添付ファイル名・内容、支払いURL、保存パスは外部AIへ送信しない。質問・履歴にメールアドレス、電話番号、または取得した注文に登録済みの氏名・メールアドレス・電話番号が含まれる場合も送信前に拒否する。ただし自由文から未知の人名を完全検出する機能ではないため、管理画面上でも個人情報を入力しない運用を案内する。

**分析処理の流れ**

1. 外部AIへ送る前に、質問・履歴に個人情報が含まれないか検査する。
2. 1回目のResponses APIで`search_analysis_orders`を呼び出させ、日付範囲・ステータス・商品名・添付有無の検索条件を決定する。
3. バックエンドでAIが返した引数を再検証し、DBへ検索条件として渡す。日付境界は日本時間として扱う。
4. 該当件数が300件以下の場合だけ、上記の許可済みフィールドを2回目のResponses APIへ渡して分析する。
5. 301件以上の場合は注文行を外部AIへ渡さず、該当件数と上限だけを渡して、質問を絞るよう回答させる。

Function Callingは検索条件の決定だけに使い、集計方法は2回目のAIが対象注文データから判断する。このため商品別集計、期間比較などを固定の集計APIごとに実装せず、PoCとして分析の柔軟性を維持する。

OpenAIへの通信には公式TypeScript SDKを使用する。`search_analysis_orders`の引数はZod Schemaを正本とし、SDKの`zodResponsesFunction`でOpenAI向けJSON Schemaを生成する。同じZod SchemaでAIが返した引数を実行時にも検証し、tool定義・TypeScript型・バリデーション条件の重複を避ける。日付の前後関係などJSON Schemaだけでは表現しにくい条件も、DB検索前にZodで追加検証する。

**レスポンス 201**

```json
{
  "answer": "商品別では、名刺が12個で売上36,000円、封筒が5個で売上25,000円です。",
  "analyzedOrderCount": 8,
  "matchedOrderCount": 8
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| answer | string | AIが生成した日本語の分析結果 |
| analyzedOrderCount | number | 2回目のAIへ渡した注文件数。上限超過時は0 |
| matchedOrderCount | number | AIが決めた検索条件でDB検索した該当件数 |

**環境変数**

| 変数 | 必須 | 説明 |
|---|---|---|
| `OPENAI_API_KEY` | 利用時必須 | OpenAI APIキー。未設定でもバックエンドは起動するが本APIは503になる |
| `OPENAI_MODEL` | 任意 | 使用モデル。未設定時は`gpt-5-mini` |

**エラー**

| ケース | ステータス | メッセージ概要 |
|---|---|---|
| DTO不正、個人情報を含む質問・履歴 | 400 | 個人情報を除いて質問するよう案内 |
| 認証失敗 | 401 | 管理者認証エラー |
| `OPENAI_API_KEY`未設定 | 503 | APIキーの設定を案内 |
| OpenAI APIの接続失敗・タイムアウト・異常レスポンス | 502 | AIによる分析失敗 |

OpenAI APIへは各HTTP試行30秒のタイムアウトを設定し、一時的な接続エラー・429・5xxは公式SDKで1回だけ再試行する。検索条件決定は最大800出力トークン、回答は最大1500出力トークンとする。すべての呼び出しで`store: false`を指定し、OpenAI側のレスポンス保存を無効にする。APIエラー時に注文データやAPIキーをログへ出力せず、HTTPステータスのみを記録する。

---

### 3.22〜3.28 管理者認証・アカウント管理

- `POST /api/admin/auth/refresh`: リフレッシュCookieを検証・ローテーションし、新しいアクセストークンを返す。無効・期限切れは401。
- `POST /api/admin/auth/logout`: 現在のリフレッシュセッションを失効しCookieを削除する。レスポンス204。
- `GET /api/admin/auth/me`: アクセストークンのアカウント情報を返す。
- `GET /api/admin/accounts`: パスワードハッシュを除く全管理者を作成日時順で返す。
- `POST /api/admin/accounts`: `loginId`(3〜100文字、半角英数字・`.`・`_`・`-`)、`name`(1〜100文字)、`password`(8文字以上)で有効な管理者を作成する。ID重複は409。
- `PATCH /api/admin/accounts/:id`: `loginId`・`name`・`isActive`を部分更新する。自分自身および最後の有効な管理者は無効化できず400。
- `PATCH /api/admin/accounts/:id/password`: 8文字以上の新パスワードへ変更し、そのアカウントの既存セッションをすべて失効する。

## 4. 未実装のエンドポイント(参考)

現在の画面・機能から参照されそうだが、実装されていないもの:

- 注文の削除API
- 商品カテゴリの個別JSON取得API(`GET /api/product-categories/:id`は無い。編集画面は取得済み一覧から該当行を渡す)
- 登録済みの商品・カテゴリ画像を削除して未登録状態に戻すAPI(画像の差し替えのみ実装)
