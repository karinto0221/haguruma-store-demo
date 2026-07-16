import { BadGatewayException } from '@nestjs/common';
import { zodResponsesFunction } from 'openai/helpers/zod';
import type {
  ResponseFunctionToolCall,
  ResponseOutputItem,
} from 'openai/resources/responses/responses';
import { z } from 'zod';
import { ORDER_STATUSES } from '../orders/order-status';
import { OrderAnalysisSearchFilters } from './order-analysis.types';

export const SEARCH_ANALYSIS_ORDERS_TOOL_NAME = 'search_analysis_orders';

const nullableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidDate, '実在する日付をYYYY-MM-DD形式で指定してください')
  .nullable();

export const SearchAnalysisOrdersArgumentsSchema = z
  .object({
    dateFrom: nullableDateSchema.describe(
      '検索開始日。YYYY-MM-DD。開始日の指定が不要な場合はnull。',
    ),
    dateTo: nullableDateSchema.describe(
      '検索終了日。YYYY-MM-DD。終了日の指定が不要な場合はnull。',
    ),
    statuses: z
      .array(z.enum(ORDER_STATUSES))
      .max(ORDER_STATUSES.length)
      .nullable()
      .describe('対象ステータス。全ステータスが必要な場合はnull。'),
    productNames: z
      .array(z.string().min(1).max(255))
      .max(20)
      .nullable()
      .describe('商品名の部分一致検索語。商品を限定しない場合はnull。'),
    hasAttachment: z
      .boolean()
      .nullable()
      .describe('添付ありだけならtrue、なしだけならfalse、限定しない場合はnull。'),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: '検索終了日は検索開始日以降にしてください',
      });
    }
    if (value.statuses && new Set(value.statuses).size !== value.statuses.length) {
      context.addIssue({
        code: 'custom',
        path: ['statuses'],
        message: '注文ステータスを重複させないでください',
      });
    }
  });

export type SearchAnalysisOrdersArguments = z.infer<
  typeof SearchAnalysisOrdersArgumentsSchema
>;

export const SEARCH_ANALYSIS_ORDERS_TOOL = zodResponsesFunction({
  name: SEARCH_ANALYSIS_ORDERS_TOOL_NAME,
  description:
    '管理者の質問へ回答するために必要な注文だけを検索する。期間比較では、比較する全期間を含む1つの日付範囲を指定する。',
  parameters: SearchAnalysisOrdersArgumentsSchema,
});

export function findSearchOrdersToolCall(
  output: ResponseOutputItem[],
): ResponseFunctionToolCall {
  const toolCalls = output.filter(
    (item): item is ResponseFunctionToolCall =>
      item.type === 'function_call' && item.name === SEARCH_ANALYSIS_ORDERS_TOOL_NAME,
  );
  if (toolCalls.length !== 1) {
    throw new BadGatewayException('AIから注文の検索条件を取得できませんでした');
  }
  return toolCalls[0];
}

export function parseSearchOrdersArguments(value: string): OrderAnalysisSearchFilters {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(value);
  } catch {
    throw new BadGatewayException('AIが返した注文の検索条件を解釈できませんでした');
  }

  const result = SearchAnalysisOrdersArgumentsSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new BadGatewayException('AIが返した注文の検索条件が不正です');
  }

  return normalizeSearchArguments(result.data);
}

function normalizeSearchArguments(
  value: SearchAnalysisOrdersArguments,
): OrderAnalysisSearchFilters {
  const productNames = value.productNames
    ?.map((productName) => productName.trim())
    .filter(Boolean);

  return {
    dateFrom: value.dateFrom ?? undefined,
    dateTo: value.dateTo ?? undefined,
    statuses: value.statuses ?? undefined,
    productNames: productNames?.length ? [...new Set(productNames)] : undefined,
    hasAttachment: value.hasAttachment ?? undefined,
  };
}

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
