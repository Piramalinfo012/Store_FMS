import { type ColumnDef, type Row } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useEffect, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import { DownloadOutlined } from "@ant-design/icons";

import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Dialog } from '@radix-ui/react-dialog';
import { z } from 'zod';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { postToSheet } from '@/lib/fetchers';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';
import { Tabs, TabsContent } from '../ui/tabs';
import { CheckCircle2, ClipboardCheck, Package, PenSquare, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { sendIndentApprovedWhatsAppNotifications } from '@/lib/whatsapp';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const statuses = ['Pending', 'Reject', 'New Vendor', 'Regular'];

interface ApproveTableData {
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    quantity: number;
    uom: string;
    vendorType: 'Pending' | 'Reject' | 'New Vendor' | 'Regular';
    date: string;
    attachment: string;
    specifications: string;
}

interface HistoryData {
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    uom: string;
    approvedQuantity: number;
    vendorType: 'Reject' | 'New Vendor' | 'Regular';
    date: string;
    approvedDate: string;
    specifications: string;
    lastUpdated?: string;
}

export default () => {
    const { indentSheet, indentLoading, updateIndentSheet } = useSheets();
    const { user } = useAuth();

    const [selectedIndent, setSelectedIndent] = useState<ApproveTableData | null>(null);
    const [tableData, setTableData] = useState<ApproveTableData[]>([]);
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRow, setEditingRow] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<HistoryData>>({});
    const [loading, setLoading] = useState(false);

    // Fetching table data
    useEffect(() => {
        setTableData(
            indentSheet
                .filter(
                    (sheet) =>
                        sheet.planned3 !== '' &&
                        sheet.actual3 === '' &&
                        sheet.indentType === 'Purchase'
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    product: sheet.productName,
                    quantity: sheet.quantity,
                    uom: sheet.uom,
                    attachment: sheet.attachment,
                    specifications: sheet.specifications || '',
                    vendorType: statuses.includes(sheet.vendorType)
                        ? (sheet.vendorType as ApproveTableData['vendorType'])
                        : 'Pending',
                    date: formatDateTime(new Date(sheet.timestamp)),
                }))
        );
        setHistoryData(
            indentSheet
                .filter(
                    (sheet) =>
                        sheet.planned3 !== '' &&
                        sheet.actual3 !== '' &&
                        sheet.indentType === 'Purchase'
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    product: sheet.productName,
                    approvedQuantity: sheet.approvedQty || sheet.approvedQuantity || sheet.quantity,
                    vendorType: (sheet.approvalStatus || sheet.vendorType) as HistoryData['vendorType'],
                    uom: sheet.unit || sheet.uom,
                    specifications: sheet.specifications || '',
                    date: formatDateTime(new Date(sheet.timestamp)),
                    approvedDate: formatDate(new Date(sheet.actual3)),
                    // lastUpdated: sheet.lastUpdated,
                }))
                // Sort by indentNo in descending order (newest first)
                .sort((a, b) => {
                    return b.indentNo.localeCompare(a.indentNo);
                })
        );
    }, [indentSheet]);

    const handleDownload = (data: any[]) => {
        if (!data || data.length === 0) {
            toast.error("No data to download");
            return;
        }

        // Column headers
        const headers = Object.keys(data[0]);

        // CSV rows
        const csvRows = [
            headers.join(","),
            ...data.map(row =>
                headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
            )
        ];

        const csvContent = csvRows.join("\n");

        // Blob create & download trigger
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `pending-indents-${Date.now()}.csv`); // CSV extension
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const onDownloadClick = async () => {
        setLoading(true);
        try {
            await handleDownload(tableData); // agar async function hai
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (row: HistoryData) => {
        setEditingRow(row.indentNo);
        setEditValues({
            approvedQuantity: row.approvedQuantity,
            uom: row.uom,
            vendorType: row.vendorType,
        });
    };

    const handleCancelEdit = () => {
        setEditingRow(null);
        setEditValues({});
    };

    const handleSaveEdit = async (indentNo: string) => {
        try {
            await postToSheet(
                indentSheet
                    .filter((s) => s.indentNumber === indentNo)
                    .map((prev) => ({
                        ...prev,
                        approvedQuantity: editValues.approvedQuantity,
                        uom: editValues.uom,
                        vendorType: editValues.vendorType,
                        lastUpdated: new Date().toISOString(),
                    })),
                'update'
            );
            toast.success(`Updated indent ${indentNo}`);
            updateIndentSheet();
            setEditingRow(null);
            setEditValues({});
        } catch {
            toast.error('Failed to update indent');
        }
    };

    const handleInputChange = (field: keyof HistoryData, value: any) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
    };

    // Creating table columns
    const columns: ColumnDef<ApproveTableData>[] = [
        ...(user.indentApprovalAction
            ? [
                {
                    header: 'Action',
                    id: 'action',
                    cell: ({ row }: { row: Row<ApproveTableData> }) => {
                        const indent = row.original;
                        return (
                            <div>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedIndent(indent);
                                        }}
                                    >
                                        Approve
                                    </Button>
                                </DialogTrigger>
                            </div>
                        );
                    },
                },
            ]
            : []),
        { accessorKey: 'date', header: 'Timestamp' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Department' },
        {
            accessorKey: 'product',
            header: 'Product',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal">
                    {getValue() as string}
                </div>
            ),
        },
        { accessorKey: 'quantity', header: 'Quantity' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'specifications',
            header: 'Specifications',
            cell: ({ row, getValue }) => {
                const [value, setValue] = useState(getValue() as string);
                const indentNo = row.original.indentNo;

                const handleBlur = async () => {
                    try {
                        await postToSheet(
                            indentSheet
                                .filter((s) => s.indentNumber === indentNo)
                                .map((prev) => ({
                                    ...prev,
                                    specifications: value,
                                })),
                            'update'
                        );
                        toast.success(`Updated specifications for ${indentNo}`);
                        updateIndentSheet();
                    } catch {
                        toast.error('Failed to update specifications');
                    }
                };

                return (
                    <div className="max-w-[150px]">
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={handleBlur}
                            className="border-none focus:border-1"
                        />
                    </div>
                );
            },
        },
        {
            accessorKey: 'vendorType',
            header: 'Status',
            cell: ({ row }: { row: Row<ApproveTableData> }) => {
                const status = row.original.vendorType;
                return <Pill variant="pending">{status}</Pill>;
            },
        },
        {
            accessorKey: 'attachment',
            header: 'Attachment',
            cell: ({ row }: { row: Row<ApproveTableData> }) => {
                const attachment = row.original.attachment;
                return attachment ? (
                    <a href={attachment} target="_blank">
                        Attachment
                    </a>
                ) : (
                    <></>
                );
            },
        },
    ];

    const historyColumns: ColumnDef<HistoryData>[] = [
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Department' },
        {
            accessorKey: 'product',
            header: 'Product',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal">
                    {getValue() as string}
                </div>
            ),
        },
        {
            accessorKey: 'approvedQuantity',
            header: 'Quantity',
            cell: ({ row }) => {
                const isEditing = editingRow === row.original.indentNo;
                return isEditing ? (
                    <Input
                        type="number"
                        value={editValues.approvedQuantity ?? row.original.approvedQuantity}
                        onChange={(e) => handleInputChange('approvedQuantity', Number(e.target.value))}
                        className="w-20"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        {row.original.approvedQuantity}
                        {user.indentApprovalAction && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => handleEditClick(row.original)}
                            >
                                <PenSquare className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'uom',
            header: 'UOM',
            cell: ({ row }) => {
                const isEditing = editingRow === row.original.indentNo;
                return isEditing ? (
                    <Input
                        value={editValues.uom ?? row.original.uom}
                        onChange={(e) => handleInputChange('uom', e.target.value)}
                        className="w-20"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        {row.original.uom}
                        {user.indentApprovalAction && editingRow !== row.original.indentNo && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => handleEditClick(row.original)}
                            >
                                <PenSquare className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'specifications',
            header: 'Specifications',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal">
                    {getValue() as string}
                </div>
            ),
        },
        {
            accessorKey: 'vendorType',
            header: 'Vendor Type',
            cell: ({ row }) => {
                const isEditing = editingRow === row.original.indentNo;
                return isEditing ? (
                    <Select
                        value={editValues.vendorType ?? row.original.vendorType}
                        onValueChange={(value) => handleInputChange('vendorType', value)}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Regular Vendor">Regular</SelectItem>
                            <SelectItem value="New Vendor">New Vendor</SelectItem>
                            <SelectItem value="Reject">Reject</SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex items-center gap-2">
                        <Pill
                            variant={
                                row.original.vendorType === 'Reject'
                                    ? 'reject'
                                    : row.original.vendorType === 'Regular'
                                        ? 'primary'
                                        : 'secondary'
                            }
                        >
                            {row.original.vendorType}
                        </Pill>
                        {user.indentApprovalAction && editingRow !== row.original.indentNo && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => handleEditClick(row.original)}
                            >
                                <PenSquare className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
        { accessorKey: 'date', header: 'Request Timestamp' },
        { accessorKey: 'approvedDate', header: 'Approval Date' },
        ...(user.indentApprovalAction
            ? [
                {
                    id: 'editActions',
                    cell: ({ row }: { row: Row<HistoryData> }) => {
                        const isEditing = editingRow === row.original.indentNo;
                        return isEditing ? (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(row.original.indentNo)}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : null;
                    },
                },
            ]
            : []),
    ];

    // Creating Form
    const schema = z
        .object({
            approval: z.enum(['Approve', 'Reject', 'New Vendor', 'Regular']),
            approvedQuantity: z.coerce.number().optional(),
            unit: z.string().optional(),
            rmark: z.string().optional(),
        })
        .superRefine((data, ctx) => {
            if (data.approval !== 'Reject') {
                if (!data.approvedQuantity || data.approvedQuantity === 0) {
                    ctx.addIssue({
                        path: ['approvedQuantity'],
                        code: z.ZodIssueCode.custom,
                    });
                }
            }
        });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { approvedQuantity: undefined, approval: undefined, unit: '', rmark: '' },
    });

    const approval = form.watch('approval');

    useEffect(() => {
        if (selectedIndent) {
            form.setValue('approvedQuantity', selectedIndent.quantity);
            form.setValue('unit', selectedIndent.uom || '');
            form.setValue('rmark', '');
        }
    }, [selectedIndent]);

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            await postToSheet(
                indentSheet
                    .filter((s) => s.indentNumber === selectedIndent?.indentNo)
                    .map((prev) => ({
                        ...prev,
                        vendorType: values.approval,
                        approvalStatus: values.approval,
                        approvedQuantity: values.approvedQuantity,
                        approvedQty: values.approvedQuantity,
                        unit: values.unit || prev.uom,
                        uom: values.unit || prev.uom,
                        rmark: values.rmark || '',
                        actual3: new Date().toISOString(),
                        lastUpdated: new Date().toISOString(), // This ensures newly approved items appear at top
                    })),
                'update'
            );
            toast.success(`Updated approval status of ${selectedIndent?.indentNo}`);

            if (values.approval !== 'Reject' && selectedIndent) {
                sendIndentApprovedWhatsAppNotifications({
                    indentNumber: selectedIndent.indentNo,
                    indenterName: selectedIndent.indenter,
                    department: selectedIndent.department,
                    productName: selectedIndent.product,
                    approvedQuantity: Number(values.approvedQuantity ?? selectedIndent.quantity),
                    unit: values.unit || selectedIndent.uom,
                    approvedBy: user?.name || user?.username,
                    remark: values.rmark,
                }).then((waRes) => {
                    if (!waRes.skipped) {
                        if (waRes.sent > 0) {
                            toast.success(`WhatsApp notification sent to ${waRes.sent} recipient(s)`);
                        }
                        if (waRes.failed > 0) {
                            toast.error(`WhatsApp failed for ${waRes.failed} recipient(s)`);
                        }
                    }
                });
            }

            setOpenDialog(false);
            form.reset();
            setTimeout(() => updateIndentSheet(), 1000);
        } catch {
            toast.error('Failed to approve indent');
        }
    }

    function onError(e: FieldErrors<z.infer<typeof schema>>) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Approve Indent"
                        subtext="Update Indent status to Approve or Reject them"
                        tabs
                    >
                        <ClipboardCheck size={50} className="text-primary" />
                    </Heading>
                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['product', 'department', 'indenter', 'vendorType']}
                            dataLoading={indentLoading}
                            extraActions={
                                <Button
                                    variant="default"  // or "outline", "secondary", etc. based on your design
                                    onClick={onDownloadClick}
                                    style={{
                                        background: "linear-gradient(90deg, #4CAF50, #2E7D32)",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "0 16px",
                                        fontWeight: "bold",
                                        boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <DownloadOutlined />
                                    {loading ? "Downloading..." : "Download"}
                                </Button>
                            }
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['product', 'department', 'indenter', 'vendorType']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-slate-200">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="flex flex-col"
                            >
                                {/* Gradient Header */}
                                <DialogHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 px-6 py-5 border-b border-slate-200/80">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm">
                                            <ClipboardCheck className="size-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <DialogTitle className="text-lg font-bold text-slate-900">
                                                    Approve Indent
                                                </DialogTitle>
                                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                                                    {selectedIndent.indentNo}
                                                </span>
                                            </div>
                                            <DialogDescription className="text-xs text-slate-600 mt-0.5">
                                                Review indent details and update approval status
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                                    {/* Indent Summary Card */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <Package className="size-3.5 text-purple-600" />
                                            Item Summary
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="col-span-2">
                                                <p className="text-xs text-slate-500">Product</p>
                                                <p className="font-semibold text-slate-900">{selectedIndent.product}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Indenter</p>
                                                <p className="font-medium text-slate-800">{selectedIndent.indenter}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Requested Qty</p>
                                                <p className="font-semibold text-purple-700">
                                                    {selectedIndent.quantity} {selectedIndent.uom}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interactive Approval Status */}
                                    <FormField
                                        control={form.control}
                                        name="approval"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>
                                                    Approval Status <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    {[
                                                        {
                                                            value: 'Approve' as const,
                                                            label: 'Approve',
                                                            icon: CheckCircle2,
                                                            active: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20',
                                                            iconColor: 'text-emerald-600',
                                                        },
                                                        {
                                                            value: 'Regular' as const,
                                                            label: 'Regular',
                                                            icon: ShieldCheck,
                                                            active: 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-500/20',
                                                            iconColor: 'text-purple-600',
                                                        },
                                                        {
                                                            value: 'New Vendor' as const,
                                                            label: 'New Vendor',
                                                            icon: UserPlus,
                                                            active: 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20',
                                                            iconColor: 'text-blue-600',
                                                        },
                                                        {
                                                            value: 'Reject' as const,
                                                            label: 'Reject',
                                                            icon: XCircle,
                                                            active: 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-500/20',
                                                            iconColor: 'text-red-600',
                                                        },
                                                    ].map((opt) => {
                                                        const Icon = opt.icon;
                                                        const isSelected = field.value === opt.value;
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => field.onChange(opt.value)}
                                                                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? opt.active
                                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <Icon className={`size-4 shrink-0 ${isSelected ? opt.iconColor : 'text-slate-400'}`} />
                                                                <span>{opt.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <FormField
                                            control={form.control}
                                            name="approvedQuantity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Approved Qty</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            disabled={approval === 'Reject'}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="unit"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Unit</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. Pcs, Kgs"
                                                            {...field}
                                                            disabled={approval === 'Reject'}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="rmark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remark</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Enter remark or approval notes..."
                                                        className="resize-y min-h-[76px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter className="bg-slate-50/90 px-6 py-4 border-t border-slate-200/80 gap-2">
                                    <DialogClose asChild>
                                        <Button variant="outline" type="button" className="rounded-xl">
                                            Close
                                        </Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className={`rounded-xl font-semibold text-white shadow-sm gap-2 ${
                                            approval === 'Reject'
                                                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                        }`}
                                    >
                                        {form.formState.isSubmitting ? (
                                            <Loader
                                                size={18}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        ) : approval === 'Reject' ? (
                                            <XCircle className="size-4" />
                                        ) : (
                                            <CheckCircle2 className="size-4" />
                                        )}
                                        {approval === 'Reject' ? 'Reject Indent' : 'Approve Indent'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};