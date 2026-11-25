import { type ColumnDef, type Row } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useEffect, useMemo, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import { Textarea } from '../ui/textarea';
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
import { Input } from '../ui/input';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';
import { Tabs, TabsContent } from '../ui/tabs';
import { Plus, ShoppingCart } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';

interface PurchaseInitiateData {
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    approvedQuantity: number;
    uom: string;
    approvedVendorName: string;
    approvedRate: number;
    date: string;
}

interface HistoryData {
    timestamp: string;
    indentNo: string;
    vendorName: string;
    vendorContactNo: string;
    productName: string;
    quantity: number;
    unit: string;
    price: number;
    remark: string;
}

export default () => {
    const {
        indentSheet,
        iniciateSheet,
        venderMasterSheet,
        masterSheet,
        updateIndentSheet,
        updateIniciateSheet,
        updateVenderMasterSheet,
        indentLoading,
        iniciateLoading,
    } = useSheets();
    const { user } = useAuth();

    const [tableData, setTableData] = useState<PurchaseInitiateData[]>([]);
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [selectedIndent, setSelectedIndent] = useState<PurchaseInitiateData | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
    const [openAddVendor, setOpenAddVendor] = useState(false);
    const [addingVendor, setAddingVendor] = useState(false);
    const [newVendor, setNewVendor] = useState({
        vendorName: '',
        gstNumber: '',
        panNumber: '',
        contactPerson: '',
        contactPersonNumber: '',
    });

    useEffect(() => {
        setTableData(
            indentSheet
                .filter(
                    (sheet) =>
                        (sheet.actual3 !== '' || sheet.actual1 !== '') &&
                        sheet.actual4 === '' &&
                        sheet.indentType === 'Purchase' &&
                        sheet.vendorType !== 'Reject'
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    product: sheet.productName,
                    approvedQuantity: sheet.approvedQuantity || sheet.quantity,
                    uom: sheet.uom,
                    approvedVendorName: sheet.approvedVendorName,
                    approvedRate: sheet.approvedRate,
                    date: formatDate(new Date(sheet.actual3 || sheet.actual1)),
                }))
        );
    }, [indentSheet]);

    useEffect(() => {
        setHistoryData(
            [...iniciateSheet]
                .reverse()
                .map((row) => ({
                    timestamp: row.timestamp ? formatDate(new Date(row.timestamp)) : '',
                    indentNo: row.indentNo,
                    vendorName: row.vendorName,
                    vendorContactNo: row.vendorContactNo,
                    productName: row.productName,
                    quantity: row.quantity,
                    unit: row.unit,
                    price: row.price,
                    remark: row.remark || '',
                }))
        );
    }, [iniciateSheet]);

    const columns: ColumnDef<PurchaseInitiateData>[] = [
        ...(user.createPo
            ? [
                {
                    header: 'Action',
                    id: 'action',
                    cell: ({ row }: { row: Row<PurchaseInitiateData> }) => {
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
                                        Initiate
                                    </Button>
                                </DialogTrigger>
                            </div>
                        );
                    },
                },
            ]
            : []),
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
        { accessorKey: 'approvedQuantity', header: 'Quantity' },
        { accessorKey: 'uom', header: 'UOM' },
        { accessorKey: 'date', header: 'Approval Date' },
    ];

    const historyColumns: ColumnDef<HistoryData>[] = [
        { accessorKey: 'timestamp', header: 'Timestamp' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'vendorContactNo', header: 'Vendor Contact No.' },
        {
            accessorKey: 'productName',
            header: 'Product Name',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal">
                    {getValue() as string}
                </div>
            ),
        },
        { accessorKey: 'quantity', header: 'Quantity' },
        { accessorKey: 'unit', header: 'Unit' },
        { accessorKey: 'price', header: 'Price' },
        {
            accessorKey: 'remark',
            header: 'Remark',
            cell: ({ getValue }) => (
                <div className="max-w-[180px] break-words whitespace-normal">
                    {(getValue() as string) || '-'}
                </div>
            ),
        },
    ];

    const schema = z.object({
        vendorName: z.string().nonempty('Vendor name is required'),
        vendorNumber: z.string().nonempty('Vendor contact number is required'),
        quantity: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
        price: z.coerce.number().gt(0, 'Price must be greater than 0'),
        remark: z.string().optional(),
        billAttachment: z.instanceof(File).optional(),
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            vendorName: '',
            vendorNumber: '',
            quantity: undefined,
            price: undefined,
            remark: '',
            billAttachment: undefined,
        },
    });

    const typedVendorName = form.watch('vendorName') || '';

    const filteredVendors = useMemo(() => {
        const seen = new Set<string>();
        const list: { vendorName: string; contactPersonNumber: string }[] = [];

        for (const v of venderMasterSheet) {
            const name = String(v.vendorName || '').trim();
            if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                list.push({
                    vendorName: name,
                    contactPersonNumber: String(v.contactPersonNumber || '').trim(),
                });
            }
        }
        for (const v of masterSheet?.vendors || []) {
            const name = String(v.vendorName || '').trim();
            if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                list.push({ vendorName: name, contactPersonNumber: '' });
            }
        }

        const q = typedVendorName.trim().toLowerCase();
        if (!q) return list;
        return list.filter((v) => v.vendorName.toLowerCase().includes(q));
    }, [venderMasterSheet, masterSheet, typedVendorName]);

    async function handleAddVendor() {
        const trimmedName = newVendor.vendorName.trim();
        if (!trimmedName) {
            toast.error('Vendor Name is required');
            return;
        }
        const normalizedName = trimmedName.toLowerCase();
        const existingVendor = venderMasterSheet.find(
            (v) => String(v.vendorName || '').trim().toLowerCase() === normalizedName
        );
        const existsInMaster = (masterSheet?.vendors || []).some(
            (v) => String(v.vendorName || '').trim().toLowerCase() === normalizedName
        );
        if (existingVendor || existsInMaster) {
            toast.error(`Vendor "${trimmedName}" already exists in Vender Master`);
            form.setValue('vendorName', existingVendor ? existingVendor.vendorName : trimmedName, { shouldValidate: true });
            if (existingVendor?.contactPersonNumber) {
                form.setValue('vendorNumber', existingVendor.contactPersonNumber, { shouldValidate: true });
            }
            setOpenAddVendor(false);
            setVendorDropdownOpen(false);
            return;
        }
        setAddingVendor(true);
        try {
            const payload = {
                vendorName: newVendor.vendorName.trim(),
                gstNumber: newVendor.gstNumber.trim(),
                panNumber: newVendor.panNumber.trim(),
                contactPerson: newVendor.contactPerson.trim(),
                contactPersonNumber: newVendor.contactPersonNumber.trim(),
            };
            await postToSheet([payload], 'insert', 'Vender Master');
            toast.success(`Added ${payload.vendorName} to Vender Master`);
            form.setValue('vendorName', payload.vendorName, { shouldValidate: true });
            if (payload.contactPersonNumber) {
                form.setValue('vendorNumber', payload.contactPersonNumber, { shouldValidate: true });
            }
            setNewVendor({
                vendorName: '',
                gstNumber: '',
                panNumber: '',
                contactPerson: '',
                contactPersonNumber: '',
            });
            setOpenAddVendor(false);
            setVendorDropdownOpen(false);
            setTimeout(() => updateVenderMasterSheet(), 800);
        } catch (err) {
            console.error(err);
            toast.error('Failed to add vendor to Vender Master');
        } finally {
            setAddingVendor(false);
        }
    }

    useEffect(() => {
        if (selectedIndent) {
            form.reset({
                vendorName: selectedIndent.approvedVendorName,
                vendorNumber: '',
                quantity: selectedIndent.approvedQuantity,
                price: selectedIndent.approvedRate,
                remark: '',
                billAttachment: undefined,
            });
        }
    }, [selectedIndent]);

    async function onSubmit(values: z.infer<typeof schema>) {
        if (!selectedIndent) return;
        try {
            const now = new Date().toISOString();
            let poCopyUrl = '';
            if (values.billAttachment) {
                poCopyUrl = await uploadFile(
                    values.billAttachment,
                    import.meta.env.VITE_BILL_PHOTO_FOLDER || import.meta.env.VITE_PURCHASE_ORDERS_FOLDER || 'bill-attachments'
                );
            }

            // 1. Store initiate purchase record in INICIATE sheet with exact sheet fields
            await postToSheet(
                [
                    {
                        timestamp: now,
                        indentNo: selectedIndent.indentNo,
                        vendorName: values.vendorName,
                        vendorContactNo: values.vendorNumber,
                        productName: selectedIndent.product,
                        quantity: values.quantity,
                        unit: selectedIndent.uom,
                        price: values.price,
                        remark: values.remark || '',
                    },
                ],
                'insert',
                'INICIATE'
            );

            // 2. Update INDENT sheet so it moves to Receive Items with vendor/qty/price/bill attachment
            const updateData = indentSheet
                .filter((s) => s.indentNumber === selectedIndent.indentNo)
                .map((prev) => ({
                    ...prev,
                    approvedVendorName: values.vendorName,
                    approvedRate: values.price,
                    approvedQuantity: values.quantity,
                    poNumber: values.vendorNumber,
                    actual4: now,
                    planned5: now,
                    ...(poCopyUrl ? { poCopy: poCopyUrl } : {}),
                }));

            await postToSheet(updateData, 'update', 'INDENT');
            toast.success(`Initiated purchase for ${selectedIndent.indentNo}`);
            setOpenDialog(false);
            form.reset();
            setTimeout(() => {
                updateIniciateSheet();
                updateIndentSheet();
            }, 1000);
        } catch (error) {
            console.error(error);
            toast.error('Failed to initiate purchase');
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
                        heading="Initiate Purchase"
                        subtext="Create purchase orders with vendor details"
                        tabs
                    >
                        <ShoppingCart size={50} className="text-primary" />
                    </Heading>
                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['product', 'department', 'indenter', 'vendorName']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['indentNo', 'vendorName', 'vendorContactNo', 'productName', 'remark']}
                            dataLoading={iniciateLoading}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent className="sm:max-w-2xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="space-y-5"
                            >
                                <DialogHeader className="space-y-1">
                                    <DialogTitle>Initiate Purchase</DialogTitle>
                                    <DialogDescription>
                                        Add vendor details for indent{' '}
                                        <span className="font-medium">
                                            {selectedIndent.indentNo}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="bg-muted p-4 rounded-md space-y-3">
                                    <h3 className="text-lg font-bold">Item Details</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">Indent Number</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.indentNo}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">Item Name</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.product}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">Qty</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.approvedQuantity}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">UOM</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.uom}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold">Vendor Details</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="vendorName"
                                            render={({ field }) => (
                                                <FormItem className="relative">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel>Vendor Name</FormLabel>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNewVendor((prev) => ({
                                                                    ...prev,
                                                                    vendorName: typedVendorName,
                                                                }));
                                                                setOpenAddVendor(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                                        >
                                                            <Plus className="size-3" />
                                                            New Vendor
                                                        </button>
                                                    </div>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Type or select vendor name"
                                                            autoComplete="off"
                                                            {...field}
                                                            onFocus={() => setVendorDropdownOpen(true)}
                                                            onBlur={() => {
                                                                setTimeout(() => setVendorDropdownOpen(false), 180);
                                                            }}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                setVendorDropdownOpen(true);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    {vendorDropdownOpen && (
                                                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                                                            {filteredVendors.length > 0 ? (
                                                                filteredVendors.map((v, idx) => (
                                                                    <button
                                                                        key={`${v.vendorName}-${idx}`}
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            form.setValue('vendorName', v.vendorName, { shouldValidate: true });
                                                                            if (v.contactPersonNumber) {
                                                                                form.setValue('vendorNumber', v.contactPersonNumber, { shouldValidate: true });
                                                                            }
                                                                            setVendorDropdownOpen(false);
                                                                        }}
                                                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                                                                    >
                                                                        <span>{v.vendorName}</span>
                                                                        {v.contactPersonNumber && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {v.contactPersonNumber}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                                                    No matching vendor found
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setNewVendor((prev) => ({
                                                                        ...prev,
                                                                        vendorName: typedVendorName,
                                                                    }));
                                                                    setVendorDropdownOpen(false);
                                                                    setOpenAddVendor(true);
                                                                }}
                                                                className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-xs font-medium text-primary hover:bg-accent"
                                                            >
                                                                <Plus className="size-3.5" />
                                                                Add {typedVendorName ? `"${typedVendorName}"` : 'New Vendor'} to Vender Master
                                                            </button>
                                                        </div>
                                                    )}
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="vendorNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Vendor Contact Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter contact number"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="quantity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Quantity</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="Quantity"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Price</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="Price"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="remark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remark (Optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Enter remark..."
                                                        className="resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billAttachment"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bill/PO Attachment (Optional)</FormLabel>
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
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>

                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && (
                                            <Loader
                                                size={20}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        )}
                                        Initiate Purchase
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>

            <Dialog open={openAddVendor} onOpenChange={setOpenAddVendor}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                        <DialogDescription>
                            Save vendor details to Vender Master sheet
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="grid gap-1.5">
                            <label className="text-sm font-medium">Vendor Name *</label>
                            <Input
                                placeholder="Enter vendor name"
                                value={newVendor.vendorName}
                                onChange={(e) => setNewVendor((p) => ({ ...p, vendorName: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium">GST Number</label>
                                <Input
                                    placeholder="GST Number"
                                    value={newVendor.gstNumber}
                                    onChange={(e) => setNewVendor((p) => ({ ...p, gstNumber: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium">PAN Number</label>
                                <Input
                                    placeholder="PAN Number"
                                    value={newVendor.panNumber}
                                    onChange={(e) => setNewVendor((p) => ({ ...p, panNumber: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium">Contact Person</label>
                                <Input
                                    placeholder="Contact person"
                                    value={newVendor.contactPerson}
                                    onChange={(e) => setNewVendor((p) => ({ ...p, contactPerson: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium">Contact Person Number</label>
                                <Input
                                    placeholder="Contact number"
                                    value={newVendor.contactPersonNumber}
                                    onChange={(e) => setNewVendor((p) => ({ ...p, contactPersonNumber: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setOpenAddVendor(false)}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={addingVendor} onClick={handleAddVendor}>
                            {addingVendor && <Loader size={16} color="white" className="mr-1.5" />}
                            Save Vendor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
