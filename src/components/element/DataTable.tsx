'use client';

import {
    type ColumnDef,
    type SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useState, type ReactNode } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Package,
    Search,
    X,
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchFields?: string[];
    dataLoading?: boolean;
    children?: ReactNode;
    className?: string;
    extraActions?: ReactNode;
}

function globalFilterFn<TData>(row: TData, columnIds: string[], filterValue: string) {
    return columnIds.some((columnId) => {
        const value = (row as any)[columnId];
        return String(value ?? '')
            .toLowerCase()
            .includes(filterValue.toLowerCase());
    });
}

export default function DataTable<TData, TValue>({
    columns,
    data,
    searchFields = [],
    dataLoading,
    children: _children, // <-- underscore avoids TS unused variable error
    className,
    extraActions,
}: DataTableProps<TData, TValue>) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: (row, _, filterValue) =>
            globalFilterFn(row.original, searchFields, filterValue),
        initialState: {
            pagination: {
                pageSize: 25,
            },
        },
        state: {
            globalFilter,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
    });

    const filteredCount = table.getFilteredRowModel().rows.length;
    const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;
    const pageCount = table.getPageCount();

    return (
        <div className="p-4 sm:p-5 grid gap-4">
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center w-full gap-3 rounded-2xl border border-[#C9BDAF] bg-[#FAF8F4] p-3 shadow-xs">
                {searchFields.length !== 0 ? (
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#687F6E]" />
                        <Input
                            placeholder="Search records..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="h-10 w-full pl-10 pr-9 rounded-full border-[#C9BDAF] bg-[#F4EFE8]/70 focus:bg-white"
                        />
                        {globalFilter && (
                            <button
                                type="button"
                                onClick={() => setGlobalFilter('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#556158] hover:bg-[#D9E1D9] hover:text-[#1F2621]"
                                aria-label="Clear search"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div />
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="hidden sm:inline-flex items-center rounded-full bg-[#D9E1D9] px-3 py-1 text-xs font-semibold text-[#2F4034] border border-[#A7B5A7]">
                        {filteredCount} {filteredCount === 1 ? 'record' : 'records'}
                    </span>
                    {extraActions && extraActions}
                </div>
            </div>

            {/* Table Card */}
            <div className="rounded-2xl border border-[#C9BDAF] bg-[#FAF8F4] shadow-sm overflow-hidden">
                <div className="relative max-w-full overflow-x-auto">
                    <Table>
                        <ScrollArea
                            className={cn('h-[68dvh] w-full', className)}
                        >
                            <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#EAE4DA] via-[#F4EFE8] to-[#D9E1D9]/70 shadow-[0_1px_0_0_#C9BDAF]">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="hover:bg-transparent even:bg-transparent">
                                        {headerGroup.headers.map((header) => {
                                            const canSort = header.column.getCanSort();
                                            const sorted = header.column.getIsSorted();
                                            return (
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder ? null : canSort ? (
                                                        <button
                                                            type="button"
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-purple-100/60 hover:text-purple-900 transition-colors cursor-pointer"
                                                        >
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                            {sorted === 'asc' ? (
                                                                <ArrowUp className="size-3.5 text-purple-700" />
                                                            ) : sorted === 'desc' ? (
                                                                <ArrowDown className="size-3.5 text-purple-700" />
                                                            ) : (
                                                                <ArrowUpDown className="size-3 text-slate-400" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )
                                                    )}
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {dataLoading ? (
                                    Array.from({ length: 12 }).map((_, i) => (
                                        <TableRow
                                            key={`skeleton-${i}`}
                                            className="hover:bg-transparent"
                                        >
                                            {columns.map((_, j) => (
                                                <TableCell key={`skeleton-cell-${j}`}>
                                                    <Skeleton className="h-4 w-full rounded-md" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && 'selected'}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="hover:bg-transparent even:bg-transparent">
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-52 text-center"
                                        >
                                            <div className="flex flex-col justify-center items-center w-full gap-2.5">
                                                <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                                    <Package className="size-7" />
                                                </div>
                                                <p className="text-base font-semibold text-slate-600">
                                                    No Records Found
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Try adjusting your search or filter criteria
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </ScrollArea>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Rows per page:</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => table.setPageSize(Number(value))}
                        >
                            <SelectTrigger className="h-8 w-[76px] rounded-lg bg-white text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50, 100].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-medium mr-2">
                            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg bg-white"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            aria-label="First page"
                        >
                            <ChevronsLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg bg-white"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg bg-white"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            aria-label="Next page"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg bg-white"
                            onClick={() => table.setPageIndex(pageCount - 1)}
                            disabled={!table.getCanNextPage()}
                            aria-label="Last page"
                        >
                            <ChevronsRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
