import { createContext, useContext, useEffect, useState } from 'react';
import type { IndentSheet } from '@/types';

const storageKey = 'store-fms:hide-purchase-workflow';
export const purchaseWorkflowPaths = new Set(['pending-pos', 'create-po', 'po-history', 'get-purchase']);

export function canReceiveIndent(indent: IndentSheet, hidden: boolean) {
    if (indent.actual5) return false;
    return Boolean(indent.planned5) || (hidden && indent.indentType === 'Purchase'
        && Boolean(indent.actual1) && ['Regular', 'Regular Vendor', 'New Vendor'].includes(indent.vendorType));
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
