import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

    // Gmailは587番 + STARTTLS、Mailpitは1025番 + TLSなしで利用する。
    // SMTP_REQUIRE_TLS=trueの場合は暗号化接続へのアップグレードを必須にする。
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  private async send(to: string, subject: string, html: string) {
    // SMTP未設定の場合は開発用にログ出力のみ行い、エラーで注文処理全体を止めない
    if (!process.env.SMTP_HOST) {
      this.logger.warn(
        `SMTP未設定のためメール送信をスキップしました。宛先: ${to} / 件名: ${subject}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@example.com',
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      to,
      subject,
      html,
    });
  }

  // 新規注文が入ったときに管理者へ通知するメール
  async sendNewOrderNotification(params: {
    orderId: string;
    productName: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    quantity: number;
    notes?: string;
    fileNames: string[];
  }) {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (!adminEmail) {
      this.logger.warn(
        'ADMIN_NOTIFY_EMAIL未設定のため注文通知メールを送信できません',
      );
      return;
    }

    const html = `
      <h2>新しい注文が届きました</h2>
      <p>注文ID: ${params.orderId}</p>
      <p>商品: ${params.productName}</p>
      <p>お客様名: ${params.customerName}</p>
      <p>お客様メール: ${params.customerEmail}</p>
      <p>お客様電話番号: ${params.customerPhone || 'なし'}</p>
      <p>数量: ${params.quantity}</p>
      <p>備考: ${params.notes || 'なし'}</p>
      <p>アップロードファイル: ${params.fileNames.join(', ') || 'なし'}</p>
      <p>管理画面から支払いリンクを送信してください。</p>
    `;
    await this.send(
      adminEmail,
      `【新規注文】${params.productName} - ${params.customerName}様`,
      html,
    );
  }

  // 注文受付完了後、お客様に注文IDと受付内容を知らせるメール
  async sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    customerName: string;
    productName: string;
    quantity: number;
  }) {
    const html = `
      <p>${params.customerName} 様</p>
      <p>この度は「${params.productName}」をご注文いただき、ありがとうございます。</p>
      <p>以下の内容でご注文を受け付けました。</p>
      <p>注文ID: ${params.orderId}</p>
      <p>商品: ${params.productName}</p>
      <p>数量: ${params.quantity}</p>
      <p>ご注文内容の確認後、お支払い用URLをメールでお送りします。</p>
      <p>注文IDはお問い合わせ時に必要となるため、このメールを保管してください。</p>
    `;
    await this.send(
      params.to,
      `【ご注文受付】注文ID: ${params.orderId}`,
      html,
    );
  }

  // 管理者が支払いリンクを確定したあと、お客様に送るメール
  async sendPaymentLink(params: {
    to: string;
    customerName: string;
    productName: string;
    paymentLink: string;
  }) {
    const html = `
      <p>${params.customerName} 様</p>
      <p>この度は「${params.productName}」のご注文ありがとうございます。</p>
      <p>下記リンクよりお支払いをお願いいたします。</p>
      <p><a href="${params.paymentLink}">${params.paymentLink}</a></p>
      <p>ご不明点があればこのメールにご返信ください。</p>
    `;
    await this.send(
      params.to,
      `【お支払いのご案内】${params.productName}のご注文について`,
      html,
    );
  }
}
