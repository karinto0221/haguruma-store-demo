# 紙製品オーダーサイト(暫定版)

Instagramリール経由のアクセスを取りこぼさないための、シンプルな注文受付サイトです。

- お客様: 商品を選ぶ → 名前・連絡先・数量・デザインファイルを送る → 完了
- 管理者: 届いた注文を確認し、支払いリンク(Stripe/PayPal/銀行振込など、今使っているもの)を貼り付けて送信

決済自体は行わず、リンクを送るところまでを担当します。カード情報などを直接扱わないため、まずはこの形が安全です。

## 構成

```
paper-order-site/
├── backend/   NestJS API (商品API・注文受付・ファイル保存・メール通知)
└── frontend/  React (Vite) の注文フォーム + 簡易管理画面
```

## ローカルで動かす

### 1. backend

```
cd backend
cp .env.example .env   # 中身を編集(下記参照)
npm install
npm run start:dev
```

`.env` で最低限設定するもの:

- `ADMIN_API_KEY` … 管理画面用の合言葉。ランダムな文字列にしてください
- `ADMIN_NOTIFY_EMAIL` … 新規注文が入ったときに通知を受け取るメールアドレス
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` … メール送信用。未設定でも動作しますが、メールは飛ばずログに出るだけになります

### 2. frontend

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

`http://localhost:5173` で注文フォーム、`http://localhost:5173/admin` で管理画面が開けます。

## 注文が入ってからの流れ

1. お客様が商品を選び、フォームとデザインファイルを送信
2. `ADMIN_NOTIFY_EMAIL` 宛に注文内容の通知メールが届く
3. 管理者が `/admin` にアクセスし、`ADMIN_API_KEY` を入力して注文一覧を確認
4. 支払いリンク(Stripeの支払いリンク、PayPal.me、銀行振込の案内ページなど何でも可)を該当注文の欄に貼って送信
5. お客様にお支払い案内メールが自動送信される

## 決済リンクをどう用意するか(未決定とのことなので)

このシステムはリンクの中身を問わないので、後からいくらでも変更できます。候補:

- **Stripeの支払いリンク**: ダッシュボードで商品ごとに支払いリンクを作成し、それを貼るだけ。将来的にAPIで自動生成することも可能(Stripe Payment Links API)
- **PayPal.me**: `https://paypal.me/アカウント名/金額` の形式でリンクを都度作る
- **銀行振込**: 振込先情報を書いたページ(Googleフォームの確認画面など)へのリンクでも代用可能

## 本番(AWS)デプロイに向けて、今の設計で意識していること

- **ファイル保存**: 今はローカルディスク(`backend/src/storage/storage.service.ts`)。本番はS3に差し替え予定。呼び出し側はこのクラスのメソッドしか使っていないので、中身の実装をS3 SDK呼び出しに変えるだけで移行できます
- **データ保存**: 今はJSONファイル(`backend/src/data/orders.repository.ts`)。本番はRDS(Postgres)やDynamoDBを想定。こちらもメソッドのインターフェースは変えずに中身だけ差し替えられる作りにしています
- **メール送信**: `nodemailer`のSMTP経由。AWS SESもSMTPインターフェースを提供しているので、`.env`のSMTP系の値をSESの認証情報に変えるだけでコード変更なしに移行できます
- **管理者認証**: 今は簡易的な合言葉(APIキー)方式。本番で管理者以外にも権限管理が必要になったら、Cognitoなどに差し替える想定でガード(`common/admin-auth.guard.ts`)を1箇所にまとめています

### デプロイのおおまかな流れ(参考)

1. **frontend**: `npm run build` で静的ファイルを生成し、S3 + CloudFront、またはAmplify Hostingで配信
2. **backend**: Dockerfileを用意済みなので、ECS(Fargate)やElastic Beanstalkにそのままデプロイ可能。まずはEC2に直接Node.jsを立てて動かす形でも十分動きます
3. **ファイル保存をS3に切り替え**(`storage.service.ts`)、**データ保存をRDSに切り替え**(`orders.repository.ts`)
4. **メール送信をSES経由に変更**(`.env`の書き換えのみ)
5. ドメイン・HTTPS(ACM証明書)を設定

## 商品ラインナップの変更

`backend/src/products/product.data.ts` を編集するだけで、商品の種類・説明・参考価格を自由に増減できます。
