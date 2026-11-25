import { createContext, useContext, useEffect, useState } from 'react';
import type { IndentSheet } from '@/types';

const storageKey = 'store-fms:hide-purchase-workflow';
export const purchaseWorkflowPaths = new Set(['pending-pos', 'create-po', 'po-history', 'get-purchase']);

export function canReceiveIndent(
    indent: IndentSheet,
    hidden: boolean,
    iniciateSheet?: { indentNo: string; productName: string }[]
) {
    if (indent.actual5) return false;
    const isInitiated = Boolean(
        iniciateSheet?.some(
            (r) => r.indentNo === indent.indentNumber && r.productName === indent.productName
        )
    );
    return (
        Boolean(indent.planned5) ||
        isInitiated ||
        (hidden &&
            indent.indentType === 'Purchase' &&
            Boolean(indent.actual1) &&
            ['Regular', 'Regular Vendor', 'New Vendor'].includes(indent.vendorType))
    );
}

const APPROVED_STATUSES = new Set(['Approve', 'Approved', 'Regular', 'Regular Vendor', 'New Vendor']);

export function canInitiatePurchase(
    indent: IndentSheet,
    iniciateSheet?: { indentNo: string; productName: string }[]
): boolean {
    if (indent.indentType !== 'Purchase') return false;
    if (!indent.actual3 || indent.actual4 || indent.actual5) return false;
    const status = (indent.approvalStatus || indent.vendorType || '').trim();
    if (!APPROVED_STATUSES.has(status)) return false;
    if (
        iniciateSheet &&
        iniciateSheet.some(
            (r) => r.indentNo === indent.indentNumber && r.productName === indent.productName
        )
    ) {
        return false;
    }
    return true;
}

const WorkflowContext = createContext({ purchaseWorkflowHidden: false, setPurchaseWorkflowHidden: (_hidden: boolean) => {} });

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
    const [purchaseWorkflowHidden, setHidden] = useState(() => {
        try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
    });
    useEffect(() => {
        const sync = (event: StorageEvent) => {
            if (event.key === storageKey || event.key === null) setHidden(event.newValue === 'true');
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);
    function setPurchaseWorkflowHidden(hidden: boolean) {
        // Persist before changing the UI so failed storage writes can be reported.
        localStorage.setItem(storageKey, String(hidden));
        setHidden(hidden);
    }
    return <WorkflowContext.Provider value={{ purchaseWorkflowHidden, setPurchaseWorkflowHidden }}>{children}</WorkflowContext.Provider>;
}

export const useWorkflow = () => useContext(WorkflowContext);
