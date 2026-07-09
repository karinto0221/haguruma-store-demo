import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // SMTP設定はすべて環境変数から。開発中はGmail等、本番はAWS SESのSMTP認証情報を
    // そのまま設定すれば動く (コード変更は不要)。
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
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
      from: process.env.MAIL_FROM || "no-reply@example.com",
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
    quantity: number;
    notes?: string;
    fileNames: string[];
  }) {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (!adminEmail) {
      this.logger.warn(
        "ADMIN_NOTIFY_EMAIL未設定のため注文通知メールを送信できません",
      );
      return;
    }

    const html = `
      <h2>新しい注文が届きました</h2>
      <p>注文ID: ${params.orderId}</p>
      <p>商品: ${params.productName}</p>
      <p>お客様名: ${params.customerName}</p>
      <p>お客様メール: ${params.customerEmail}</p>
      <p>数量: ${params.quantity}</p>
      <p>備考: ${params.notes || "なし"}</p>
      <p>アップロードファイル: ${params.fileNames.join(", ") || "なし"}</p>
      <p>管理画面から支払いリンクを送信してください。</p>
    `;
    await this.send(
      adminEmail,
      `【新規注文】${params.productName} - ${params.customerName}様`,
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
