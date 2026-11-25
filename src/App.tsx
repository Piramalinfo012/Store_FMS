import './AppMotion.css';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/components/element/Sidebar';
import MobileBottomNav from '@/components/element/MobileBottomNav';
import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { RouteAttributes } from './types';

export default ({ routes }: { routes: RouteAttributes[] }) => {
    const { pathname } = useLocation();
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="flex w-full h-dvh overflow-hidden">
                <SidebarProvider>
                    <Sidebar items={routes} />
                    <SidebarInset>
                        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain rounded-md pb-20 md:pb-0">
                            <div key={pathname} className="store-page-enter min-h-full">
                                <Outlet />
                            </div>
                        </main>
                    </SidebarInset>
                    <MobileBottomNav items={routes} />
                </SidebarProvider>
        </div>
    );
};
