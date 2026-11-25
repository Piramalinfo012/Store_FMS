import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { useWorkflow, purchaseWorkflowPaths, canReceiveIndent } from '@/context/WorkflowContext';
import { useSidebar } from '@/components/ui/sidebar';
import type { RouteAttributes } from '@/types';
import { cn } from '@/lib/utils';

export default function MobileBottomNav({ items }: { items: RouteAttributes[] }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();
    const { indentSheet } = useSheets();
    const { purchaseWorkflowHidden } = useWorkflow();
    const { toggleSidebar } = useSidebar();

    const visibleItems = useMemo(
        () =>
            items.filter((item) => {
                if (purchaseWorkflowHidden && purchaseWorkflowPaths.has(item.path)) return false;
                if (item.gateKey && !user?.[item.gateKey]) return false;
                return true;
            }),
        [items, purchaseWorkflowHidden, user]
    );

    // Pick top 4 primary tabs for the bottom bar; remaining items are accessible via "More"
    const primaryItems = useMemo(() => visibleItems.slice(0, 4), [visibleItems]);

    const getNotificationCount = (item: RouteAttributes) =>
        item.path === 'receive-items'
            ? indentSheet.filter((indent) => canReceiveIndent(indent, purchaseWorkflowHidden)).length
            : item.notifications(indentSheet);

    const currentPath = pathname.slice(1);

    return (
        <nav
            aria-label="Mobile bottom navigation"
            className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#C9BDAF] bg-[#FAF8F4]/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(31,38,33,0.08)] pb-[env(safe-area-inset-bottom)]"
        >
            <div className="grid grid-cols-5 h-16 px-1">
                {primaryItems.map((item) => {
                    const isActive = currentPath === item.path;
                    const count = getNotificationCount(item);

                    return (
                        <button
                            key={item.path || 'dashboard'}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold transition-all active:scale-95',
                                isActive ? 'text-[#4F6354]' : 'text-[#556158] hover:text-[#1F2621]'
                            )}
                        >
                            <div
                                className={cn(
                                    'relative flex items-center justify-center rounded-full px-3 py-1 transition-colors',
                                    isActive ? 'bg-[#D9E1D9] text-[#4F6354]' : 'bg-transparent'
                                )}
                            >
                                {item.icon}
                                {count > 0 && (
                                    <span className="absolute -top-1 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C25E5E] px-1 text-[9px] font-bold text-white shadow-xs">
                                        {count > 99 ? '99+' : count}
                                    </span>
                                )}
                            </div>
                            <span className="max-w-full truncate leading-none">{item.name}</span>
                            {isActive && <span className="size-1 rounded-full bg-[#687F6E]" />}
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={() => toggleSidebar()}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold text-[#556158] hover:text-[#4F6354] transition-all active:scale-95"
                >
                    <div className="flex items-center justify-center rounded-full px-3 py-1 bg-[#EAE4DA] text-[#2A332C]">
                        <Menu size={20} />
                    </div>
                    <span className="leading-none">More</span>
                </button>
            </div>
        </nav>
    );
}
