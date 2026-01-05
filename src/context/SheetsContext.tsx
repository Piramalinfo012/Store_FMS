import { fetchSheet } from '@/lib/fetchers';
import type { IndentSheet, InventorySheet, MasterSheet, PoMasterSheet, ReceivedSheet } from '@/types';
import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SheetsState {
    updateReceivedSheet: () => void;
    updatePoMasterSheet: () => void;
    updateIndentSheet: () => void;
    updateAll: () => void;

    indentSheet: IndentSheet[];
    poMasterSheet: PoMasterSheet[];
    receivedSheet: ReceivedSheet[];
    inventorySheet: InventorySheet[];
    masterSheet: MasterSheet | undefined;

    indentLoading: boolean;
    poMasterLoading: boolean;
    receivedLoading: boolean;
    inventoryLoading: boolean;
    allLoading: boolean;
}

const SheetsContext = createContext<SheetsState | null>(null);

export const SheetsProvider = ({ children }: { children: React.ReactNode }) => {
    const [indentSheet, setIndentSheet] = useState<IndentSheet[]>([]);
    const [receivedSheet, setReceivedSheet] = useState<ReceivedSheet[]>([]);
    const [poMasterSheet, setPoMasterSheet] = useState<PoMasterSheet[]>([]);
    const [inventorySheet, setInventorySheet] = useState<InventorySheet[]>([]);
    const [masterSheet, setMasterSheet] = useState<MasterSheet>();

    const [indentLoading, setIndentLoading] = useState(true);
    const [poMasterLoading, setPoMasterLoading] = useState(true);
    const [receivedLoading, setReceivedLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [allLoading, setAllLoading] = useState(true);

    async function updateIndentSheet() {
        setIndentLoading(true);
        const res = await fetchSheet('INDENT');
        setIndentSheet(res as IndentSheet[]);
        setIndentLoading(false);
    }
    async function updateReceivedSheet() {
        setReceivedLoading(true);
        const res = await fetchSheet('RECEIVED');
        setReceivedSheet(res as ReceivedSheet[]);
        setReceivedLoading(false);
    }

    async function updatePoMasterSheet() {
        setPoMasterLoading(true);
        const res = await fetchSheet('PO MASTER');
        setPoMasterSheet(res as PoMasterSheet[]);
        setPoMasterLoading(false);
    }

    async function updateInventorySheet() {
        setInventoryLoading(true);
        const res = await fetchSheet('INVENTORY');
        setInventorySheet(res as InventorySheet[]);
        setInventoryLoading(false);
    }
    async function updateMasterSheet() {
        const res = await fetchSheet('MASTER');
        setMasterSheet(res as MasterSheet);
    }

    async function updateAll() {
        setAllLoading(true);
        try {
            await Promise.all([
                updateMasterSheet(),
                updateReceivedSheet(),
                updateIndentSheet(),
                updatePoMasterSheet(),
                updateInventorySheet(),
            ]);
        } finally {
            setAllLoading(false);
        }
    }

    useEffect(() => {
        try {
            updateAll();
            toast.success('Fetched all the data');
        } catch (e) {
            toast.error('Something went wrong while fetching data');
        } finally {
        }
    }, []);

    return (
        <SheetsContext.Provider
            value={{
                updateIndentSheet,
                updatePoMasterSheet,
                updateReceivedSheet,
                updateAll,
                indentSheet,
                poMasterSheet,
                inventorySheet,
                receivedSheet,
                indentLoading,
                masterSheet,
                poMasterLoading,
                receivedLoading,
                inventoryLoading,
                allLoading,
            }}
        >
            {children}
        </SheetsContext.Provider>
    );
};

export const useSheets = () => useContext(SheetsContext)!;
