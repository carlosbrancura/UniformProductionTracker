import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Batch, Workshop } from "@shared/schema";

interface SimpleBatchEditProps {
  batch: Batch;
  workshops: Workshop[];
  onClose: () => void;
}

export default function SimpleBatchEdit({ batch, workshops, onClose }: SimpleBatchEditProps) {
  const { toast } = useToast();
  
  const [status, setStatus] = useState(batch.status || "waiting");
  const [workshopId, setWorkshopId] = useState(
    batch.workshopId ? batch.workshopId.toString() : "internal"
  );
  const [observations, setObservations] = useState(batch.observations || "");
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    batch.expectedReturnDate ? format(new Date(batch.expectedReturnDate), "yyyy-MM-dd") : ""
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        status,
        workshopId: workshopId === "internal" ? null : parseInt(workshopId),
        observations,
        expectedReturnDate
      };
      
      console.log('Sending update:', payload);
      
      const response = await fetch(`/api/batches/${batch.id}/simple`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar lote");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Update success:', data);
      toast({ title: "Lote atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.refetchQueries({ queryKey: ["/api/batches"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar lote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Editar Lote {batch.code}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">Aguardando</SelectItem>
                <SelectItem value="internal_production">Produção Interna</SelectItem>
                <SelectItem value="external_workshop">Oficina Externa</SelectItem>
                <SelectItem value="returned">Retornado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Oficina</Label>
            <Select value={workshopId} onValueChange={setWorkshopId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Produção Interna</SelectItem>
                {workshops.map((workshop) => (
                  <SelectItem key={workshop.id} value={workshop.id.toString()}>
                    {workshop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Previsão de Retorno</Label>
            <Input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações sobre o lote..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}