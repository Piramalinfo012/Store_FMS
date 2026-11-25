import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { useSheets } from '@/context/SheetsContext';
import { Button } from '../ui/button';
import DataTable from '../element/DataTable';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { PuffLoader as Loader } from 'react-spinners';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import { Handshake } from 'lucide-react';
import { Tabs, TabsContent } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { formatDate, formatDateTime } from '@/lib/utils';

interface HandoverTableData {
    indentNo: string;
    indenter: string;
    department: string;
    areaOfUse: string;
    product: string;
    date: string;
    planned7: string;
    issuedQuantity: number;
    requestedQuantity: number;
    uom: string;
    issueApprovedBy: string;
    specifications: string;
    attachment: string;
}

interface HandoverHistoryData {
    indentNo: string;
    indenter: string;
    department: string;
    areaOfUse: string;
    product: string;
    date: string;
    planned7: string;
    actual7: string;
    handoverQty: number;
    unit: string;
    attachmentUrl: string;
    remarkIfAny: string;
}

function safeFormatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : formatDate(d);
}

function safeFormatDateTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : formatDateTime(d);
}

const schema = z.object({
    handoverDate: z.date(),
    handoverQty: z.coerce.number().positive('Quantity must be greater than 0'),
    unit: z.string().min(1, 'Unit is required'),
    attachmentFile: z.instanceof(File).optional(),
    remark: z.string().optional(),
});

export default () => {
    const { indentSheet, indentLoading, updateIndentSheet } = useSheets();
    const { user } = useAuth();
    const [openDialog, setOpenDialog] = useState(false);
    const [tableData, setTableData] = useState<HandoverTableData[]>([]);
    const [historyData, setHistoryData] = useState<HandoverHistoryData[]>([]);
    const [selectedIndent, setSelectedIndent] = useState<HandoverTableData | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const targetIndent = searchParams.get('indent')?.trim();
        if (!targetIndent || tableData.length === 0) return;
        const matched = tableData.find(
            (row) => row.indentNo.toLowerCase() === targetIndent.toLowerCase()
        );
        if (matched) {
            setSelectedIndent(matched);
            setOpenDialog(true);
            setSearchParams({}, { replace: true });
        }
    }, [tableData, searchParams, setSearchParams]);

    useEffect(() => {
        setTableData(
            indentSheet
                .filter(
                    (sheet) =>
                        sheet.indentType === 'Store Out' &&
                        sheet.issueStatus === 'Approved' &&
                        sheet.planned7 !== '' &&
                        sheet.actual7 === ''
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    areaOfUse: sheet.areaOfUse,
                    product: sheet.productName,
                    date: safeFormatDateTime(sheet.timestamp),
                    planned7: safeFormatDate(sheet.planned7),
                    issuedQuantity: Number(sheet.issuedQuantity || sheet.quantity || 0),
                    requestedQuantity: Number(sheet.quantity || 0),
                    uom: sheet.uom,
                    issueApprovedBy: sheet.issueApprovedBy || '',
                    specifications: sheet.specifications || 'Not specified',
                    attachment: sheet.attachment || '',
                }))
        );

        setHistoryData(
            indentSheet
                .filter(
                    (sheet) =>
                        sheet.indentType === 'Store Out' &&
                        sheet.planned7 !== '' &&
                        sheet.actual7 !== ''
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    areaOfUse: sheet.areaOfUse,
                    product: sheet.productName,
                    date: safeFormatDateTime(sheet.timestamp),
                    planned7: safeFormatDate(sheet.planned7),
                    actual7: safeFormatDate(sheet.actual7),
                    handoverQty: Number(sheet.handoverQty ?? sheet.issuedQuantity ?? 0),
                    unit: sheet.unit || sheet.uom || '',
                    attachmentUrl: sheet.attachmentUrl || '',
                    remarkIfAny: sheet.remarkIfAny || '',
                }))
        );
    }, [indentSheet]);

    const columns: ColumnDef<HandoverTableData>[] = [
        ...(user.storeOutApprovalAction
            ? [
                  {
                      header: 'Actions',
                      id: 'actions',
                      cell: ({ row }: { row: Row<HandoverTableData> }) => {
                          const indent = row.original;
                          return (
                              <div className="flex gap-2 justify-center">
                                  <DialogTrigger asChild>
                                      <Button
                                          variant="outline"
                                          onClick={() => {
                                              setSelectedIndent(indent);
                                          }}
                                      >
                                          Handover
                                      </Button>
                                  </DialogTrigger>
                              </div>
                          );
                      },
                  },
              ]
            : []),
        { accessorKey: 'date', header: 'Indent Timestamp' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Department' },
        { accessorKey: 'areaOfUse', header: 'Area Of Use' },
        { accessorKey: 'product', header: 'Item' },
        { accessorKey: 'issuedQuantity', header: 'Issued Qty' },
        { accessorKey: 'uom', header: 'Unit' },
        { accessorKey: 'issueApprovedBy', header: 'Approved By' },
        { accessorKey: 'planned7', header: 'Planned 7' },
        {
            accessorKey: 'attachment',
            header: 'Attachment',
            cell: ({ row }) => {
                const attachment = row.original.attachment;
                return attachment ? (
                    <a href={attachment} target="_blank" rel="noreferrer" className="text-primary underline">
                        View
                    </a>
                ) : (
                    <></>
                );
            },
        },
    ];

    const historyColumns: ColumnDef<HandoverHistoryData>[] = [
        { accessorKey: 'date', header: 'Indent Timestamp' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Department' },
        { accessorKey: 'areaOfUse', header: 'Area Of Use' },
        { accessorKey: 'product', header: 'Item' },
        { accessorKey: 'handoverQty', header: 'Handover Qty' },
        { accessorKey: 'unit', header: 'Unit' },
        { accessorKey: 'planned7', header: 'Planned 7' },
        { accessorKey: 'actual7', header: 'Handover Date (Actual 7)' },
        {
            accessorKey: 'attachmentUrl',
            header: 'Attachment',
            cell: ({ row }) => {
                const url = row.original.attachmentUrl;
                return url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                        Attachment
                    </a>
                ) : (
                    <></>
                );
            },
        },
        { accessorKey: 'remarkIfAny', header: 'Remark' },
    ];

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            handoverDate: new Date(),
            handoverQty: 0,
            unit: '',
            attachmentFile: undefined,
            remark: '',
        },
    });

    useEffect(() => {
        if (selectedIndent) {
            form.reset({
                handoverDate: new Date(),
                handoverQty: selectedIndent.issuedQuantity || selectedIndent.requestedQuantity,
                unit: selectedIndent.uom || '',
                attachmentFile: undefined,
                remark: '',
            });
        }
    }, [selectedIndent, form]);

    async function onSubmit(values: z.infer<typeof schema>) {
        if (!selectedIndent) return;
        try {
            let uploadedAttachmentUrl = '';
            if (values.attachmentFile) {
                uploadedAttachmentUrl = await uploadFile(
                    values.attachmentFile,
                    import.meta.env.VITE_IDENT_ATTACHMENT_FOLDER
                );
            }

            const matchingRows = indentSheet.filter(
                (s) =>
                    s.indentNumber === selectedIndent.indentNo &&
                    s.productName === selectedIndent.product
            );
            const targetRows =
                matchingRows.length > 0
                    ? matchingRows
                    : indentSheet.filter((s) => s.indentNumber === selectedIndent.indentNo);

            await postToSheet(
                targetRows.map((prev) => {
                    const { actual4, poNumber, poCopy, ...rest } = prev;
                    return {
                        ...rest,
                        actual7: values.handoverDate.toISOString(),
                        handoverQty: values.handoverQty,
                        unit: values.unit,
                        attachmentUrl: uploadedAttachmentUrl,
                        remarkIfAny: values.remark || '',
                    };
                }),
                'update'
            );

            toast.success(`Handover completed for ${selectedIndent.indentNo}`);
            setOpenDialog(false);
            form.reset();
            setTimeout(() => updateIndentSheet(), 1000);
        } catch {
            toast.error('Failed to update handover details');
        }
    }

    function onError() {
        toast.error('Please fill all required fields');
    }

    return (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <Tabs defaultValue="pending">
                <Heading heading="Handover" subtext="Handover approved store out items" tabs>
                    <Handshake size={50} className="text-primary" />
                </Heading>
                <TabsContent value="pending">
                    <DataTable
                        data={tableData}
                        columns={columns}
                        searchFields={['indentNo', 'product', 'department', 'indenter']}
                        dataLoading={indentLoading}
                    />
                </TabsContent>
                <TabsContent value="history">
                    <DataTable
                        data={historyData}
                        columns={historyColumns}
                        searchFields={['indentNo', 'product', 'department', 'indenter']}
                        dataLoading={indentLoading}
                    />
                </TabsContent>
            </Tabs>
            {selectedIndent && (
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-5">
                            <DialogHeader className="space-y-1">
                                <DialogTitle>Item Handover</DialogTitle>
                                <DialogDescription>
                                    Complete handover for{' '}
                                    <span className="font-medium">{selectedIndent.indentNo}</span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="bg-muted p-4 rounded-md grid gap-3">
                                <h3 className="text-lg font-bold">Request & Item Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <p className="font-medium">Indenter</p>
                                        <p className="text-sm font-light">{selectedIndent.indenter}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Department</p>
                                        <p className="text-sm font-light">{selectedIndent.department}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Item Name</p>
                                        <p className="text-sm font-light">{selectedIndent.product}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Issued Qty</p>
                                        <p className="text-sm font-light">
                                            {selectedIndent.issuedQuantity} {selectedIndent.uom}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Area of Use</p>
                                        <p className="text-sm font-light">{selectedIndent.areaOfUse}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Approved By</p>
                                        <p className="text-sm font-light">{selectedIndent.issueApprovedBy || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Planned 7</p>
                                        <p className="text-sm font-light">{selectedIndent.planned7 || 'Auto'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-nowrap">Specifications</p>
                                        <p className="text-sm font-light">{selectedIndent.specifications}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="handoverDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Handover Date (Actual 7)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    value={
                                                        field.value
                                                            ? field.value.toISOString().split('T')[0]
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value
                                                                ? new Date(e.target.value)
                                                                : undefined
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="handoverQty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Handover Qty</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="Enter handover quantity"
                                                    value={field.value ?? ''}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value === ''
                                                                ? ''
                                                                : Number(e.target.value)
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
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
                                                <Input placeholder="Enter unit (e.g. PCS, KG)" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="attachmentFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Attachment (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) =>
                                                        field.onChange(e.target.files?.[0] ?? undefined)
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="remark"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Remark (If Any)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter remark if any"
                                                className="resize-y"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Close
                                    </Button>
                                </DialogClose>

                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && (
                                        <Loader
                                            size={20}
                                            color="white"
                                            aria-label="Loading Spinner"
                                        />
                                    )}
                                    Submit Handover
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            )}
        </Dialog>
    );
};
