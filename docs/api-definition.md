# API定義書

対象: `backend/`(NestJS 10)。以下は実装済みエンドポイントを、実際に動作検証した結果を元に記載している。

## 1. 共通仕様

### 1.1 ベースURL

- ローカル: `http://localhost:3000`(`.env`の`PORT`で変更可)
- グローバルプレフィックス(`/api`等)は設定されていない。各コントローラーの`@Controller()`パスがそのままURLになる。

### 1.2 認証方式

管理者向けエンドポイント(表2.1で「要」と記載)は、以下2つのカスタムHTTPヘッダーが必須。

| ヘッダー名 | 説明 |
|---|---|
| `x-admin-id` | 環境変数`ADMIN_USER_ID`と完全一致する必要がある |
| `x-admin-password` | 環境変数`ADMIN_PASSWORD`と完全一致する必要がある |

- トークン発行の仕組みは無い(JWTやセッションIDは発行しない)。管理者向けエンドポイントを叩くたびに、毎回このヘッダーを送る(Basic認証に近いステートレス方式)。
- `POST /admin/login`(3.6)は、このヘッダーが正しいかどうかを確認するだけの専用エンドポイント。フロントエンドはログイン画面でこれを呼び、成功したらヘッダー値をメモリ上に保持して以降のリクエストに使い回す(サーバー側に状態は残らない)。
- いずれか不一致・未設定の場合、`401 Unauthorized`を返す(詳細は3.3)。
- お客様向けエンドポイント(カテゴリ一覧、商品一覧・詳細・画像取得、注文作成)は認証不要。

### 1.3 CORS

`FRONTEND_ORIGIN`環境変数(既定値`http://localhost:5173`)からのオリジンのみ許可している(`app.enableCors({ origin: ... })`)。

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

> **メール送信失敗時の挙動**: `POST /orders`は注文保存後に管理者向け新規注文通知とお客様向け注文受付通知を独立して送信する。どちらか、または両方のSMTP送信が失敗しても失敗内容をサーバーログへ記録し、保存済み注文の`orderId`を含む201レスポンスを返す。一方、`POST /orders/:id/send-payment-link`はメール送信失敗時に500を返し、ステータスを`payment_link_sent`に更新しない。

---

## 2. エンドポイント一覧

| # | メソッド | パス | 概要 | 認証 |
|---|---|---|---|---|
| 1 | GET | `/products` | 商品一覧取得(カテゴリ情報を含む) | 不要 |
| 2 | POST | `/orders` | 注文作成 | 不要 |
| 3 | GET | `/orders` | 注文一覧取得・検索 | 要 |
| 4 | PATCH | `/orders/:id/status` | 注文ステータス変更 | 要 |
| 5 | POST | `/orders/:id/send-payment-link` | 支払いリンク送信 | 要 |
| 6 | POST | `/admin/login` | 管理者ログイン確認 | 要 |
| 7 | POST | `/products` | 商品を新規作成(マスタ管理) | 要 |
| 8 | PATCH | `/products/:id` | 商品を更新(マスタ管理) | 要 |
| 9 | DELETE | `/products/:id` | 商品を削除(マスタ管理) | 要 |
| 10 | GET | `/product-categories` | 商品カテゴリ一覧取得(購入画面・マスタ管理共通) | 不要 |
| 11 | POST | `/product-categories` | 商品カテゴリを新規作成(マスタ管理) | 要 |
| 12 | PATCH | `/product-categories/:id` | 商品カテゴリを更新(マスタ管理) | 要 |
| 13 | DELETE | `/product-categories/:id` | 商品カテゴリを削除(マスタ管理) | 要 |
| 14 | GET | `/products/:id` | 商品詳細取得 | 不要 |
| 15 | GET | `/products/:id/image` | 商品画像取得 | 不要 |
| 16 | PUT | `/products/:id/image` | 商品画像登録・差し替え | 要 |
| 17 | GET | `/product-categories/:id/image` | カテゴリ画像取得 | 不要 |
| 18 | PUT | `/product-categories/:id/image` | カテゴリ画像登録・差し替え | 要 |
| 19 | GET | `/orders/:id` | 注文詳細取得 | 要 |
| 20 | GET | `/orders/:id/files/:fileIndex` | 注文添付ファイル取得 | 要 |

---

## 3. エンドポイント詳細

### 3.1 GET /products — 商品一覧取得

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

### 3.2 POST /orders — 注文作成

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
2. HEIC/HEIF画像は表示互換性のためJPEGへ変換し、それ以外の添付ファイルとともにディスク(`UPLOAD_DIR/{orderId}/`)へ保存
3. 注文をDB(`orders`テーブル)に`status: 'new'`で保存
4. `ADMIN_NOTIFY_EMAIL`宛に、注文ID・商品・注文者・数量・備考・添付ファイル名を含む新規注文通知メールを送信
5. `customerEmail`宛に、注文を受け付けたこと、注文ID、商品、数量、後ほど支払い用URLを送ることを記載した注文受付メールを送信

2通のメールは独立して送信する。片方が失敗してももう片方の送信は実行し、失敗は注文IDとともにサーバーログへ記録する。SMTP未設定時は両方ともログ出力のみでスキップする。

---

### 3.3 GET /orders — 注文一覧取得・検索

- 認証: 要(`x-admin-id` / `x-admin-password`)

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
| `x-admin-id`/`x-admin-password`が無い、または不一致 | 401 |
| `status`に不正な値を指定 | 400 |
| `includeCompleted`に`true`/`false`以外を指定 | 400 |

---

### 3.4 PATCH /orders/:id/status — 注文ステータス変更

- 認証: 要(`x-admin-id` / `x-admin-password`)

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

### 3.5 POST /orders/:id/send-payment-link — 支払いリンク送信

- 認証: 要(`x-admin-id` / `x-admin-password`)

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

### 3.6 POST /admin/login — 管理者ログイン確認

- 認証: 要(`x-admin-id` / `x-admin-password`)
- リクエストボディ: 無し(ヘッダーのみで判定)

**レスポンス 201**

```json
{ "ok": true }
```

具体的なデータは何も返さない。フロントエンドはこの呼び出しが成功したことをもって、以降のリクエストに同じヘッダーを使い回す。

**エラー**

| ケース | ステータス |
|---|---|
| `x-admin-id`/`x-admin-password`が無い、または不一致 | 401(3.3と同じ形式) |

---

### 3.7 POST /products — 商品を新規作成

- 認証: 要(`x-admin-id` / `x-admin-password`)

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

### 3.8 PATCH /products/:id — 商品を更新

- 認証: 要(`x-admin-id` / `x-admin-password`)

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

### 3.9 DELETE /products/:id — 商品を削除

- 認証: 要(`x-admin-id` / `x-admin-password`)

**レスポンス 200**: 空ボディ。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| idに一致する商品が無い | 404 | `{"message":"指定された商品が見つかりません","error":"Not Found","statusCode":404}` |
| この商品を参照している注文が残っている(外部キー制約) | 409 | `{"message":"この商品を参照している注文が存在するため削除できません","error":"Conflict","statusCode":409}` |
| 認証失敗 | 401 | 3.3と同じ |

---

### 3.10 GET /product-categories — 商品カテゴリ一覧取得

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

### 3.11 POST /product-categories — 商品カテゴリを新規作成

- 認証: 要(`x-admin-id` / `x-admin-password`)

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

### 3.12 PATCH /product-categories/:id — 商品カテゴリを更新

- 認証: 要(`x-admin-id` / `x-admin-password`)

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

### 3.13 DELETE /product-categories/:id — 商品カテゴリを削除

- 認証: 要(`x-admin-id` / `x-admin-password`)

**レスポンス 200**: 空ボディ。

**エラー**

| ケース | ステータス | レスポンス例 |
|---|---|---|
| idに一致するカテゴリが無い | 404 | `{"message":"指定された商品カテゴリが見つかりません","error":"Not Found","statusCode":404}` |
| このカテゴリに属する商品が残っている(外部キー制約) | 409 | `{"message":"このカテゴリに属する商品が存在するため削除できません。先に商品のカテゴリを変更するか、商品を削除してください","error":"Conflict","statusCode":409}` |
| 認証失敗 | 401 | |

---

### 3.14 GET /products/:id — 商品詳細取得

- 認証: 不要
- パスの`id`に一致する商品1件を返す。レスポンス形式は3.1の配列要素と同じ。
- 商品詳細画面で利用する。一致する商品が無い場合は404「指定された商品が見つかりません」。

---

### 3.15 GET /products/:id/image — 商品画像取得

- 認証: 不要
- 登録済み画像のバイナリを、保存された`image_mime_type`を`Content-Type`として返す。過去にHEIC/HEIFのまま保存された画像は、取得時にJPEGへ変換して`image/jpeg`で返す。
- `Cache-Control: public, max-age=3600`を付与する。JSON一覧の`imageUrl`には更新日時由来の`v`が付くため、画像差し替え後は別URLとして再取得される。
- 商品が無い場合、または商品はあるが画像未登録の場合は404。

---

### 3.16 PUT /products/:id/image — 商品画像登録・差し替え

- 認証: 要
- Content-Type: `multipart/form-data`
- フィールド名`image`で画像を1点送る。MIMEタイプが`image/*`であること(HEIC/HEIFは拡張子判定も許可)、ファイルサイズが5MB以下であることを検証する。
- HEIC/HEIF画像はブラウザで表示できるよう、アップロード時にJPEG(品質90)へ変換してからDBへ保存する。変換できないファイルは400を返す。
- 既存画像がある場合はDBの`products.image_data`・`image_mime_type`を上書きする。
- レスポンス200は更新後の商品オブジェクト(3.1と同形式)。ファイル欠落・画像以外は400、商品未検出は404、5MB超過はMulterのファイルサイズ超過エラーになる。

---

### 3.17 GET /product-categories/:id/image — カテゴリ画像取得

- 認証: 不要
- 3.15と同じ方式でカテゴリ画像を返す。過去にHEIC/HEIFのまま保存された画像はJPEGへ変換して返す。カテゴリ未検出または画像未登録は404。

---

### 3.18 PUT /product-categories/:id/image — カテゴリ画像登録・差し替え

- 認証: 要
- Content-Type: `multipart/form-data`
- フィールド名`image`、MIMEタイプ`image/*`(HEIC/HEIFは拡張子判定も許可)、最大5MB。DBの`product_categories.image_data`・`image_mime_type`を上書きする。
- HEIC/HEIF画像は商品画像と同じくJPEGへ変換して保存する。変換できないファイルは400を返す。
- レスポンス200は更新後カテゴリ(3.10の要素と同形式)。ファイル欠落・画像以外は400、カテゴリ未検出は404。

> 画像作成・更新API(`POST/PATCH`)はJSONのマスタ項目のみを扱い、画像は上記`PUT`で別送する。管理画面はマスタ保存成功後、画像が選択されている場合だけ続けて`PUT`を実行する。画像を選択しなければ既存画像は維持される。

---

### 3.19 GET /orders/:id — 注文詳細取得

- 認証: 要(`x-admin-id` / `x-admin-password`)
- パスの`id`に一致する注文1件を返す。レスポンス形式は3.3の配列要素と同じ。
- 注文詳細画面の初期表示で使用する。注文が無い場合は404「注文が見つかりません」。

---

### 3.20 GET /orders/:id/files/:fileIndex — 注文添付ファイル取得

- 認証: 要(`x-admin-id` / `x-admin-password`)
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
- フロントエンドはカスタム認証ヘッダー付きでBlobとして取得し、一時Blob URLを画像/PDFプレビューとファイルを開くリンクに利用する。新規注文のHEIC/HEIFはアップロード時にJPEGへ変換して保存し、過去にHEIC/HEIFのまま保存された添付も取得時にJPEGへ変換する。
- 注文未検出、範囲外の`fileIndex`、ディスク上のファイル欠落は404「添付ファイルが見つかりません」。整数でない`fileIndex`は400。
- DBから取得した相対パスを`UPLOAD_DIR`配下の絶対パスへ解決し、保存領域外を指すパスは読み込まない。

---

## 4. 未実装のエンドポイント(参考)

現在の画面・機能から参照されそうだが、実装されていないもの:

- ログアウトAPI・トークンのリフレッシュ(ログアウトはフロント側でReact stateと`sessionStorage`の認証情報を破棄するだけで、サーバー側に伝えるAPI呼び出しは無い。そもそもサーバー側にセッション概念が無いため不要)
- 注文の削除API
- 商品カテゴリの個別JSON取得API(`GET /product-categories/:id`は無い。編集画面は取得済み一覧から該当行を渡す)
- 登録済みの商品・カテゴリ画像を削除して未登録状態に戻すAPI(画像の差し替えのみ実装)
