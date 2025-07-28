import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { User, Mail, Calendar, Lock } from "lucide-react";
import { useState } from "react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    id: string;
  };
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Usuário
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-primary-foreground font-semibold text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Informações */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                value={user.email}
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                ID do Usuário
              </Label>
              <Input
                value={user.id.slice(0, 8) + "..."}
                disabled
                className="bg-muted text-muted-foreground font-mono text-sm"
              />
            </div>
          </div>

          {/* Segurança */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Segurança
            </Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowChangePassword(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Alterar Senha
            </Button>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                // Aqui seria implementada a atualização do perfil
                onClose();
              }} 
              className="flex-1"
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}