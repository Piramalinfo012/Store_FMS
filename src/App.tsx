import './AppMotion.css';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/components/element/Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import type { RouteAttributes } from './types';

export default ({ routes }: { routes: RouteAttributes[] }) => {
    const { pathname } = useLocation();
    return (
        <div className="flex w-full h-screen">
                <SidebarProvider>
                    <Sidebar items={routes} />
                    <SidebarInset>
                        <main className="flex-1 overflow-y-auto rounded-md">
                            <div key={pathname} className="store-page-enter h-full">
                                <Outlet />
                            </div>
                        </main>
                    </SidebarInset>
                </SidebarProvider>
        </div>
    );
};
