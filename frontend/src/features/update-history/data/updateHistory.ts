import packageJson from '../../../../package.json';

export interface UpdateHistoryEntry {
  version: string;
  releasedAt: string;
  summary: string;
  changes: string[];
}

export const CURRENT_APP_VERSION = packageJson.version;

// ユーザーに見える機能追加・修正を行ったら、該当バージョンのchangesへ1項目追加する。
export const UPDATE_HISTORY: UpdateHistoryEntry[] = [
  {
    version: '0.4.0',
    releasedAt: '2026-07-17',
    summary: 'アカウント管理機能を追加し、管理画面のログインを強化',
    changes: [
      '管理画面を利用できるアカウントを複数登録・編集できるようにしました。',
      '管理画面のログインの安全性を高めました。',
      'ログイン中のアカウントを確認できるようにするなど、管理画面のUI関連の調整を行いました。',
    ],
  },
  {
    version: '0.3.0',
    releasedAt: '2026-07-16',
    summary: '個人情報を除外したAI注文分析機能を追加',
    changes: [
      '管理画面に、注文データについて自然な文章で質問できるAI注文分析ページを追加しました。',
      '個人情報を含む質問を送信前に確認し、安全にAI注文分析を利用できるようにしました。',
      '質問内容に合った注文を分析し、回答を確認しやすくしました。',
    ],
  },
  {
    version: '0.2.0',
    releasedAt: '2026-07-15',
    summary: '注文履歴のCSV出力・注文総額保存・更新情報ページを追加',
    changes: [
      '注文履歴の検索結果をCSV形式でダウンロードできるようにしました。',
      '注文内容から注文時点の合計金額を確認できるようにしました。',
      '管理画面に現在のバージョンと更新内容を確認できる更新情報ページを追加しました。',
    ],
  },
  {
    version: '0.1.1',
    releasedAt: '2026-07-15',
    summary: 'HEIC・HEIF画像変換を安定化',
    changes: [
      'HEIC・HEIF形式の画像をより安定して添付できるようにしました。',
    ],
  },
  {
    version: '0.1.0',
    releasedAt: '2026-07-14',
    summary: '注文受付と管理画面の基本機能を公開',
    changes: [
      'カテゴリ・商品選択から注文入力までの購入導線を追加しました。',
      '注文一覧・注文詳細・商品マスタ・商品カテゴリの管理画面を追加しました。',
      '注文受付メールと支払いURL送信機能を追加しました。',
    ],
  },
];
