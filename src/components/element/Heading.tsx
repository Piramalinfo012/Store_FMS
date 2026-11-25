import AccountCard from './AccountCard';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '../ui/sidebar';
import { TabsList, TabsTrigger } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { useSheets } from '@/context/SheetsContext';
import { useAuth } from '@/context/AuthContext';
import { canInitiatePurchase, canReceiveIndent, useWorkflow } from '@/context/WorkflowContext';

interface HeaderProps {
    children: ReactNode;
    heading: string;
    subtext: string;
    tabs?: boolean;
    actions?: ReactNode;
}

const quickPages = [
    { name: 'Dashboard', path: '/' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Create Indent', path: '/create-indent' },
    { name: 'Approve Indent', path: '/approve-indent', perm: 'indentApprovalView' as const },
    { name: 'Initiate Purchase', path: '/initiate-purchase', perm: 'createPo' as const },
    { name: 'Receive Items', path: '/receive-items', perm: 'receiveItemView' as const },
    { name: 'Store Out Approval', path: '/store-out-approval', perm: 'storeOutApprovalView' as const },
    { name: 'Handover', path: '/handover', perm: 'storeOutApprovalView' as const },
    { name: 'Administration', path: '/administration', perm: 'administrate' as const },
    { name: 'Training Video', path: '/training-video' },
];

export default ({ children, heading, subtext, actions, tabs = false }: HeaderProps) => {
    const navigate = useNavigate();
    const { indentSheet, iniciateSheet } = useSheets();
    const { user, logout } = useAuth();
    const { purchaseWorkflowHidden } = useWorkflow();
    const { toggleSidebar } = useSidebar();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifOpen, setNotifOpen] = useState(false);

    const notifications = useMemo(() => {
        const items = [
            {
                label: 'Approve Indent',
                path: '/approve-indent',
                allowed: Boolean(user?.indentApprovalView),
                count: indentSheet.filter(
                    (s) => s.planned3 !== '' && s.actual3 === '' && s.indentType === 'Purchase'
                ).length,
            },
            {
                label: 'Initiate Purchase',
                path: '/initiate-purchase',
                allowed: Boolean(user?.createPo),
                count: indentSheet.filter((s) => canInitiatePurchase(s, iniciateSheet)).length,
            },
            {
                label: 'Receive Items',
                path: '/receive-items',
                allowed: Boolean(user?.receiveItemView),
                count: indentSheet.filter((s) =>
                    canReceiveIndent(s, purchaseWorkflowHidden, iniciateSheet)
                ).length,
            },
            {
                label: 'Store Out Approval',
                path: '/store-out-approval',
                allowed: Boolean(user?.storeOutApprovalView),
                count: indentSheet.filter(
                    (s) => s.planned6 !== '' && s.actual6 === '' && s.indentType === 'Store Out'
                ).length,
            },
            {
                label: 'Handover',
                path: '/handover',
                allowed: Boolean(user?.storeOutApprovalView),
                count: indentSheet.filter(
                    (s) =>
                        s.planned7 !== '' &&
                        s.actual7 === '' &&
                        s.issueStatus === 'Approved' &&
                        s.indentType === 'Store Out'
                ).length,
            },
        ].filter((item) => item.allowed);

        const total = items.reduce((sum, item) => sum + item.count, 0);
        return { items, total };
    }, [indentSheet, iniciateSheet, user, purchaseWorkflowHidden]);

    const filteredPages = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return quickPages.filter((p) => {
            if (p.perm && !user?.[p.perm]) return false;
            return !q || p.name.toLowerCase().includes(q);
        });
    }, [searchQuery, user]);

    const filteredIndents = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return indentSheet
            .filter(
                (s) =>
                    s.indentNumber.toLowerCase().includes(q) ||
                    s.productName.toLowerCase().includes(q) ||
                    s.indenterName.toLowerCase().includes(q)
            )
            .slice(0, 6);
    }, [searchQuery, indentSheet]);

    return (
        <div className="sticky top-0 z-20 bg-gradient-to-r from-[#556B5B] via-[#687F6E] to-[#4F6354] text-[#FAF8F4] rounded-b-2xl shadow-md md:static md:bg-gradient-to-br md:from-[#EAE4DA] md:via-[#FAF8F4] md:to-[#D9E1D9]/70 md:text-[#1F2621] md:rounded-md md:border-b md:border-[#C9BDAF] md:shadow-none pt-[env(safe-area-inset-top)] md:pt-0">
            <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 sm:p-4">
                <div className="flex gap-2.5 items-center min-w-0">
                    <button
                        type="button"
                        onClick={() => toggleSidebar()}
                        className="md:hidden flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#FAF8F4] hover:bg-white/25 active:scale-95 transition-all"
                        aria-label="Open menu"
                    >
                        <Menu className="size-5" />
                    </button>
                    <div className="hidden md:block shrink-0">{children}</div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-2xl font-bold text-[#FAF8F4] md:text-[#2F4034] truncate">{heading}</h1>
                        <p className="text-[#D9E1D9] md:text-[#556158] text-[11px] sm:text-sm truncate">{subtext}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Search Bar (Desktop) & Icon (Mobile) */}
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="hidden sm:flex items-center gap-2 h-10 w-44 md:w-56 rounded-full border border-white/30 md:border-[#C9BDAF] bg-white/20 md:bg-[#FAF8F4] px-3.5 text-xs font-medium text-[#FAF8F4] md:text-[#556158] shadow-xs hover:bg-white/30 md:hover:border-[#687F6E] md:hover:bg-white transition-colors"
                        aria-label="Quick search"
                    >
                        <Search className="size-3.5 text-white/90 md:text-[#687F6E] shrink-0" />
                        <span className="truncate">Search...</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="sm:hidden flex size-9 items-center justify-center rounded-full bg-white/15 text-[#FAF8F4] hover:bg-white/25 active:scale-95 transition-all"
                        aria-label="Quick search"
                    >
                        <Search className="size-4" />
                    </button>

                    {/* Notification Bell */}
                    <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="relative flex size-9 sm:size-10 items-center justify-center rounded-full bg-white/15 md:bg-[#FAF8F4] md:border md:border-[#C9BDAF] text-[#FAF8F4] md:text-[#2A332C] shadow-xs md:hover:border-[#687F6E] md:hover:text-[#4F6354] hover:bg-white/25 transition-colors"
                                aria-label="Notifications"
                            >
                                <Bell className="size-4" />
                                {notifications.total > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C25E5E] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-[#556B5B] md:ring-0">
                                        {notifications.total > 99 ? '99+' : notifications.total}
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            sideOffset={10}
                            collisionPadding={12}
                            className="w-[calc(100vw-2rem)] max-w-80 rounded-2xl border border-[#C9BDAF] bg-[#FAF8F4] p-3.5 shadow-xl z-50"
                        >
                            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#C9BDAF]/50">
                                <span className="text-sm font-bold text-[#2F4034]">Notifications</span>
                                <span className="rounded-full bg-[#D9E1D9] px-2.5 py-0.5 text-[11px] font-bold text-[#2F4034]">
                                    {notifications.total} pending
                                </span>
                            </div>
                            <div className="grid gap-1">
                                {notifications.items.length > 0 ? (
                                    notifications.items.map((item) => (
                                        <button
                                            key={item.path}
                                            type="button"
                                            onClick={() => {
                                                setNotifOpen(false);
                                                navigate(item.path);
                                            }}
                                            className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#2A332C] hover:bg-[#EAE4DA]/80 active:scale-[0.99] transition-all"
                                        >
                                            <span>{item.label}</span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                    item.count > 0
                                                        ? 'bg-[#C25E5E]/15 text-[#C25E5E]'
                                                        : 'bg-[#EAE4DA] text-[#556158]'
                                                }`}
                                            >
                                                {item.count}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="py-3 text-center text-xs text-[#556158]">
                                        No pending notifications
                                    </p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* User DP */}
                    <AccountCard />
                    <button
                        type="button"
                        onClick={() => logout()}
                        title="Logout"
                        aria-label="Logout"
                        className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-white/15 md:bg-[#FAF8F4] md:border md:border-[#C9BDAF] text-[#FAF8F4] md:text-[#C25E5E] shadow-xs hover:bg-white/25 md:hover:border-[#C25E5E] md:hover:bg-[#C25E5E]/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="size-4" />
                    </button>
                    <SidebarTrigger className="hidden md:inline-flex" />
                </div>
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
                    {actions}
                </div>
            )}

            {tabs && (
                <TabsList className="w-full rounded-none bg-white/15 md:bg-transparent p-1 md:p-0 rounded-b-2xl md:rounded-b-md">
                    <TabsTrigger value="pending" className="text-white/90 data-[state=active]:text-slate-900 md:text-foreground">Pending</TabsTrigger>
                    <TabsTrigger value="history" className="text-white/90 data-[state=active]:text-slate-900 md:text-foreground">History</TabsTrigger>
                </TabsList>
            )}

            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Quick Search</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                                autoFocus
                                placeholder="Search pages, indent no., or product..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {filteredPages.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1">
                                    Pages
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {filteredPages.map((p) => (
                                        <button
                                            key={p.path}
                                            type="button"
                                            onClick={() => {
                                                navigate(p.path);
                                                setSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredIndents.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1">
                                    Indents
                                </p>
                                <div className="max-h-44 overflow-y-auto space-y-1">
                                    {filteredIndents.map((item, idx) => (
                                        <button
                                            key={`${item.indentNumber}-${idx}`}
                                            type="button"
                                            onClick={() => {
                                                navigate('/create-indent');
                                                setSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:border-purple-300 hover:bg-purple-50"
                                        >
                                            <span className="font-semibold text-slate-800 truncate pr-2">
                                                {item.indentNumber} — {item.productName}
                                            </span>
                                            <span className="text-[11px] text-slate-500 shrink-0">
                                                {item.indenterName}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
