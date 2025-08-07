import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Download, Trash2, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error";
  createdAt: Date;
  attachmentsCount: number;
  aiResponse?: string;
  hasAiResponse?: boolean;
}

interface TaskCardProps {
  task: Task;
  onProcessTask: (id: string) => void;
  onViewTask: (id: string) => void;
  onDownloadTask: (id: string) => void;
  onDeleteTask?: (id: string) => void;
}

const statusConfig = {
  pending: {
    label: "Pendente",
    color: "bg-warning text-warning-foreground",
    icon: Clock,
  },
  processing: {
    label: "Processando",
    color: "bg-primary text-primary-foreground",
    icon: AlertCircle,
  },
  completed: {
    label: "Concluído",
    color: "bg-success text-success-foreground",
    icon: CheckCircle,
  },
  error: {
    label: "Erro",
    color: "bg-destructive text-destructive-foreground",
    icon: AlertCircle,
  },
};

export function TaskCard({ task: taskItem, onProcessTask, onViewTask, onDownloadTask, onDeleteTask }: TaskCardProps) {
  const status = statusConfig[taskItem.status];
  const StatusIcon = status.icon;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {taskItem.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {taskItem.description}
            </p>
          </div>
          <Badge className={`${status.color} ml-3 flex items-center gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{taskItem.attachmentsCount} arquivo{taskItem.attachmentsCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{format(taskItem.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/50">
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewTask(taskItem.id)}
            className="flex-1 group-hover:border-primary/30 transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Detalhes
          </Button>
          
          {taskItem.status === "pending" && (
            <Button
              size="sm"
              onClick={() => onProcessTask(taskItem.id)}
              className="flex-1 bg-gradient-to-r from-primary to-primary-hover"
            >
              <Play className="h-4 w-4 mr-1" />
              Processar
            </Button>
          )}
          
          {taskItem.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadTask(taskItem.id)}
              className="flex-1 group-hover:border-primary/30 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}

          {onDeleteTask && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteTask(taskItem.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}