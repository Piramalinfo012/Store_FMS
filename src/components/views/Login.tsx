import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ClipLoader as Loader } from 'react-spinners';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, ClipboardCheck, Eye, EyeClosed, Lock, Package, ShieldCheck, Truck, User } from 'lucide-react';
import Logo from '../element/Logo';
import { APP_VERSION } from '@/lib/utils';
import { toast } from 'sonner';

export default () => {
    const { login, loggedIn } = useAuth();
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (loggedIn) {
            navigate('/');
        }
    }, [loggedIn]);

    const schema = z.object({
        username: z.string().nonempty(),
        password: z.string().nonempty(),
    });

    const form = useForm({ resolver: zodResolver(schema) });

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            const res = await login(values.username, values.password);
            if (!res) {
                toast.error("Invalid Username or Password")
            }
        } catch {
            toast.error("Something went wrong! Try again")
        }
    }

    function onError(e: any) {
        console.log(e);
    }

    return (
        <div className="min-h-dvh w-full flex items-center justify-center bg-gradient-to-br from-[#3C5647] via-[#2B4638] to-[#1E3328] p-3 sm:p-6 md:p-10">
            <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl shadow-black/30 bg-[#263F32] grid grid-cols-1 md:grid-cols-12 min-h-[600px] border border-white/10">
                {/* Left / Top Ivory Panel with Curved Wave & Store Illustration */}
                <div className="relative md:col-span-6 bg-[#FAF8F4] flex flex-col justify-between p-6 sm:p-8 pb-12 md:pb-8 overflow-hidden">
                    {/* Brand Header */}
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Logo size={38} />
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg sm:text-xl font-bold tracking-tight text-[#1F2621]">
                                        Store App
                                    </span>
                                    <span className="text-[11px] font-semibold text-[#556158]">
                                        {APP_VERSION}
                                    </span>
                                </div>
                                <p className="text-[11px] font-medium text-[#556158]">
                                    Flow Management System
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Organic Sage Blob + Store Illustration */}
                    <div className="relative z-10 my-6 md:my-0 flex flex-col items-center justify-center">
                        <div className="relative flex items-center justify-center w-52 h-44 sm:w-64 sm:h-56">
                            {/* Soft Sage Organic Blobs */}
                            <div className="absolute inset-0 rounded-[44%_56%_62%_38%/46%_42%_58%_54%] bg-[#D9E1D9]/80 animate-pulse [animation-duration:6s]" />
                            <div className="absolute inset-4 rounded-[58%_42%_45%_55%/52%_60%_40%_48%] bg-[#A7B5A7]/45" />

                            {/* Central Store / Inventory Visual */}
                            <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className="flex items-center justify-center size-20 sm:size-24 rounded-3xl bg-gradient-to-br from-[#2B4638] to-[#4F6354] text-[#FAF8F4] shadow-xl shadow-[#2B4638]/25">
                                    <Package className="size-10 sm:size-12 stroke-[1.7]" />
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="flex items-center justify-center size-9 rounded-xl bg-[#FAF8F4] text-[#4F6354] shadow-md border border-[#C9BDAF]">
                                        <ClipboardCheck className="size-4" />
                                    </span>
                                    <span className="flex items-center justify-center size-9 rounded-xl bg-[#FAF8F4] text-[#4F6354] shadow-md border border-[#C9BDAF]">
                                        <Box className="size-4" />
                                    </span>
                                    <span className="flex items-center justify-center size-9 rounded-xl bg-[#FAF8F4] text-[#4F6354] shadow-md border border-[#C9BDAF]">
                                        <Truck className="size-4" />
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="hidden md:block text-center text-xs font-medium text-[#556158] max-w-xs mt-3">
                            Indents, approvals, purchases, and store inventory — unified in one calm workspace.
                        </p>
                    </div>

                    {/* Desktop Footer on Left */}
                    <div className="relative z-10 hidden md:flex items-center justify-between text-[11px] text-[#556158]">
                        <span>Developed By <strong className="text-[#2F4034]">Deepak Sahu</strong></span>
                        <span className="inline-flex items-center gap-1 text-[#4F6354] font-medium">
                            <ShieldCheck className="size-3.5" /> Secure Access
                        </span>
                    </div>

                    {/* Desktop Vertical Curved Wave Divider */}
                    <svg
                        viewBox="0 0 120 600"
                        preserveAspectRatio="none"
                        className="hidden md:block absolute top-0 right-0 h-full w-16 lg:w-24 text-[#263F32] pointer-events-none"
                        aria-hidden="true"
                    >
                        <path
                            fill="currentColor"
                            d="M68,0 C18,120 112,240 42,360 C-10,450 85,530 35,600 L120,600 L120,0 Z"
                        />
                    </svg>

                    {/* Mobile Horizontal Curved Wave Divider */}
                    <svg
                        viewBox="0 0 400 60"
                        preserveAspectRatio="none"
                        className="md:hidden absolute bottom-0 left-0 w-full h-10 text-[#263F32] pointer-events-none"
                        aria-hidden="true"
                    >
                        <path
                            fill="currentColor"
                            d="M0,25 C120,65 260,-5 400,32 L400,60 L0,60 Z"
                        />
                    </svg>
                </div>

                {/* Right / Bottom Deep Forest-Sage Login Panel */}
                <div className="md:col-span-6 bg-[#263F32] text-[#FAF8F4] flex flex-col justify-between p-6 sm:p-10">
                    <div className="my-auto w-full max-w-sm mx-auto">
                        <div className="mb-7 text-center md:text-left">
                            <h1 className="text-3xl font-bold tracking-tight text-[#FAF8F4]">Login</h1>
                            <p className="text-xs sm:text-sm text-[#D9E1D9]/80 mt-1">
                                Sign in to continue to Store App
                            </p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="!text-[#FAF8F4] !font-medium !text-xs pl-1">
                                                Username
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#A7B5A7]" />
                                                    <Input
                                                        {...field}
                                                        placeholder="Enter your username"
                                                        className="!h-11 !rounded-full !bg-[#1A2D23] !border-[#4F6B5A] !text-[#FAF8F4] placeholder:!text-[#A7B5A7]/80 !pl-11 !pr-4 focus-visible:!border-[#84A89C] focus-visible:!ring-[#84A89C]/30"
                                                    />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="!text-[#FAF8F4] !font-medium !text-xs pl-1">
                                                Password
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#A7B5A7]" />
                                                    <Input
                                                        type={visible ? 'text' : 'password'}
                                                        placeholder="Enter your password"
                                                        className="!h-11 !rounded-full !bg-[#1A2D23] !border-[#4F6B5A] !text-[#FAF8F4] placeholder:!text-[#A7B5A7]/80 !pl-11 !pr-11 focus-visible:!border-[#84A89C] focus-visible:!ring-[#84A89C]/30"
                                                        {...field}
                                                    />
                                                    <button
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A7B5A7] hover:text-[#FAF8F4] transition-colors p-1"
                                                        tabIndex={-1}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setVisible(!visible);
                                                        }}
                                                    >
                                                        {visible ? <EyeClosed className="size-4" /> : <Eye className="size-4" />}
                                                        <span className="sr-only">
                                                            Toggle password visibility
                                                        </span>
                                                    </button>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full h-11 rounded-full bg-[#74A096] hover:bg-[#84B0A6] text-[#14241C] font-bold text-sm shadow-lg shadow-black/20 transition-all cursor-pointer"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        {form.formState.isSubmitting && (
                                            <Loader size={18} color="#14241C" aria-label="Loading Spinner" />
                                        )}
                                        Login to Store App
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>

                    {/* Mobile & Right Footer */}
                    <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A7B5A7]">
                        <span className="md:hidden">Developed By <strong className="text-[#FAF8F4]">Deepak Sahu</strong></span>
                        <span className="hidden md:inline">Store App • {APP_VERSION}</span>
                        <span>Inventory & Purchase Management</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
