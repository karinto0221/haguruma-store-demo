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
    version: '0.3.0',
    releasedAt: '2026-07-16',
    summary: '個人情報を除外したAI注文分析機能を追加',
    changes: [
      '管理画面に、注文データについて自然な文章で質問できるAI注文分析ページを追加しました。',
      '外部AIへ送信する注文情報から氏名・連絡先・備考・注文IDなどを除外し、個人情報を含む質問を送信前に拒否するようにしました。',
      '質問内容に応じて対象注文を先に絞り込み、必要なデータだけをAIで分析するように改善しました。',
      '公開APIを/api配下へ統一し、サーバー側の振り分け設定をAPI追加のたびに変更しなくてよい構成へ改善しました。',
    ],
  },
  {
    version: '0.2.0',
    releasedAt: '2026-07-15',
    summary: '注文履歴のCSV出力・注文総額保存・更新情報ページを追加',
    changes: [
      '注文履歴の検索結果をCSV形式でダウンロードできるようにしました。',
      '注文時点の商品価格と数量から総額を計算し、注文情報として保存するようにしました。',
      '管理画面に現在のバージョンと更新内容を確認できる更新情報ページを追加しました。',
    ],
  },
  {
    version: '0.1.1',
    releasedAt: '2026-07-15',
    summary: 'HEIC・HEIF画像変換を安定化',
    changes: [
      'HEIC・HEIF画像の変換処理を安定化し、バックエンドのメモリ負荷を抑えるようにしました。',
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
