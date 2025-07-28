import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

interface HeaderProps {
  user: {
    name: string;
    email: string;
  };
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
}

export function Header({ user, onLogout, onOpenSettings, onOpenProfile }: HeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-background border border-border p-1">
              <img 
                src="/iara-logo.png" 
                alt="IARA Logo" 
                className="w-full h-full object-contain rounded-md"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                IARA
              </h1>
              <p className="text-xs text-muted-foreground">
                Inteligência Aplicada e Relatórios de Autos
              </p>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-primary-foreground font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            {onOpenProfile && (
              <DropdownMenuItem className="cursor-pointer" onClick={onOpenProfile}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
            )}
            {onOpenSettings && (
              <DropdownMenuItem className="cursor-pointer" onClick={onOpenSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}