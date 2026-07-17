import { MouseEvent, ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ClipboardList, History, Layers, LogOut, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const MASTER_NAV = [
  { to: '/admin/master/product-categories', label: '商品カテゴリ' },
  { to: '/admin/master/products', label: '商品マスタ' },
];

interface AdminLayoutProps {
  onLogout: () => void;
  children: ReactNode;
}

// 管理画面共通のレイアウト。開閉可能なサイドバーを持つ。
export default function AdminLayout({ onLogout, children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <AdminSidebar onLogout={onLogout}>{children}</AdminSidebar>
    </SidebarProvider>
  );
}

// useSidebar()はSidebarProvider配下でしか呼べないため、内側のコンポーネントに分けている
function AdminSidebar({ onLogout, children }: AdminLayoutProps) {
  const location = useLocation();
  const { state, setOpen } = useSidebar();
  const isOrdersActive =
    location.pathname === '/admin' || location.pathname.startsWith('/admin/orders/');
  const isOrderAnalysisActive = location.pathname === '/admin/order-analysis';
  const isMasterActive = MASTER_NAV.some((item) => location.pathname === item.to);
  const isUpdatesActive = location.pathname === '/admin/updates';
  const [masterOpen, setMasterOpen] = useState(isMasterActive);

  // サイドバーが折りたたまれている状態で「マスタ管理」(分類アイコン)をクリックしたら、
  // サブメニューの開閉ではなくサイドバー自体を開く。preventDefault()でCollapsible自身の
  // トグル処理を止め、サイドバーを開いた上でサブメニューも開いた状態にする。
  const handleMasterTriggerClick = (e: MouseEvent) => {
    if (state === 'collapsed') {
      e.preventDefault();
      setOpen(true);
      setMasterOpen(true);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isOrdersActive}
                  tooltip="注文管理"
                >
                  <Link to="/admin">
                    <ClipboardList />
                    <span>注文管理</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isOrderAnalysisActive}
                  tooltip="AI注文分析"
                >
                  <Link to="/admin/order-analysis">
                    <Sparkles />
                    <span>AI注文分析</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible
                open={masterOpen}
                onOpenChange={setMasterOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="マスタ管理"
                      onClick={handleMasterTriggerClick}
                    >
                      <Layers />
                      <span>マスタ管理</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {MASTER_NAV.map((item) => (
                        <SidebarMenuSubItem key={item.to}>
                          <SidebarMenuSubButton asChild isActive={location.pathname === item.to}>
                            <Link to={item.to}>
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isUpdatesActive}
                tooltip="更新情報"
              >
                <Link to="/admin/updates">
                  <History />
                  <span>更新情報</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLogout} tooltip="ログアウト">
                <LogOut />
                <span>ログアウト</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div style={{ padding: '12px 20px 0' }}>
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </>
  );
}
