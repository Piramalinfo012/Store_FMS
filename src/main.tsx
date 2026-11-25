import { WorkflowProvider, useWorkflow, purchaseWorkflowPaths, canInitiatePurchase } from '@/context/WorkflowContext';
import '@/index.css';
import '@/FormStyles.css';

import React, { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from '@/context/AuthContext.tsx';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Login from './components/views/Login';
import CreateIndent from './components/views/CreateIndent';
import Dashboard from './components/views/Dashboard';
import App from './App';
import ApproveIndent from '@/components/views/ApproveIndent';
import InitiatePurchase from '@/components/views/InitiatePurchase';
import { SheetsProvider } from './context/SheetsContext';
import VendorUpdate from './components/views/VendorUpdate';
import RateApproval from './components/views/RateApproval';
import ReceiveItems from './components/views/ReceiveItems';
import StoreOutApproval from './components/views/StoreOutApproval';
import Handover from './components/views/Handover';
import GetPurchase from './components/views/getPurchase';
import TrainingVideo from './components/views/TrainingVideo';
import type { RouteAttributes } from './types';
import {
    LayoutDashboard,
    ClipboardList,
    UserCheck,
    Users,
    ClipboardCheck,
    Truck,
    PackageCheck,
    Handshake,
    ShieldUser,
    FilePlus2,
    ListTodo,
    Package2,
    Store,
    VideoIcon,
    ShoppingCart,
} from 'lucide-react';
import type { UserPermissions } from './types/sheets';
import Administration from './components/views/Administration';
import Loading from './components/views/Loading';
import CreatePO from './components/views/CreatePO';
import PendingIndents from './components/views/PendingIndents';
import Order from './components/views/Order';
import Inventory from './components/views/Inventory';


class AppErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('AppErrorBoundary caught error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-[#FAF8F4] p-6 text-center text-[#1F2621]">
                    <p className="text-base font-semibold">Something went wrong while rendering the page.</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-lg bg-[#556B5B] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F6354]"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { loggedIn, loading } = useAuth();
    const location = useLocation();
    if (loading) return <Loading />;
    if (!loggedIn) {
        const target = `${location.pathname}${location.search}`;
        if (target && target !== '/login') {
            sessionStorage.setItem('redirectAfterLogin', target);
        }
        return <Navigate to="/login" />;
    }
    return <>{children}</>;
}

function GatedRoute({
    children,
    identifier,
    path,
}: {
    children: React.ReactNode;
    identifier?: keyof UserPermissions;
    path?: string;
}) {
    const { user } = useAuth();
    const { purchaseWorkflowHidden } = useWorkflow();
    if (purchaseWorkflowHidden && path && purchaseWorkflowPaths.has(path)) return <Navigate to="/receive-items" replace />;
    console.log("user", user);
    console.log("identifier", identifier);
    if (!identifier) return children;
    if (!user[identifier]) {
        console.log("ram")
        return <Navigate to="/" replace />;
    }
    return children;
}

const routes: RouteAttributes[] = [
    {
        path: '',
        name: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        element: <Dashboard />,
        notifications: () => 0,
    },
    {
        path: 'inventory',
        name: 'Inventory',
        icon: <Store size={20} />,
        element: <Inventory />,
        notifications: () => 0,
    },
    {
        path: 'create-indent',
        gateKey: 'createIndent',
        name: 'Create Indent',
        icon: <ClipboardList size={20} />,
        element: <CreateIndent />,
        notifications: () => 0,
    },
    {
        path: 'approve-indent',
        gateKey: 'indentApprovalView',
        name: 'Approve Indent',
        icon: <ClipboardCheck size={20} />,
        element: <ApproveIndent />,
        notifications: (sheets) =>
            sheets.filter(
                (sheet) =>
                    sheet.planned3 !== '' &&
                    sheet.actual3 === '' &&
                    sheet.indentType === 'Purchase'
            ).length,
    },
    {
        path: 'initiate-purchase',
        gateKey: 'createPo',
        name: 'Initiate Purchase',
        icon: <ShoppingCart size={20} />,
        element: <InitiatePurchase />,
        notifications: (sheets) => sheets.filter((sheet) => canInitiatePurchase(sheet)).length,
    },
    // {
    //     path: 'vendor-rate-update',
    //     gateKey: 'updateVendorView',
    //     name: 'Vendor Rate Update',
    //     icon: <UserCheck size={20} />,
    //     element: <VendorUpdate />,
    //     notifications: (sheets) =>
    //         sheets.filter((sheet) => sheet.planned2 !== '' && sheet.actual2 === '').length,
    // },
    // {
    //     path: 'three-party-approval',
    //     gateKey: 'threePartyApprovalView',
    //     name: 'Three Party Approval',
    //     icon: <Users size={20} />,
    //     element: <RateApproval />,
    //     notifications: (sheets) =>
    //         sheets.filter(
    //             (sheet) =>
    //                 sheet.planned3 !== '' &&
    //                 sheet.actual3 === '' &&
    //                 sheet.vendorType === 'Three Party'
    //         ).length,
    // },
    {
        path: 'receive-items',
        gateKey: 'receiveItemView',
        name: 'Receive Items',
        icon: <Truck size={20} />,
        element: <ReceiveItems />,
        notifications: (sheets) =>
            sheets.filter((sheet) => sheet.planned5 !== '' && sheet.actual5 === '').length,
    },

    {
        path: 'store-out-approval',
        gateKey: 'storeOutApprovalView',
        name: 'Store Out Approval',
        icon: <PackageCheck size={20} />,
        element: <StoreOutApproval />,
        notifications: (sheets) =>
            sheets.filter(
                (sheet) =>
                    sheet.planned6 !== '' &&
                    sheet.actual6 === '' &&
                    sheet.indentType === 'Store Out'
            ).length,
    },
    {
        path: 'handover',
        gateKey: 'storeOutApprovalView',
        name: 'Handover',
        icon: <Handshake size={20} />,
        element: <Handover />,
        notifications: (sheets) =>
            sheets.filter(
                (sheet) =>
                    sheet.planned7 !== '' &&
                    sheet.actual7 === '' &&
                    sheet.issueStatus === 'Approved' &&
                    sheet.indentType === 'Store Out'
            ).length,
    },
    {
        path: 'administration',
        gateKey: 'administrate',
        name: 'Adminstration',
        icon: <ShieldUser size={20} />,
        element: <Administration />,
        notifications: () => 0,
    },
    {

        path: 'training-video',
        name: 'Training Video',
        icon: <VideoIcon size={20} />,
        element: <TrainingVideo />,
        notifications: () => 0,
    },
];

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppErrorBoundary>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <WorkflowProvider><SheetsProvider>
                                        <App routes={routes} />
                                    </SheetsProvider></WorkflowProvider>
                                </ProtectedRoute>
                            }
                        >
                            {routes.map(({ path, element, gateKey }) => {
                                return <Route
                                    key={path || 'index'}
                                    path={path}
                                    element={<GatedRoute identifier={gateKey} path={path}>{element}</GatedRoute>}
                                />
                            })}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </AppErrorBoundary>
    </StrictMode>
);
