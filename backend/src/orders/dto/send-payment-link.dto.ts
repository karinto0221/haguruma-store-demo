import { IsNotEmpty, IsUrl } from 'class-validator';

export class SendPaymentLinkDto {
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  paymentLink: string;
}
