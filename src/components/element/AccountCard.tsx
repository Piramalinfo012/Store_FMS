import { useAuth } from '@/context/AuthContext';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function AccountCard() {
    const { user, logout } = useAuth();
    const initials = (user.name || user.username || 'U').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="store-profile-trigger" aria-label={`Open profile for ${user.name || user.username}`}>
                    <span className="store-account-avatar" aria-hidden="true">{initials}<span /></span>
                    <span className="store-profile-toggle"><ChevronDown className="store-profile-chevron" size={13} /></span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="store-profile-menu">
                <div className="store-profile-cover" />
                <div className="store-profile-summary">
                    <div className="store-account-avatar" aria-hidden="true">{initials}<span /></div>
                    <strong>{user.name}</strong><span>@{user.username}</span>
                    <span className="store-profile-status">Signed in</span>
                </div>
                <div className="store-profile-field"><UserRound size={15} /><div><span>Username</span><strong>{user.username}</strong></div></div>
                <DropdownMenuItem className="store-profile-signout" onSelect={() => logout()}><LogOut size={16} /> Log out</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
