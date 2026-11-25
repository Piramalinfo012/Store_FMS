import { fetchSheet } from '@/lib/fetchers';
import type { IndentSheet, IniciateSheet, InventorySheet, MasterSheet, PoMasterSheet, ReceivedSheet, VenderMasterSheet } from '@/types';
import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SheetsState {
    updateReceivedSheet: () => void;
    updatePoMasterSheet: () => void;
    updateIndentSheet: () => void;
    updateIniciateSheet: () => void;
    updateVenderMasterSheet: () => void;
    updateAll: () => void;

    indentSheet: IndentSheet[];
    iniciateSheet: IniciateSheet[];
    venderMasterSheet: VenderMasterSheet[];
    poMasterSheet: PoMasterSheet[];
    receivedSheet: ReceivedSheet[];
    inventorySheet: InventorySheet[];
    masterSheet: MasterSheet | undefined;

    indentLoading: boolean;
    iniciateLoading: boolean;
    venderMasterLoading: boolean;
    poMasterLoading: boolean;
    receivedLoading: boolean;
    inventoryLoading: boolean;
    allLoading: boolean;
}

const SheetsContext = createContext<SheetsState | null>(null);

export const SheetsProvider = ({ children }: { children: React.ReactNode }) => {
    const [indentSheet, setIndentSheet] = useState<IndentSheet[]>([]);
    const [iniciateSheet, setIniciateSheet] = useState<IniciateSheet[]>([]);
    const [venderMasterSheet, setVenderMasterSheet] = useState<VenderMasterSheet[]>([]);
    const [receivedSheet, setReceivedSheet] = useState<ReceivedSheet[]>([]);
    const [poMasterSheet, setPoMasterSheet] = useState<PoMasterSheet[]>([]);
    const [inventorySheet, setInventorySheet] = useState<InventorySheet[]>([]);
    const [masterSheet, setMasterSheet] = useState<MasterSheet>();

    const [indentLoading, setIndentLoading] = useState(true);
    const [iniciateLoading, setIniciateLoading] = useState(true);
    const [venderMasterLoading, setVenderMasterLoading] = useState(true);
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
    async function updateIniciateSheet() {
        setIniciateLoading(true);
        const res = await fetchSheet('INICIATE');
        setIniciateSheet(res as IniciateSheet[]);
        setIniciateLoading(false);
    }
    async function updateVenderMasterSheet() {
        setVenderMasterLoading(true);
        try {
            const res = await fetchSheet('Vender Master');
            setVenderMasterSheet(
                (res as VenderMasterSheet[]).filter((v) => v.vendorName && String(v.vendorName).trim() !== '')
            );
        } catch {
            setVenderMasterSheet([]);
        } finally {
            setVenderMasterLoading(false);
        }
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
                updateIniciateSheet(),
                updateVenderMasterSheet(),
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
                updateIniciateSheet,
                updateVenderMasterSheet,
                updatePoMasterSheet,
                updateReceivedSheet,
                updateAll,
                indentSheet,
                iniciateSheet,
                venderMasterSheet,
                poMasterSheet,
                inventorySheet,
                receivedSheet,
                indentLoading,
                iniciateLoading,
                venderMasterLoading,
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
