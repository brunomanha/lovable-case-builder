import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const AdminSystemSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações do Sistema
        </CardTitle>
        <CardDescription>
          Configure parâmetros globais do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Configurações do sistema em desenvolvimento...
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminSystemSettings;