import {
  APIConnectionError,
  APIError,
  BadRequestError as OpenAIBadRequestError,
  OpenAI,
} from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OpenAiResponseRequest = Omit<
  ResponseCreateParamsNonStreaming,
  'model' | 'store' | 'stream'
>;

@Injectable()
export class OpenAiResponsesClient {
  private readonly logger = new Logger(OpenAiResponsesClient.name);
  private client?: OpenAI;

  constructor(private readonly configService: ConfigService) {}

  async create(request: OpenAiResponseRequest): Promise<Response> {
    const model = this.configService.get<string>('OPENAI_MODEL')?.trim() || 'gpt-5-mini';
    const client = this.getClient();

    try {
      return await client.responses.create(
        {
          ...request,
          model,
          // 分析内容をOpenAI側へ保存しない。呼び出し側から上書きできない順序にする。
          store: false,
        },
        {
          timeout: 30_000,
          // 一時的な接続エラー・429・5xxに対して1回だけ再試行する。
          maxRetries: 1,
        },
      );
    } catch (error) {
      if (error instanceof OpenAIBadRequestError) {
        this.logger.error(`OpenAI APIがリクエストを拒否しました (status: ${error.status})`);
      } else if (error instanceof APIConnectionError) {
        this.logger.error('OpenAI APIへの接続に失敗しました', error.stack);
      } else if (error instanceof APIError) {
        this.logger.error(`OpenAI APIがエラーを返しました (status: ${error.status ?? 'unknown'})`);
      } else {
        this.logger.error(
          'OpenAI SDKで予期しないエラーが発生しました',
          error instanceof Error ? error.stack : undefined,
        );
      }
      throw new BadGatewayException('AIによる注文分析に失敗しました');
    }
  }

  private getClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI注文分析を利用するには、サーバーのOPENAI_API_KEYを設定してください',
      );
    }
    this.client ??= new OpenAI({ apiKey });
    return this.client;
  }
}
