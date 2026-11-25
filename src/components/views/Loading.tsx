import { HashLoader } from 'react-spinners';
import { APP_VERSION } from '@/lib/utils';

export default () => (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col justify-center items-center bg-gradient-to-br from-[#F4EFE8] via-[#EAE4DA] to-[#D9E1D9] p-4 select-none">
        {/* Soft ambient 3D depth glow */}
        <div className="pointer-events-none absolute size-72 rounded-full bg-[#A7B5A7]/35 blur-3xl -translate-y-6" />

        <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Floating 3D Loader with soft ground shadow */}
            <div className="flex flex-col items-center gap-4">
                <div className="animate-bounce [animation-duration:2.4s] drop-shadow-[0_14px_18px_rgba(79,99,84,0.35)]">
                    <HashLoader color="#4F6354" size={56} aria-label="Loading Spinner" />
                </div>
                <div className="h-2.5 w-16 rounded-full bg-[#4F6354]/25 blur-[5px] animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-extrabold tracking-tight text-[#1F2621] drop-shadow-[0_2px_4px_rgba(31,38,33,0.12)]">
                    Store App <span className="text-xs font-semibold text-[#556158] tracking-normal">{APP_VERSION}</span>
                </h2>
                <p className="text-sm font-medium text-[#556158]">
                    Please wait, loading your workspace...
                </p>
            </div>
        </div>
    </div>
);
