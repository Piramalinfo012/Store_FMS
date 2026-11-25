import Heading from '../element/Heading';

import { useEffect, useMemo, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import type { ColumnDef } from '@tanstack/react-table';
import { Pill } from '../ui/pill';
import { Download, Filter, Store } from 'lucide-react';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface InventoryTable {
    itemName: string;
    groupHead: string;
    uom: string;
    status: string;
    opening: number;
    rate: number;
    indented: number;
    approved: number;
    purchaseQuantity: number;
    outQuantity: number;
    current: number;
    totalPrice: number;
}

type StockFilter = 'all' | 'out_of_stock' | 'low_stock' | 'in_stock' | 'excess';

const statusLabels: Record<Exclude<StockFilter, 'all'>, string> = {
    out_of_stock: 'Out of Stock',
    low_stock: 'Low Stock',
    in_stock: 'In Stock',
    excess: 'Excess',
};

function getStockStatus(item: InventoryTable): Exclude<StockFilter, 'all'> {
    if (item.current === 0) return 'out_of_stock';
    const code = item.status.toLowerCase();
    if (code === 'red') return 'low_stock';
    if (code === 'purple') return 'excess';
    return 'in_stock';
}

function escapeCsvCell(value: string | number) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
}

export default () => {
    const { inventorySheet, inventoryLoading } = useSheets();

    const [tableData, setTableData] = useState<InventoryTable[]>([]);
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');

    useEffect(() => {
        setTableData(
            inventorySheet
                .filter((i) => Boolean(i.itemName && String(i.itemName).trim() !== ''))
                .map((i) => ({
                    totalPrice: i.totalPrice,
                    approvedIndents: i.approved,
                    uom: i.uom,
                    rate: i.individualRate,
                    current: i.current,
                    status: i.colorCode,
                    indented: i.indented,
                    opening: i.opening,
                    itemName: i.itemName,
                    groupHead: i.groupHead,
                    purchaseQuantity: i.purchaseQuantity,
                    approved: i.approved,
                    outQuantity: i.outQuantity,
                }))
        );
    }, [inventorySheet]);

    const statusCounts = useMemo(() => {
        const counts = { out_of_stock: 0, low_stock: 0, in_stock: 0, excess: 0 };
        for (const item of tableData) {
            counts[getStockStatus(item)]++;
        }
        return counts;
    }, [tableData]);

    const filteredData = useMemo(() => {
        if (stockFilter === 'all') return tableData;
        return tableData.filter((item) => getStockStatus(item) === stockFilter);
    }, [tableData, stockFilter]);

    function handleExportExcel() {
        const headers = [
            'Item',
            'Group Head',
            'UOM',
            'Rate',
            'Status',
            'Indented',
            'Approved',
            'Purchased',
            'Issued',
            'Quantity',
            'Total Price',
        ];

        const rows = filteredData.map((item) => [
            item.itemName,
            item.groupHead,
            item.uom,
            item.rate,
            statusLabels[getStockStatus(item)],
            item.indented,
            item.approved,
            item.purchaseQuantity,
            item.outQuantity,
            item.current,
            item.totalPrice,
        ]);

        const csvContent = [
            headers.map(escapeCsvCell).join(','),
            ...rows.map((row) => row.map(escapeCsvCell).join(',')),
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `inventory-${stockFilter}-${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    const columns: ColumnDef<InventoryTable>[] = [
        {
            accessorKey: 'itemName',
            header: 'Item',
            cell: ({ row }) => {
                return (
                    <div className="text-wrap max-w-40 text-center">{row.original.itemName}</div>
                );
            },
        },
        { accessorKey: 'groupHead', header: 'Group Head' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => {
                return <>&#8377;{row.original.rate}</>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const code = row.original.status.toLowerCase();
                if (row.original.current === 0) {
                    return <Pill variant="reject">Out of Stock</Pill>;
                }
                if (code === 'red') {
                    return <Pill variant="pending">Low Stock</Pill>;
                }
                if (code === 'purple') {
                    return <Pill variant="primary">Excess</Pill>;
                }
                return <Pill variant="secondary">In Stock</Pill>;
            },
        },
        { accessorKey: 'indented', header: 'Indented' },
        { accessorKey: 'approved', header: 'Approved' },
        { accessorKey: 'purchaseQuantity', header: 'Purchased' },
        { accessorKey: 'outQuantity', header: 'Issued' },
        { accessorKey: 'current', header: 'Quantity' },
        {
            accessorKey: 'totalPrice',
            header: 'Total Price',

            cell: ({ row }) => {
                return <>&#8377;{row.original.totalPrice}</>;
            },
        },
    ];

    return (
        <div>
            <Heading heading="Inventory" subtext="View inveontory">
                <Store size={50} className="text-primary" />
            </Heading>

            <DataTable
                data={filteredData}
                columns={columns}
                dataLoading={inventoryLoading}
                searchFields={['itemName', 'groupHead', 'uom', 'status']}
                className="h-[80dvh]"
                extraActions={
                    <div className="flex items-center gap-2 shrink-0">
                        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                            <SelectTrigger
                                className={`!h-10 w-auto min-w-[175px] shrink-0 !rounded-full px-3.5 text-xs font-semibold border transition-colors ${
                                    stockFilter === 'out_of_stock'
                                        ? 'border-red-300 bg-red-50/90 text-red-800'
                                        : stockFilter === 'low_stock'
                                          ? 'border-amber-300 bg-amber-50/90 text-amber-800'
                                          : stockFilter === 'in_stock'
                                            ? 'border-emerald-300 bg-emerald-50/90 text-emerald-800'
                                            : stockFilter === 'excess'
                                              ? 'border-purple-300 bg-purple-50/90 text-purple-800'
                                              : 'border-[#C9BDAF] bg-[#FAF8F4] text-[#2F4034]'
                                }`}
                            >
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                    <Filter className="size-3.5 shrink-0" />
                                    <span>
                                        {stockFilter === 'all'
                                            ? `All Stock (${tableData.length})`
                                            : `${statusLabels[stockFilter]} (${statusCounts[stockFilter]})`}
                                    </span>
                                </span>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 p-1 shadow-lg">
                                <SelectItem value="all" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-slate-800">
                                            <span className="size-2.5 rounded-full bg-indigo-500" />
                                            All Stock
                                        </span>
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                                            {tableData.length}
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="out_of_stock" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-red-700">
                                            <span className="size-2.5 rounded-full bg-red-500" />
                                            Out of Stock
                                        </span>
                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                            {statusCounts.out_of_stock}
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="low_stock" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-amber-700">
                                            <span className="size-2.5 rounded-full bg-amber-500" />
                                            Low Stock
                                        </span>
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                            {statusCounts.low_stock}
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="in_stock" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-emerald-700">
                                            <span className="size-2.5 rounded-full bg-emerald-500" />
                                            In Stock
                                        </span>
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                            {statusCounts.in_stock}
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="excess" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-purple-700">
                                            <span className="size-2.5 rounded-full bg-purple-500" />
                                            Excess
                                        </span>
                                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                                            {statusCounts.excess}
                                        </span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            size="icon"
                            onClick={handleExportExcel}
                            disabled={inventoryLoading || filteredData.length === 0}
                            className="size-10 shrink-0 rounded-full bg-[#687F6E] hover:bg-[#4F6354] text-[#FAF8F4] shadow-sm hover:shadow-md transition-all"
                            title="Export Excel"
                            aria-label="Export Excel"
                        >
                            <Download className="size-4" />
                        </Button>
                    </div>
                }
            />
        </div>
    );
};
