import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { ClipLoader as Loader } from 'react-spinners';
import { ClipboardList, Filter, Trash2, Search, Plus, Send, Package } from 'lucide-react';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import { sendIndentWhatsAppNotifications } from '@/lib/whatsapp';
import type { IndentSheet } from '@/types';
import { useSheets } from '@/context/SheetsContext';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import { Pill } from '../ui/pill';
import { formatDateTime } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useMemo, useState } from 'react';

interface IndentHistoryRow {
    date: string;
    indentNumber: string;
    indenterName: string;
    indentType: string;
    department: string;
    groupHead: string;
    productName: string;
    quantity: number;
    uom: string;
    areaOfUse: string;
    indentApprovedBy: string;
    attachment: string;
}

export default () => {
    const { indentSheet: sheet, indentLoading, updateIndentSheet, masterSheet: options } = useSheets();
    const [indentSheet, setIndentSheet] = useState<IndentSheet[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [typeFilter, setTypeFilter] = useState<'all' | 'Purchase' | 'Store Out'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTermGroupHead, setSearchTermGroupHead] = useState("");
    const [searchTermProductName, setSearchTermProductName] = useState("");

    useEffect(() => {
        setIndentSheet(sheet);
    }, [sheet]);

    const tableData = useMemo<IndentHistoryRow[]>(() => {
        return [...indentSheet]
            .reverse()
            .map((item) => ({
                date: item.timestamp ? formatDateTime(new Date(item.timestamp)) : '',
                indentNumber: item.indentNumber,
                indenterName: item.indenterName,
                indentType: item.indentType,
                department: item.department,
                groupHead: item.groupHead,
                productName: item.productName,
                quantity: item.quantity,
                uom: item.uom,
                areaOfUse: item.areaOfUse,
                indentApprovedBy: item.indentApprovedBy,
                attachment: item.attachment,
            }));
    }, [indentSheet]);

    const typeCounts = useMemo(() => {
        let purchase = 0;
        let storeOut = 0;
        for (const item of tableData) {
            if (item.indentType === 'Purchase') purchase++;
            else if (item.indentType === 'Store Out') storeOut++;
        }
        return { purchase, storeOut };
    }, [tableData]);

    const filteredTableData = useMemo(() => {
        if (typeFilter === 'all') return tableData;
        return tableData.filter((item) => item.indentType === typeFilter);
    }, [tableData, typeFilter]);

    const columns: ColumnDef<IndentHistoryRow>[] = [
        { accessorKey: 'date', header: 'Timestamp' },
        { accessorKey: 'indentNumber', header: 'Indent No.' },
        { accessorKey: 'indenterName', header: 'Indenter' },
        {
            accessorKey: 'indentType',
            header: 'Type',
            cell: ({ row }) => (
                <Pill variant={row.original.indentType === 'Purchase' ? 'primary' : 'secondary'}>
                    {row.original.indentType}
                </Pill>
            ),
        },
        { accessorKey: 'department', header: 'Location' },
        { accessorKey: 'groupHead', header: 'Group Head' },
        {
            accessorKey: 'productName',
            header: 'Product Name',
            cell: ({ getValue }) => (
                <div className="max-w-[180px] break-words whitespace-normal">
                    {getValue() as string}
                </div>
            ),
        },
        { accessorKey: 'quantity', header: 'Qty' },
        { accessorKey: 'uom', header: 'UOM' },
        { accessorKey: 'areaOfUse', header: 'Area Of Use' },
        { accessorKey: 'indentApprovedBy', header: 'Approved By' },
        {
            accessorKey: 'attachment',
            header: 'Attachment',
            cell: ({ row }) =>
                row.original.attachment ? (
                    <a
                        href={row.original.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-medium hover:underline"
                    >
                        View
                    </a>
                ) : (
                    <span className="text-muted-foreground">-</span>
                ),
        },
    ];

    const schema = z.object({
        indenterName: z.string().nonempty(),
        indentApproveBy: z.string().nonempty(),
        indentType: z.enum(['Purchase', 'Store Out'], { required_error: 'Select a status' }),
        products: z
            .array(
                z.object({
                    department: z.string().nonempty(),
                    groupHead: z.string().nonempty(),
                    productName: z.string().nonempty(),
                    quantity: z.coerce.number().gt(0, 'Must be greater than 0'),
                    uom: z.string().nonempty(),
                    areaOfUse: z.string().nonempty(),
                    attachment: z.instanceof(File).optional(),
                    specifications: z.string().optional(),
                })
            )
            .min(1, 'At least one product is required'),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            indenterName: '',
            indentApproveBy: '',
            indentType: undefined,
            products: [
                {
                    attachment: undefined,
                    uom: '',
                    productName: '',
                    specifications: '',
                    quantity: 1,
                    areaOfUse: '',
                    groupHead: '',
                    department: '',
                },
            ],
        },
    });

    const products = form.watch('products');
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'products',
    });

    async function onSubmit(data: z.infer<typeof schema>) {
        try {
            const rows: Partial<IndentSheet>[] = [];
            // Calculate next Indent Number based on Max ID
            const maxIndentNumber = indentSheet.reduce((max, item) => {
                const parts = item.indentNumber.split('-');
                if (parts.length === 2) {
                    const num = parseInt(parts[1]);
                    return !isNaN(num) && num > max ? num : max;
                }
                return max;
            }, -1);
            const nextIndentNumber = `SI-${String(maxIndentNumber + 1).padStart(4, '0')}`;

            for (const product of data.products) {
                const row: Partial<IndentSheet> = {
                    timestamp: new Date().toISOString(),
                    indentNumber: nextIndentNumber,
                    indenterName: data.indenterName,
                    department: product.department,
                    areaOfUse: product.areaOfUse,
                    groupHead: product.groupHead,
                    productName: product.productName,
                    quantity: product.quantity,
                    uom: product.uom,
                    specifications: product.specifications || '',
                    indentApprovedBy: data.indentApproveBy,
                    indentType: data.indentType,
                };

                if (product.attachment !== undefined) {
                    row.attachment = await uploadFile(
                        product.attachment,
                        import.meta.env.VITE_IDENT_ATTACHMENT_FOLDER
                    );
                }

                rows.push(row);
            }
            // Move update after post to ensure fresh data
            await postToSheet(rows);
            updateIndentSheet();
            toast.success('Indent created successufully');

            // Send Maytapi WhatsApp notification only for Store Out requests on raise;
            // Purchase indent details SMS is sent only after approval in ApproveIndent with approved qty.
            if (data.indentType === 'Store Out') {
                sendIndentWhatsAppNotifications({
                    indentNumber: nextIndentNumber,
                    indentType: data.indentType,
                    indenterName: data.indenterName,
                    indentApprovedBy: data.indentApproveBy,
                    products: data.products,
                }).then((waRes) => {
                    if (!waRes.skipped && waRes.sent > 0) {
                        toast.success(`WhatsApp alert sent to ${waRes.sent} recipient(s)`);
                    } else if (!waRes.skipped && waRes.failed > 0) {
                        toast.error('WhatsApp alert failed to send. Check Maytapi credentials.');
                    }
                });
            }
            setOpenDialog(false);
            form.reset({
                indenterName: '',
                indentApproveBy: '',
                indentType: undefined,
                products: [
                    {
                        attachment: undefined,
                        uom: '',
                        productName: '',
                        specifications: '',
                        quantity: 1,
                        areaOfUse: '',
                        groupHead: '',
                        department: '',
                    },
                ],
            });
        } catch (_) {
            toast.error('Error while creating indent! Please try again');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Heading heading="Create Indent" subtext="View raised indents and raise a new indent">
                <ClipboardList size={50} className="text-primary" />
            </Heading>

            <DataTable
                data={filteredTableData}
                columns={columns}
                dataLoading={indentLoading}
                searchFields={[
                    'indentNumber',
                    'indenterName',
                    'department',
                    'groupHead',
                    'productName',
                    'areaOfUse',
                    'indentType',
                ]}
                className="h-[78dvh]"
                extraActions={
                    <div className="flex items-center gap-2 shrink-0">
                        <Select
                            value={typeFilter}
                            onValueChange={(v) => setTypeFilter(v as 'all' | 'Purchase' | 'Store Out')}
                        >
                            <SelectTrigger
                                className={`!h-10 w-auto min-w-[165px] shrink-0 !rounded-full px-3.5 text-xs font-semibold border transition-colors ${
                                    typeFilter === 'Purchase'
                                        ? 'border-blue-300 bg-blue-50/90 text-blue-800'
                                        : typeFilter === 'Store Out'
                                          ? 'border-emerald-300 bg-emerald-50/90 text-emerald-800'
                                          : 'border-[#C9BDAF] bg-[#FAF8F4] text-[#2F4034]'
                                }`}
                            >
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                    <Filter className="size-3.5 shrink-0" />
                                    <span>
                                        {typeFilter === 'all'
                                            ? `All Types (${tableData.length})`
                                            : typeFilter === 'Purchase'
                                              ? `Purchase (${typeCounts.purchase})`
                                              : `Store Out (${typeCounts.storeOut})`}
                                    </span>
                                </span>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl p-1 shadow-lg">
                                <SelectItem value="all" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium">
                                            <span className="size-2.5 rounded-full bg-[#687F6E]" />
                                            All Types
                                        </span>
                                        <span className="rounded-full bg-[#D9E1D9] px-2 py-0.5 text-[11px] font-bold text-[#2F4034]">
                                            {tableData.length}
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="Purchase" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-blue-700">
                                            <span className="size-2.5 rounded-full bg-blue-500" />
                                            Purchase
                                        </span>
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                            {typeCounts.purchase}
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="Store Out" className="rounded-lg my-0.5 cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <span className="flex items-center gap-2 font-medium text-emerald-700">
                                            <span className="size-2.5 rounded-full bg-emerald-500" />
                                            Store Out
                                        </span>
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                            {typeCounts.storeOut}
                                        </span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => setOpenDialog(true)}
                            className="h-10 shrink-0 rounded-full px-4 text-xs bg-[#687F6E] hover:bg-[#4F6354] text-[#FAF8F4] font-semibold gap-1.5 shadow-sm"
                        >
                            <Plus className="size-4" />
                            New Indent
                        </Button>
                    </div>
                }
            />

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 px-6 py-4 border-b border-slate-200/80">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm">
                                <ClipboardList className="size-5" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-lg font-bold text-slate-900">
                                    Raise New Indent
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-600">
                                    Fill in the indent details and add one or more products
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6 p-5 sm:p-6">
                    {/* Indent Information Card */}
                    <div className="form-section-card p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                            <div className="flex items-center justify-center size-8 rounded-lg bg-purple-50 text-purple-700">
                                <ClipboardList className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">Indent Details</h2>
                                <p className="text-xs text-slate-500">Provide requester and authorization information</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                            <FormField
                                control={form.control}
                                name="indenterName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Indenter Name
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter indenter name" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="indentType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Indent Type
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Purchase">Purchase</SelectItem>
                                                <SelectItem value="Store Out">Store Out</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="indentApproveBy"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Approved By
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter approved by" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center size-8 rounded-lg bg-indigo-50 text-indigo-700">
                                    <Package className="size-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-semibold text-slate-800">Product Items</h2>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                            {fields.length} {fields.length === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">Specify items, quantity, and requirements</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="self-start sm:self-auto border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 font-semibold gap-1.5 shadow-xs"
                                onClick={() =>
                                    append({
                                        department: '',
                                        groupHead: '',
                                        productName: '',
                                        quantity: 1,
                                        uom: '',
                                        areaOfUse: '',
                                        // @ts-ignore
                                        priority: undefined,
                                        attachment: undefined,
                                    })
                                }
                            >
                                <Plus className="size-4" />
                                Add Product
                            </Button>
                        </div>

                        {fields.map((field, index) => {
                            const groupHead = products[index]?.groupHead;
                            const productOptions = options?.groupHeads[groupHead] || [];

                            return (
                                <div
                                    key={field.id}
                                    className="form-product-panel p-5 sm:p-6 space-y-5"
                                >
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-xs">
                                                {index + 1}
                                            </span>
                                            <h3 className="text-sm font-semibold text-slate-800">
                                                Product Item {index + 1}
                                            </h3>
                                        </div>
                                        {fields.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 size-8 p-0 rounded-lg transition-colors"
                                                onClick={() => remove(index)}
                                                title="Remove Product"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid gap-5">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.department`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Location
                                                            <span className="text-destructive">*</span>
                                                        </FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select department" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {/* 🔍 Search Box */}
                                                                <div className="flex items-center border-b px-3 pb-3">
                                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    <input
                                                                        placeholder="Search departments..."
                                                                        value={searchTerm}
                                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                                        onKeyDown={(e) => e.stopPropagation()} // ✅ Prevent 1-letter freeze
                                                                        className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                    />
                                                                </div>

                                                                {/* Filtered List */}
                                                                {options?.departments
                                                                    .filter((dep) =>
                                                                        dep.toLowerCase().includes(searchTerm.toLowerCase())
                                                                    )
                                                                    .map((dep, i) => (
                                                                        <SelectItem key={i} value={dep}>
                                                                            {dep}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.groupHead`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Group Head
                                                            <span className="text-destructive">*</span>
                                                        </FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select group head" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {/* 🔍 Search Box */}
                                                                <div className="flex items-center border-b px-3 pb-3">
                                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    <input
                                                                        placeholder="Search group heads..."
                                                                        value={searchTermGroupHead}
                                                                        onChange={(e) => setSearchTermGroupHead(e.target.value)}
                                                                        onKeyDown={(e) => e.stopPropagation()} // ✅ Prevent 1-letter freeze
                                                                        className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                    />
                                                                </div>

                                                                {/* Filtered List */}
                                                                {Object.keys(options?.groupHeads || {})
                                                                    .filter((dep) =>
                                                                        dep.toLowerCase().includes(searchTermGroupHead.toLowerCase())
                                                                    )
                                                                    .map((dep, i) => (
                                                                        <SelectItem key={i} value={dep}>
                                                                            {dep}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.areaOfUse`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Area Of Use
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter area of user"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.productName`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Product Name
                                                            <span className="text-destructive">*</span>
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            disabled={!groupHead}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select product" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {/* 🔍 Search Box */}
                                                                <div className="flex items-center border-b px-3 pb-3">
                                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    <input
                                                                        placeholder="Search products..."
                                                                        value={searchTermProductName}
                                                                        onChange={(e) => setSearchTermProductName(e.target.value)}
                                                                        onKeyDown={(e) => e.stopPropagation()} // ✅ Freeze fix
                                                                        className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                    />
                                                                </div>

                                                                {/* Filtered List */}
                                                                {productOptions
                                                                    .filter((dep) =>
                                                                        dep.toLowerCase().includes(searchTermProductName.toLowerCase())
                                                                    )
                                                                    .map((dep, i) => (
                                                                        <SelectItem key={i} value={dep}>
                                                                            {dep}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Quantity
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                disabled={!groupHead}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.uom`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            UOM
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                disabled={!groupHead}
                                                                placeholder="e.g. Pcs, Kgs"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-3 border-t border-slate-100">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.attachment`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Attachment (optional)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="file"
                                                                onChange={(e) =>
                                                                    field.onChange(e.target.files?.[0])
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.specifications`}
                                                render={({ field }) => (
                                                    <FormItem className="w-full">
                                                        <FormLabel>Specifications</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Enter specifications or special notes..."
                                                                className="resize-y min-h-[48px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-xl"
                            onClick={() => setOpenDialog(false)}
                        >
                            Close
                        </Button>
                        <Button
                            className="w-full sm:w-auto min-w-[220px] h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all rounded-xl gap-2 cursor-pointer"
                            type="submit"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? (
                                <Loader size={18} color="white" aria-label="Loading Spinner" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Create Indent
                        </Button>
                    </div>
                </form>
            </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
