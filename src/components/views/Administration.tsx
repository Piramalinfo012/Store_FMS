import { useWorkflow } from '@/context/WorkflowContext';
import { CheckCircle2, Copy, Eye, EyeClosed, History, MessageSquare, MoreHorizontal, Pencil, Send, ShieldUser, Trash, UserPlus } from 'lucide-react';
import {
    loadLocalWhatsAppLogs,
    loadMaytapiConfig,
    loadMaytapiConfigFromSheet,
    logWhatsAppToSheet,
    normalizeWhatsAppNumber,
    saveMaytapiConfigToSheet,
    sendMaytapiMessage,
    type MaytapiConfig,
    type WhatsappLogRow,
} from '@/lib/whatsapp';
import { formatDate } from '@/lib/utils';
import Heading from '../element/Heading';
import { useEffect, useState } from 'react';
import { fetchSheet, postToSheet } from '@/lib/fetchers';
import { allPermissionKeys, type UserPermissions } from '@/types/sheets';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { PuffLoader as Loader } from 'react-spinners';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Pill } from '../ui/pill';

interface UsersTableData {
    username: string;
    name: string;
    password: string;
    permissions: string[];
    rowIndex: number;
}

function camelToTitleCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2') // insert space before capitals
        .replace(/^./, (char) => char.toUpperCase()); // capitalize first letter
}

const permissionLabels: Record<string, { label: string; group: string }> = {
    createIndent: { label: 'Create Indent Page', group: 'Indent & Approval' },
    indentApprovalView: { label: 'Approve Indent (View)', group: 'Indent & Approval' },
    indentApprovalAction: { label: 'Approve Indent (Action)', group: 'Indent & Approval' },
    createPo: { label: 'Initiate Purchase / Create PO', group: 'Purchase & PO' },
    pendingIndentsView: { label: 'Pending POs Page', group: 'Purchase & PO' },
    ordersView: { label: 'PO History & Get Purchase', group: 'Purchase & PO' },
    poMaster: { label: 'PO Master', group: 'Purchase & PO' },
    updateVendorView: { label: 'Vendor Rate Update (View)', group: 'Vendor & Rates' },
    updateVendorAction: { label: 'Vendor Rate Update (Action)', group: 'Vendor & Rates' },
    threePartyApprovalView: { label: 'Three Party Approval (View)', group: 'Vendor & Rates' },
    threePartyApprovalAction: { label: 'Three Party Approval (Action)', group: 'Vendor & Rates' },
    receiveItemView: { label: 'Receive Items (View)', group: 'Store & Receiving' },
    receiveItemAction: { label: 'Receive Items (Action)', group: 'Store & Receiving' },
    storeOutApprovalView: { label: 'Store Out Approval (View)', group: 'Store & Receiving' },
    storeOutApprovalAction: { label: 'Store Out Approval (Action)', group: 'Store & Receiving' },
    administrate: { label: 'Administration (Full Access)', group: 'System' },
};

export default () => {
    const { user: currentUser } = useAuth();
    const { purchaseWorkflowHidden, setPurchaseWorkflowHidden } = useWorkflow();

    const [tableData, setTableData] = useState<UsersTableData[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UsersTableData | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [openWaDialog, setOpenWaDialog] = useState(false);
    const [waConfig, setWaConfig] = useState<MaytapiConfig>(() => loadMaytapiConfig());
    const [savingWaConfig, setSavingWaConfig] = useState(false);

    useEffect(() => {
        loadMaytapiConfigFromSheet().then((remote) => {
            if (remote) setWaConfig(remote);
        });
    }, []);
    const [showWaToken, setShowWaToken] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [openWaLogs, setOpenWaLogs] = useState(false);
    const [waLogs, setWaLogs] = useState<WhatsappLogRow[]>([]);
    const [waLogsLoading, setWaLogsLoading] = useState(false);

    async function fetchWaLogs() {
        setWaLogsLoading(true);
        const localLogs = loadLocalWhatsAppLogs();
        try {
            const res = await fetchSheet('Whatsapp Log');
            const sheetLogs = [...(res as unknown as WhatsappLogRow[])]
                .filter((r) => r.indentType !== 'SYSTEM_CONFIG' && r.indentNo !== 'CONFIG')
                .reverse();
            const seen = new Set(sheetLogs.map((l) => `${l.timestamp}|${l.phone}|${l.indentNo}`));
            const merged = [
                ...sheetLogs,
                ...localLogs.filter((l) => !seen.has(`${l.timestamp}|${l.phone}|${l.indentNo}`)),
            ];
            setWaLogs(merged);
        } catch {
            setWaLogs(localLogs);
        } finally {
            setWaLogsLoading(false);
        }
    }

    useEffect(() => {
        if (!openDialog) {
            setSelectedUser(null);
        }
    }, [openDialog]);

    function fetchUser() {
        setDataLoading(true);
        fetchSheet('USER').then((res) => {
            setTableData(
                (res as UserPermissions[]).map((user) => {
                    const permissionKeys = Object.keys(user).filter(
                        (key): key is keyof UserPermissions =>
                            !['username', 'password', 'name', 'rowIndex'].includes(key) &&
                            user[key as keyof UserPermissions] === true
                    );

                    return {
                        username: user.username,
                        name: user.name,
                        password: user.password,
                        permissions: permissionKeys,
                        rowIndex: user.rowIndex,
                    };
                })
            );
            setDataLoading(false);
        });
    }

    useEffect(() => {
        fetchUser();
    }, []);

    const columns: ColumnDef<UsersTableData>[] = [
        { accessorKey: 'username', header: 'Username' },
        { accessorKey: 'name', header: 'Name' },
        {
            accessorKey: 'permissions',
            header: 'Permissions',
            cell: ({ row }) => {
                const permissions = row.original.permissions;
                return (
                    <div className="grid place-items-center">
                        <div className="flex flex-wrap gap-1">
                            {permissions.slice(0, 2).map((perm, i) => (
                                <Pill key={i}>{camelToTitleCase(perm)}</Pill>
                            ))}
                            {permissions.length > 2 && (
                                <HoverCard>
                                    <HoverCardTrigger>
                                        <Pill>...</Pill>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="min-w-4 max-w-100 flex flex-wrap gap-1 bg-background">
                                        {permissions.map((perm, i) => (
                                            <Pill key={i}>{camelToTitleCase(perm)}</Pill>
                                        ))}
                                    </HoverCardContent>
                                </HoverCard>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: 'Action',
            cell: ({ row }) => {
                const user = row.original;
                const isProtected =
                    user.username.toLowerCase() === 'admin' || user.username === currentUser.username;
                return (
                    <div className="flex items-center justify-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5 border-[#C9BDAF] bg-[#FAF8F4] text-[#2F4034] hover:bg-[#D9E1D9] hover:border-[#687F6E]"
                            onClick={() => {
                                setSelectedUser(user);
                                setShowPassword(false);
                                setOpenDialog(true);
                            }}
                        >
                            <Pencil className="size-3.5" />
                            Edit
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isProtected}
                            title={isProtected ? 'Protected user' : 'Delete User'}
                            className="size-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-35"
                            onClick={async () => {
                                try {
                                    if (isProtected) return;
                                    await postToSheet(
                                        [{ rowIndex: user.rowIndex }],
                                        'delete',
                                        'USER'
                                    );
                                    toast.success(`Deleted ${user.name} successfully`);
                                    setTimeout(fetchUser, 1000);
                                } catch {
                                    toast.error('Failed to delete user');
                                }
                            }}
                        >
                            <Trash className="size-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const schema = z.object({
        name: z.string().nonempty(),
        username: z.string().nonempty(),
        password: z.string().nonempty(),
        permissions: z.array(z.string()),
    });

    const form = useForm({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (selectedUser) {
            form.reset({
                username: selectedUser.username,
                name: selectedUser.name,
                password: selectedUser.password,
                permissions: selectedUser.permissions,
            });
            return;
        }
        form.reset();
    }, [selectedUser]);

    async function onSubmit(value: z.infer<typeof schema>) {
        if (
            tableData.map((d) => d.username).includes(value.username) &&
            value.username !== selectedUser?.username
        ) {
            toast.error('Username already exists');
            return;
        }
        if (selectedUser) {
            try {
                const row: Partial<UserPermissions> = {
                    rowIndex: selectedUser.rowIndex,
                    username: value.username,
                    name: value.name,
                    password: value.password,
                };

                allPermissionKeys.forEach((perm) => {
                    row[perm] = value.permissions.includes(perm);
                });

                await postToSheet([row], 'update', 'USER');
                setOpenDialog(false);
                setTimeout(fetchUser, 1000);
                toast.success('Updated user settings');
            } catch {
                toast.error('Failed to update user settings');
            }
            return;
        }
        try {
            const row: Partial<UserPermissions> = {
                username: value.username,
                name: value.name,
                password: value.password,
            };

            allPermissionKeys.forEach((perm) => {
                row[perm] = value.permissions.includes(perm);
            });

            await postToSheet([row], 'insert', 'USER');
            setOpenDialog(false);
            setTimeout(fetchUser, 1000);
            toast.success('Created user successfully');
        } catch {
            toast.error('Failed to update user settings');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }
    return (
        <div>
            <Dialog open={openDialog} onOpenChange={(open) => setOpenDialog(open)}>
                <div>
                    <Heading
                        heading="Administration"
                        subtext="Manage permissions and user for the app"
                    >
                        <ShieldUser size={50} className="text-primary" />
                    </Heading>

                    <div className="mx-4 mb-4 flex items-center justify-between gap-4 rounded-md border p-4">
                        <div>
                            <p className="font-medium">Purchase order workflow</p>
                            <p className="text-sm text-muted-foreground">Hide Pending POs, Create PO, PO History and Get Purchase. Approved purchase indents go directly to Receive Items.</p>
                            <p className="text-xs text-muted-foreground">Saved in this browser. Show restores the normal workflow.</p>
                        </div>
                        <Button variant="outline" aria-pressed={purchaseWorkflowHidden} onClick={() => {
                            try {
                                setPurchaseWorkflowHidden(!purchaseWorkflowHidden);
                                toast.success(purchaseWorkflowHidden ? 'Purchase workflow shown' : 'Purchase workflow hidden; PO steps skipped');
                            } catch { toast.error('Could not save workflow setting'); }
                        }}>
                            {purchaseWorkflowHidden ? <Eye /> : <EyeClosed />}
                            {purchaseWorkflowHidden ? 'Show' : 'Hide'}
                        </Button>
                    </div>

                    <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#C9BDAF] bg-[#FAF8F4] p-4 shadow-xs">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#D9E1D9] text-[#2F4034]">
                                <MessageSquare className="size-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-[#1F2621]">WhatsApp Integration (Maytapi)</p>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            waConfig.enabled
                                                ? 'bg-[#687F6E] text-[#FAF8F4]'
                                                : 'bg-[#EAE4DA] text-[#556158]'
                                        }`}
                                    >
                                        {waConfig.enabled ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-sm text-[#556158]">
                                    Purchase indent alerts to 4 numbers &amp; Store Out approval alerts to 2 numbers.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="rounded-full border-[#C9BDAF] text-[#2F4034] hover:bg-[#EAE4DA] font-semibold gap-1.5"
                                onClick={() => {
                                    setOpenWaLogs(true);
                                    fetchWaLogs();
                                }}
                            >
                                <History className="size-4" />
                                View Logs
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-full border-[#687F6E] text-[#2F4034] hover:bg-[#D9E1D9] font-semibold gap-1.5"
                                onClick={() => {
                                    setWaConfig(loadMaytapiConfig());
                                    setOpenWaDialog(true);
                                }}
                            >
                                <MessageSquare className="size-4" />
                                Configure Maytapi
                            </Button>
                        </div>
                    </div>

                    <DataTable
                        data={tableData}
                        columns={columns}
                        searchFields={['name', 'username', 'permissions']}
                        dataLoading={dataLoading}
                        className="h-[80dvh]"
                        extraActions={
                            <Button
                                className="h-10 rounded-full px-4 text-xs bg-[#687F6E] hover:bg-[#4F6354] text-[#FAF8F4] font-semibold gap-1.5 shadow-sm shrink-0"
                                onClick={() => {
                                    setOpenDialog(true);
                                    setSelectedUser(null);
                                }}
                            >
                                <UserPlus className="size-4" />
                                Create User
                            </Button>
                        }
                    />
                </div>

                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col">
                            <DialogHeader className="bg-gradient-to-r from-[#EAE4DA] via-[#FAF8F4] to-[#D9E1D9]/70 px-6 py-4 border-b border-[#C9BDAF]">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-[#687F6E] text-[#FAF8F4] shadow-sm">
                                        <ShieldUser className="size-5" />
                                    </div>
                                    <div className="text-left">
                                        <DialogTitle className="text-lg font-bold text-[#1F2621]">
                                            {selectedUser ? `Edit Access — ${selectedUser.name}` : 'Create User & Page Access'}
                                        </DialogTitle>
                                        <p className="text-xs text-[#556158]">
                                            Select which pages and actions this user can access
                                        </p>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-6 space-y-5">
                            <div className="grid md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter username" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter name of user"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Enter password"
                                                        {...field}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        type="button"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent active:bg-transparent"
                                                        tabIndex={-1}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setShowPassword(!showPassword);
                                                        }}
                                                    >
                                                        {showPassword ? <EyeClosed /> : <Eye />}
                                                        <span className="sr-only">
                                                            Toggle password visibility
                                                        </span>
                                                    </Button>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="permissions"
                                render={({ field }) => {
                                    const selected = field.value || [];
                                    const groups = Array.from(
                                        new Set(allPermissionKeys.map((k) => permissionLabels[k]?.group || 'Other'))
                                    );
                                    return (
                                        <FormItem className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-sm font-bold text-[#1F2621]">
                                                    Page Access & Permissions ({selected.length}/{allPermissionKeys.length})
                                                </FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 rounded-full px-3 text-xs"
                                                        onClick={() => field.onChange([...allPermissionKeys])}
                                                    >
                                                        Select All
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 rounded-full px-3 text-xs"
                                                        onClick={() => field.onChange([])}
                                                    >
                                                        Clear All
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid gap-3">
                                                {groups.map((group) => {
                                                    const keysInGroup = allPermissionKeys.filter(
                                                        (k) => (permissionLabels[k]?.group || 'Other') === group
                                                    );
                                                    return (
                                                        <div
                                                            key={group}
                                                            className="rounded-xl border border-[#C9BDAF] bg-[#FAF8F4] p-3.5 space-y-2.5"
                                                        >
                                                            <p className="text-xs font-bold uppercase tracking-wider text-[#4F6354]">
                                                                {group}
                                                            </p>
                                                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                                {keysInGroup.map((perm) => {
                                                                    const isChecked = selected.includes(perm);
                                                                    return (
                                                                        <label
                                                                            key={perm}
                                                                            htmlFor={perm}
                                                                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                                                                                isChecked
                                                                                    ? 'border-[#687F6E] bg-[#D9E1D9]/60 text-[#1F2621]'
                                                                                    : 'border-[#C9BDAF]/70 bg-white text-[#556158] hover:border-[#687F6E]/60'
                                                                            }`}
                                                                        >
                                                                            <span className="flex items-center gap-2 min-w-0">
                                                                                <Checkbox
                                                                                    id={perm}
                                                                                    checked={isChecked}
                                                                                    onCheckedChange={(checked) => {
                                                                                        checked
                                                                                            ? field.onChange([...selected, perm])
                                                                                            : field.onChange(
                                                                                                  selected.filter((p) => p !== perm)
                                                                                              );
                                                                                    }}
                                                                                />
                                                                                <span className="leading-tight truncate">
                                                                                    {permissionLabels[perm]?.label || camelToTitleCase(perm)}
                                                                                </span>
                                                                            </span>
                                                                            <span
                                                                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                                                                    isChecked
                                                                                        ? 'bg-[#687F6E] text-[#FAF8F4]'
                                                                                        : 'bg-[#EAE4DA] text-[#556158]'
                                                                                }`}
                                                                            >
                                                                                {isChecked ? 'TRUE' : 'FALSE'}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </FormItem>
                                    );
                                }}
                            />
                            </div>
                            <DialogFooter className="bg-[#EAE4DA]/60 px-6 py-4 border-t border-[#C9BDAF]">
                                <DialogClose asChild>
                                    <Button variant="outline" className="rounded-full">Close</Button>
                                </DialogClose>

                                <Button
                                    type="submit"
                                    disabled={form.formState.isSubmitting}
                                    className="rounded-full bg-[#687F6E] hover:bg-[#4F6354] text-[#FAF8F4]"
                                >
                                    {form.formState.isSubmitting && (
                                        <Loader
                                            size={20}
                                            color="white"
                                            aria-label="Loading Spinner"
                                        />
                                    )}
                                    {selectedUser ? 'Save Access' : 'Create User'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Maytapi WhatsApp Configuration Dialog */}
            <Dialog open={openWaDialog} onOpenChange={setOpenWaDialog}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="bg-gradient-to-r from-[#EAE4DA] via-[#FAF8F4] to-[#D9E1D9]/70 px-6 py-4 border-b border-[#C9BDAF]">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-[#687F6E] text-[#FAF8F4] shadow-sm">
                                    <MessageSquare className="size-5" />
                                </div>
                                <div className="text-left">
                                    <DialogTitle className="text-lg font-bold text-[#1F2621]">
                                        Maytapi WhatsApp Settings
                                    </DialogTitle>
                                    <p className="text-xs text-[#556158]">
                                        Configure API credentials and notification recipients
                                    </p>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        {/* Enable Toggle */}
                        <label className="flex items-center justify-between rounded-xl border border-[#C9BDAF] bg-[#FAF8F4] p-3.5 cursor-pointer">
                            <div>
                                <p className="text-sm font-semibold text-[#1F2621]">Enable WhatsApp Alerts</p>
                                <p className="text-xs text-[#556158]">Automatically send messages when an indent is raised</p>
                            </div>
                            <Checkbox
                                checked={waConfig.enabled}
                                onCheckedChange={(checked) =>
                                    setWaConfig((prev) => ({ ...prev, enabled: Boolean(checked) }))
                                }
                            />
                        </label>

                        {/* Maytapi API Credentials */}
                        <div className="rounded-xl border border-[#C9BDAF] bg-[#FAF8F4] p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#4F6354]">
                                Maytapi API Credentials
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-[#1F2621]">Product ID</label>
                                    <Input
                                        placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx"
                                        value={waConfig.productId}
                                        onChange={(e) =>
                                            setWaConfig((p) => ({ ...p, productId: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-[#1F2621]">Phone ID</label>
                                    <Input
                                        placeholder="e.g. 12345"
                                        value={waConfig.phoneId}
                                        onChange={(e) =>
                                            setWaConfig((p) => ({ ...p, phoneId: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#1F2621]">API Token (x-maytapi-key)</label>
                                <div className="relative">
                                    <Input
                                        type={showWaToken ? 'text' : 'password'}
                                        placeholder="Enter Maytapi API Token"
                                        value={waConfig.token}
                                        onChange={(e) =>
                                            setWaConfig((p) => ({ ...p, token: e.target.value }))
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent"
                                        onClick={() => setShowWaToken(!showWaToken)}
                                    >
                                        {showWaToken ? <EyeClosed className="size-4" /> : <Eye className="size-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* 4 Purchase Indent Recipients */}
                        <div className="rounded-xl border border-[#C9BDAF] bg-[#FAF8F4] p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#4F6354]">
                                Purchase Indent Alerts (4 Recipients)
                            </p>
                            <div className="grid gap-2.5">
                                {waConfig.purchaseRecipients.map((rec, idx) => (
                                    <div key={`purchase-${idx}`} className="grid grid-cols-2 gap-2.5">
                                        <Input
                                            placeholder={`Person ${idx + 1} Name`}
                                            value={rec.name}
                                            onChange={(e) =>
                                                setWaConfig((prev) => {
                                                    const next = [...prev.purchaseRecipients];
                                                    next[idx] = { ...next[idx], name: e.target.value };
                                                    return { ...prev, purchaseRecipients: next };
                                                })
                                            }
                                        />
                                        <Input
                                            placeholder="WhatsApp No. (e.g. 9876543210)"
                                            value={rec.phone}
                                            onChange={(e) =>
                                                setWaConfig((prev) => {
                                                    const next = [...prev.purchaseRecipients];
                                                    next[idx] = { ...next[idx], phone: e.target.value };
                                                    return { ...prev, purchaseRecipients: next };
                                                })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2 Store Out Approval Recipients */}
                        <div className="rounded-xl border border-[#C9BDAF] bg-[#FAF8F4] p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#4F6354]">
                                Store Out Approval Alerts (2 Recipients)
                            </p>
                            <div className="grid gap-2.5">
                                {waConfig.storeOutRecipients.map((rec, idx) => (
                                    <div key={`storeout-${idx}`} className="grid grid-cols-2 gap-2.5">
                                        <Input
                                            placeholder={`Person ${idx + 1} Name`}
                                            value={rec.name}
                                            onChange={(e) =>
                                                setWaConfig((prev) => {
                                                    const next = [...prev.storeOutRecipients];
                                                    next[idx] = { ...next[idx], name: e.target.value };
                                                    return { ...prev, storeOutRecipients: next };
                                                })
                                            }
                                        />
                                        <Input
                                            placeholder="WhatsApp No. (e.g. 9876543210)"
                                            value={rec.phone}
                                            onChange={(e) =>
                                                setWaConfig((prev) => {
                                                    const next = [...prev.storeOutRecipients];
                                                    next[idx] = { ...next[idx], phone: e.target.value };
                                                    return { ...prev, storeOutRecipients: next };
                                                })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Test Send */}
                        <div className="rounded-xl border border-[#C9BDAF] bg-[#EAE4DA]/40 p-3.5 flex flex-wrap items-center gap-2">
                            <Input
                                placeholder="Test number (e.g. 9876543210)"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                className="flex-1 min-w-[180px]"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={sendingTest}
                                className="rounded-full gap-1.5"
                                onClick={async () => {
                                    if (!waConfig.productId || !waConfig.phoneId || !waConfig.token) {
                                        toast.error('Please enter Product ID, Phone ID, and API Token first');
                                        return;
                                    }
                                    if (!testPhone.trim()) {
                                        toast.error('Enter a test WhatsApp number');
                                        return;
                                    }
                                    setSendingTest(true);
                                    try {
                                        const testMsg = '✅ Store App: Maytapi WhatsApp connection test successful!';
                                        const res = await sendMaytapiMessage(
                                            waConfig,
                                            testPhone,
                                            testMsg
                                        );
                                        await logWhatsAppToSheet([
                                            {
                                                timestamp: new Date().toISOString(),
                                                indentNo: 'TEST',
                                                indentType: 'Test',
                                                recipientName: 'Test Recipient',
                                                phone: normalizeWhatsAppNumber(testPhone),
                                                message: testMsg,
                                                status: res.ok ? 'Sent' : 'Failed',
                                                response: res.detail.slice(0, 250),
                                            },
                                        ]);
                                        if (res.ok) toast.success('Test WhatsApp message sent & logged!');
                                        else toast.error(`Failed: ${res.detail}`);
                                    } catch {
                                        toast.error('Network error sending test message');
                                    } finally {
                                        setSendingTest(false);
                                    }
                                }}
                            >
                                <Send className="size-3.5" />
                                {sendingTest ? 'Sending...' : 'Send Test'}
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="bg-[#EAE4DA]/60 px-6 py-4 border-t border-[#C9BDAF]">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setOpenWaDialog(false)}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            disabled={savingWaConfig}
                            className="rounded-full bg-[#687F6E] hover:bg-[#4F6354] text-[#FAF8F4] gap-1.5"
                            onClick={async () => {
                                setSavingWaConfig(true);
                                const synced = await saveMaytapiConfigToSheet(waConfig);
                                setSavingWaConfig(false);
                                if (synced) {
                                    toast.success('Maytapi WhatsApp settings saved & synced to sheet');
                                } else {
                                    toast.success('Saved locally (Add Config column in I1 of Whatsapp Log sheet to sync)');
                                }
                                setOpenWaDialog(false);
                            }}
                        >
                            <CheckCircle2 className="size-4" />
                            {savingWaConfig ? 'Saving...' : 'Save Credentials'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* WhatsApp Logs Viewer Dialog */}
            <Dialog open={openWaLogs} onOpenChange={setOpenWaLogs}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="bg-gradient-to-r from-[#EAE4DA] via-[#FAF8F4] to-[#D9E1D9]/70 px-6 py-4 border-b border-[#C9BDAF]">
                        <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-[#687F6E] text-[#FAF8F4] shadow-sm">
                                    <History className="size-5" />
                                </div>
                                <div className="text-left">
                                    <DialogTitle className="text-lg font-bold text-[#1F2621]">
                                        WhatsApp Message Logs
                                    </DialogTitle>
                                    <p className="text-xs text-[#556158]">
                                        Synced with Google Sheet tab: Whatsapp Log
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full gap-1.5 text-xs"
                                onClick={() => {
                                    const headers =
                                        'Timestamp\tIndent No\tIndent Type\tRecipient Name\tPhone\tMessage\tStatus\tResponse\tConfig';
                                    navigator.clipboard.writeText(headers);
                                    toast.success('Copied Row 1 headers! Paste in A1 of Whatsapp Log sheet.');
                                }}
                            >
                                <Copy className="size-3.5" />
                                Copy Sheet Headers (A1:I1)
                            </Button>
                        </div>
                    </DialogHeader>

                    <DataTable
                        data={waLogs}
                        dataLoading={waLogsLoading}
                        searchFields={['indentNo', 'indentType', 'recipientName', 'phone', 'status']}
                        className="h-[55vh]"
                        columns={[
                            {
                                accessorKey: 'timestamp',
                                header: 'Date',
                                cell: ({ row }) =>
                                    row.original.timestamp
                                        ? formatDate(new Date(row.original.timestamp))
                                        : '-',
                            },
                            { accessorKey: 'indentNo', header: 'Indent No.' },
                            { accessorKey: 'indentType', header: 'Type' },
                            { accessorKey: 'recipientName', header: 'Recipient' },
                            { accessorKey: 'phone', header: 'Phone' },
                            {
                                accessorKey: 'status',
                                header: 'Status',
                                cell: ({ row }) => (
                                    <Pill variant={row.original.status === 'Sent' ? 'primary' : 'reject'}>
                                        {row.original.status}
                                    </Pill>
                                ),
                            },
                            {
                                accessorKey: 'message',
                                header: 'Message',
                                cell: ({ getValue }) => (
                                    <div className="max-w-[240px] truncate text-xs" title={String(getValue() || '')}>
                                        {String(getValue() || '-')}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};
