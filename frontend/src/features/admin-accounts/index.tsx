import { FormEvent, useEffect, useState } from 'react';
import MasterPageLayout from '@/components/master/MasterPageLayout';
import MasterFormDialogLayout from '@/components/master/MasterFormDialogLayout';
import MasterTableViewport from '@/components/master/MasterTableViewport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminAccount } from '@/api';
import { useAdminAccountsApi } from '@/api/hook/useAdminAccountsApi';

export default function AdminAccounts() {
  const api = useAdminAccountsApi();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setAccounts(await api.fetchAll()); } catch { /* useAdminAccountsApiが表示用エラーを保持する */ } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const showForm = (account: AdminAccount | null) => {
    setEditing(account); setLoginId(account?.loginId || ''); setName(account?.name || '');
    setPassword(''); setIsActive(account?.isActive ?? true); setFormError(''); setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setFormError('');
    try {
      if (editing) {
        await api.update(editing.id, { loginId, name, isActive });
        if (password) await api.updatePassword(editing.id, password);
      } else {
        await api.create({ loginId, name, password });
      }
      setOpen(false); await load();
    } catch (e: any) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  return (
    <MasterPageLayout title="アカウント管理" description="管理者サイトへログインできるアカウントを管理します。" onCreate={() => showForm(null)}>
      {api.error && <div className="error-box">{api.error}</div>}
      <MasterTableViewport>
        <Table className="master-table admin-account-table">
          <TableHeader><TableRow><TableHead>表示名</TableHead><TableHead>ログインID</TableHead><TableHead>状態</TableHead><TableHead>最終ログイン</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="text-center">読み込み中...</TableCell></TableRow> : accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell><TableCell>{account.loginId}</TableCell>
                <TableCell>{account.isActive ? '有効' : '無効'}</TableCell>
                <TableCell>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('ja-JP') : '未ログイン'}</TableCell>
                <TableCell className="text-right"><Button variant="link" size="sm" onClick={() => showForm(account)}>編集</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MasterTableViewport>
      <MasterFormDialogLayout open={open} onOpenChange={setOpen} title={editing ? 'アカウント編集' : 'アカウント新規作成'} submitting={submitting} error={formError} onSubmit={submit}>
        <div className="field"><Label htmlFor="accountName">表示名</Label><Input id="accountName" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></div>
        <div className="field"><Label htmlFor="accountLoginId">ログインID</Label><Input id="accountLoginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} required minLength={3} maxLength={100} pattern="[A-Za-z0-9._-]+" /></div>
        <div className="field"><Label htmlFor="accountPassword">{editing ? '新しいパスワード（変更時のみ）' : 'パスワード'}</Label><Input id="accountPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editing} minLength={8} autoComplete="new-password" /></div>
        {editing && <label className="account-active-field"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> このアカウントを有効にする</label>}
      </MasterFormDialogLayout>
    </MasterPageLayout>
  );
}
