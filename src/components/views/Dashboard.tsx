import Heading from '../element/Heading';
import {
    CalendarIcon,
    ClipboardList,
    LayoutDashboard,
    PackageCheck,
    Truck,
    Warehouse,
    Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '../ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useEffect, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { ComboBox } from '../ui/combobox';
import { analyzeData } from '@/lib/filter';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import { postToMasterSheet } from '@/lib/fetchers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const vendorSchema = z.object({
    vendorName: z.string().min(1, 'Vendor Name is required'),
    gstNumber: z.string().min(1, 'GST Number is required'),
    panNumber: z.string().min(1, 'PAN Number is required'),
    contactPerson: z.string().optional(),
    contactPersonNumber: z.string().optional(),
});

function AddVendor({ onComplete }: { onComplete: () => void }) {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof vendorSchema>>({
        resolver: zodResolver(vendorSchema),
        defaultValues: {
            vendorName: '',
            gstNumber: '',
            panNumber: '',
            contactPerson: '',
            contactPersonNumber: '',
        },
    });

    async function onSubmit(values: z.infer<typeof vendorSchema>) {
        try {
            await postToMasterSheet([values], 'VENDOR');
            toast.success('Vendor added successfully');
            setOpen(false);
            form.reset();
            onComplete();
        } catch {
            toast.error('Failed to add vendor');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Vendor Name
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Vendor</DialogTitle>
                    <DialogDescription>Add a new vendor to the master list.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="vendorName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vendor Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter vendor name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gstNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GST Number *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter GST number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="panNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>PAN Number *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter PAN number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactPerson"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter contact person" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactPersonNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader color="white" size={20} className="mr-2" />
                                )}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const productSchema = z.object({
    productName: z.string().min(1, 'Product Name is required'),
    hsnNumber: z.string().min(1, 'HSN Number is required'),
});

function AddProduct({ onComplete }: { onComplete: () => void }) {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            productName: '',
            hsnNumber: '',
        },
    });

    async function onSubmit(values: z.infer<typeof productSchema>) {
        try {
            await postToMasterSheet([values], 'PRODUCT');
            toast.success('Product added successfully');
            setOpen(false);
            form.reset();
            onComplete();
        } catch {
            toast.error('Failed to add product');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Product Name
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Product</DialogTitle>
                    <DialogDescription>Add a new product to the master list.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="productName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Add Product Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter product name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hsnNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>HSN Number *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter HSN number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader color="white" size={20} className="mr-2" />
                                )}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const transporterSchema = z.object({
    transporterName: z.string().optional(),
    panNo: z.string().optional(),
    gstNo: z.string().optional(),
    contactNo: z.string().optional(),
    typeOfTransporting: z.string().optional(),
});

function AddTransporter({ onComplete }: { onComplete: () => void }) {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof transporterSchema>>({
        resolver: zodResolver(transporterSchema),
        defaultValues: {
            transporterName: '',
            panNo: '',
            gstNo: '',
            contactNo: '',
            typeOfTransporting: '',
        },
    });

    async function onSubmit(values: z.infer<typeof transporterSchema>) {
        try {
            await postToMasterSheet([values], 'TRANSPORTER');
            toast.success('Transporter added successfully');
            setOpen(false);
            form.reset();
            onComplete();
        } catch {
            toast.error('Failed to add transporter');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Transporter Name
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Transporter</DialogTitle>
                    <DialogDescription>Add a new transporter to the master list.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="transporterName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transporter Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter transporter name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="panNo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>PAN No</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter PAN number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gstNo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GST No</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter GST number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactNo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact No</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter contact number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="typeOfTransporting"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type of Transporting</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter type of transporting" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader color="white" size={20} className="mr-2" />
                                )}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CustomChartTooltipContent({
    payload,
    label,
}: {
    payload?: { payload: { quantity: number; frequency: number } }[];
    label?: string;
}) {
    if (!payload?.length) return null;

    const data = payload[0].payload;

    return (
        <div className="rounded-md border bg-white px-3 py-2 shadow-sm text-sm">
            <p className="font-medium">{label}</p>
            <p>Quantity: {data.quantity}</p>
            <p>Frequency: {data.frequency}</p>
        </div>
    );
}

export default function UsersTable() {
    const { receivedSheet, indentSheet, updateAll } = useSheets();
    const [chartData, setChartData] = useState<
        {
            name: string;
            quantity: number;
            frequency: number;
        }[]
    >([]);
    const [topVendorsData, setTopVendors] = useState<
        {
            name: string;
            orders: number;
            quantity: number;
        }[]
    >([]);

    // Items
    const [indent, setIndent] = useState({ count: 0, quantity: 0 });
    const [purchase, setPurchase] = useState({ count: 0, quantity: 0 });
    const [out, setOut] = useState({ count: 0, quantity: 0 });
    const [alerts, setAlerts] = useState({ lowStock: 0, outOfStock: 0 });

    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [filteredVendors, setFilteredVendors] = useState<string[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<string[]>([]);
    const [allVendors, setAllVendors] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<string[]>([]);

    useEffect(() => {
        setAllVendors(Array.from(new Set(indentSheet.map((item) => item.approvedVendorName))));
        setAllProducts(Array.from(new Set(indentSheet.map((item) => item.productName))));
        const {
            topVendors,
            topProducts,
            issuedIndentCount,
            approvedIndentCount,
            totalIssuedQuantity,
            receivedPurchaseCount,
            totalApprovedQuantity,
            totalPurchasedQuantity,
        } = analyzeData(
            { receivedSheet, indentSheet },
            {
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                vendors: filteredVendors,
                products: filteredProducts,
            }
        );

        setChartData(
            topProducts.map((p) => ({ frequency: p.freq, quantity: p.quantity, name: p.name }))
        );
        setTopVendors(topVendors);
        setIndent({ quantity: totalApprovedQuantity, count: approvedIndentCount });
        console.log(totalApprovedQuantity, approvedIndentCount);
        setPurchase({ quantity: totalPurchasedQuantity, count: receivedPurchaseCount });
        setOut({ quantity: totalIssuedQuantity, count: issuedIndentCount });
    }, [startDate, endDate, filteredProducts, filteredVendors, indentSheet, receivedSheet]);

    const chartConfig = {
        quantity: {
            label: 'Quantity',
            color: 'var(--color-primary)',
        },
    } satisfies ChartConfig;

    return (
        <div>
            <Heading
                heading="Dashboard"
                subtext="View you analytics"
                actions={
                    <>
                        <AddVendor onComplete={() => updateAll()} />
                        <AddProduct onComplete={() => updateAll()} />
                        <AddTransporter onComplete={() => updateAll()} />
                    </>
                }
            >
                <LayoutDashboard size={50} className="text-primary" />
            </Heading>

            <div className="grid gap-3 m-3">
                <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                data-empty={!startDate}
                                className="data-[empty=true]:text-muted-foreground w-full min-w-0 justify-start text-left font-normal"
                            >
                                <CalendarIcon />
                                {startDate ? (
                                    format(startDate, 'PPP')
                                ) : (
                                    <span>Pick a start date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                data-empty={!endDate}
                                className="data-[empty=true]:text-muted-foreground w-full min-w-0 justify-start text-left font-normal"
                            >
                                <CalendarIcon />
                                {endDate ? format(endDate, 'PPP') : <span>Pick a end date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                        </PopoverContent>
                    </Popover>
                    <ComboBox
                        multiple
                        options={allVendors.map((v) => ({ label: v, value: v }))}
                        value={filteredVendors}
                        onChange={setFilteredVendors}
                        placeholder="Select Vendors"
                    />
                    <ComboBox
                        multiple
                        options={allProducts.map((v) => ({ label: v, value: v }))}
                        value={filteredProducts}
                        onChange={setFilteredProducts}
                        placeholder="Select Products"
                    />
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                    <Card className="bg-gradient-to-br from-transparent to-blue-500/10">
                        <CardContent>
                            <div className="text-blue-500 flex justify-between">
                                <p className="font-semibold">Total Approved Indents</p>
                                <ClipboardList size={18} />
                            </div>
                            <p className="text-3xl font-bold text-blue-800">{indent.count}</p>
                            <div className="text-blue-500 flex justify-between">
                                <p className="text-sm ">Indented Quantity</p>
                                <p>{indent.quantity}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-transparent to-green-500/10">
                        <CardContent>
                            <div className="text-green-500 flex justify-between">
                                <p className="font-semibold">Total Purchases</p>
                                <Truck size={18} />
                            </div>
                            <p className="text-3xl font-bold text-green-800">{purchase.count}</p>
                            <div className="text-green-500 flex justify-between">
                                <p className="text-sm ">Purchased Quantity</p>
                                <p>{purchase.quantity}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-transparent to-orange-500/10">
                        <CardContent>
                            <div className="text-orange-500 flex justify-between">
                                <p className="font-semibold">Total Issued</p>
                                <PackageCheck size={18} />
                            </div>
                            <p className="text-3xl font-bold text-orange-800">{out.count}</p>

                            <div className="text-orange-500 flex justify-between">
                                <p className="text-sm ">Out Quantity</p>
                                <p>{out.quantity}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-transparent to-yellow-500/10 text-yellow-500 ">
                        <CardContent>
                            <div className="flex justify-between">
                                <p className="font-semibold">Out of Stock</p>
                                <Warehouse size={18} />
                            </div>
                            <p className="text-3xl font-bold text-yellow-800">
                                {alerts.outOfStock}
                            </p>

                            <div className="text-yellow-500 flex justify-between">
                                <p className="text-sm ">Low in Stock</p>
                                <p>{alerts.lowStock}</p >
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Card className="w-[55%] md:min-w-150 flex-grow">
                        <CardHeader>
                            <CardTitle className="text-xl">Top Purchased Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="max-h-80 w-full" config={chartConfig}>
                                <BarChart
                                    accessibilityLayer
                                    data={chartData}
                                    layout="vertical"
                                    margin={{
                                        right: 16,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="barGradient"
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="0"
                                        >
                                            <stop offset="100%" stopColor="#3b82f6" />{' '}
                                            {/* Tailwind blue-500 */}
                                            <stop offset="0%" stopColor="#2563eb" />{' '}
                                            {/* Tailwind blue-600 */}
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid horizontal={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                        tickFormatter={(value: any) => value.slice(0, 3)}
                                        hide
                                    />
                                    <XAxis dataKey="frequency" type="number" hide />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<CustomChartTooltipContent />}
                                    />
                                    <Bar
                                        dataKey="frequency"
                                        layout="vertical"
                                        fill="url(#barGradient)"
                                        radius={4}
                                    >
                                        <LabelList
                                            dataKey="name"
                                            position="insideLeft"
                                            offset={8}
                                            className="fill-(--color-background) font-semibold"
                                            fontSize={12}
                                        />
                                        <LabelList
                                            dataKey="frequency"
                                            position="insideRight"
                                            offset={8}
                                            className="fill-(--color-background) font-semibold"
                                            fontSize={12}
                                        />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card className="flex-grow min-w-60 w-[40%]">
                        <CardHeader>
                            <CardTitle className="text-xl">Top Vendors</CardTitle>
                        </CardHeader>
                        <CardContent className="text-base grid gap-2">
                            {topVendorsData.map((vendor, i) => (
                                <div className="flex justify-between" key={i}>
                                    <p className="font-semibold text-md">{vendor.name}</p>
                                    <div className="flex gap-5">
                                        <p>{vendor.orders} Orders</p>
                                        <p>{vendor.quantity} Items</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
