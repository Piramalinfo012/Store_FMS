import { useWorkflow, purchaseWorkflowPaths, canReceiveIndent, canInitiatePurchase } from '@/context/WorkflowContext';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarHeader,
    SidebarFooter,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import type { RouteAttributes } from '@/types';
import { RotateCw, ShoppingCart } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn, APP_VERSION } from '@/lib/utils';
import Logo from './Logo';

export default ({ items }: { items: RouteAttributes[] }) => {
    // console.log("items", items);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { purchaseWorkflowHidden } = useWorkflow();
    const { indentSheet, iniciateSheet, updateAll, allLoading } = useSheets();
    const { user } = useAuth();
    const { setOpenMobile } = useSidebar();

    const allItems = useMemo(
        () =>
            items.filter((item) => {
                if (purchaseWorkflowHidden && purchaseWorkflowPaths.has(item.path)) return false;
                if (item.gateKey && !user?.[item.gateKey]) return false;
                return true;
            }),
        [items, purchaseWorkflowHidden, user]
    );

    const notificationCount = (item: RouteAttributes) => {
        if (item.path === 'receive-items') {
            return indentSheet.filter((indent) =>
                canReceiveIndent(indent, purchaseWorkflowHidden, iniciateSheet)
            ).length;
        }
        if (item.path === 'initiate-purchase') {
            return indentSheet.filter((indent) => canInitiatePurchase(indent, iniciateSheet)).length;
        }
        return item.notifications(indentSheet);
    };

    return (
        <Sidebar side="left" variant="inset" collapsible="offcanvas">
            <SidebarHeader className="store-nav-header p-3 border-b-1">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <Logo />

                        <div>
                            <h2 className="text-xl font-bold">Store App</h2>
                            <p className="text-sm">Management System</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="size-7" aria-label="Refresh data" title="Refresh data" onClick={() => updateAll()} disabled={allLoading}>
                        <RotateCw className={allLoading ? "animate-spin" : undefined} />
                    </Button>
                </div>
                <SidebarSeparator />
            </SidebarHeader>
            <SidebarContent className="store-nav-content py-1 border-b-1">
                <SidebarGroup>
                    <SidebarMenu>
                        {allItems
                            .map((item, i) => (
                                <SidebarMenuItem key={i}>
                                    <SidebarMenuButton
                                        aria-label={item.name}
                                        title={item.name}
                                        className={cn(
                                            "rounded-md py-5 flex justify-between font-medium opacity-100! visible!",
                                            pathname.slice(1) === item.path
                                                ? "store-nav-active"
                                                : "store-nav-idle"
                                        )}
                                        onClick={() => {
                                            navigate(item.path);
                                            setOpenMobile(false);
                                        }}
                                        isActive={pathname.slice(1) === item.path}
                                    >
                                        <div className="flex gap-2 items-center opacity-100! visible!">
                                            <span className="opacity-100! visible!">{item.icon}</span>
                                            <span className="opacity-100! visible!">{item.name}</span>
                                        </div>
                                        {notificationCount(item) !== 0 && (
                                            <span className="bg-destructive text-secondary  w-[1.3rem] h-[1.3rem] rounded-full text-xs grid place-items-center text-center">
                                                {notificationCount(item)}
                                            </span>
                                        )}
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="store-nav-footer">
                <div className="p-2 text-center text-sm">
                    Developed By <span className="text-primary">Deepak Sahu</span>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{APP_VERSION}</p>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
};
