import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import type { UpdateHistoryEntry } from '../data/updateHistory';

interface UpdateHistoryListProps {
  entries: UpdateHistoryEntry[];
}

function formatReleaseDate(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(`${value}T00:00:00+09:00`));
}

function formatCompactDate(value: string): string {
  return value.replace(/-/g, '.');
}

export default function UpdateHistoryList({ entries }: UpdateHistoryListProps) {
  return (
    <section className="update-history-section" aria-labelledby="update-history-heading">
      <h2 id="update-history-heading">変更履歴</h2>
      <div className="update-history-list" role="list">
        <div className="update-history-column-header" aria-hidden="true">
          <span>日付</span>
          <span>バージョン</span>
          <span>変更内容</span>
          <span />
        </div>
        {entries.map((entry) => (
          <Dialog key={entry.version}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="update-history-row"
                role="listitem"
                aria-label={`バージョン${entry.version}の更新詳細を表示`}
              >
                <time className="update-history-date" dateTime={entry.releasedAt}>
                  {formatCompactDate(entry.releasedAt)}
                </time>
                <span className="update-history-version">v{entry.version}</span>
                <span className="update-history-summary">{entry.summary}</span>
                <ChevronRight className="update-history-chevron" aria-hidden="true" />
              </button>
            </DialogTrigger>
            <DialogContent className="update-history-dialog">
              <DialogHeader>
                <div className="update-history-dialog-meta">
                  <span className="update-history-version">v{entry.version}</span>
                  <time dateTime={entry.releasedAt}>{formatReleaseDate(entry.releasedAt)}</time>
                </div>
                <DialogTitle>{entry.summary}</DialogTitle>
                <DialogDescription>このバージョンで追加・改善された内容</DialogDescription>
              </DialogHeader>
              <ul className="update-history-dialog-list">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </section>
  );
}
