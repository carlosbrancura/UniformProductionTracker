import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Workshop } from "@shared/schema";

interface WorkshopFormProps {
  workshop?: Workshop | null;
  onClose: () => void;
}

const workshopFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  manager: z.string().min(1, "Responsável é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  serviceType: z.string().min(1, "Tipo de serviço é obrigatório"),
  capacity: z.string().optional(),
  color: z.string().min(1, "Cor é obrigatória"),
  scheduleOrder: z.coerce.number().min(1, "Ordem do cronograma é obrigatória"),
});

type WorkshopFormData = z.infer<typeof workshopFormSchema>;

const colorOptions = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#F59E0B", label: "Âmbar" },
  { value: "#10B981", label: "Verde" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#6B7280", label: "Cinza" },
];

export default function WorkshopForm({ workshop, onClose }: WorkshopFormProps) {
  const { toast } = useToast();
  const isEditing = !!workshop;

  const form = useForm<WorkshopFormData>({
    resolver: zodResolver(workshopFormSchema),
    defaultValues: {
      name: workshop?.name || "",
      manager: workshop?.manager || "",
      phone: workshop?.phone || "",
      address: workshop?.address || "",
      serviceType: workshop?.serviceType || "",
      capacity: workshop?.capacity || "",
      color: workshop?.color || "#3B82F6",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: WorkshopFormData) => {
      const url = isEditing ? `/api/workshops/${workshop!.id}` : '/api/workshops';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: `Oficina ${isEditing ? 'atualizada' : 'criada'} com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      onClose();
    },
    onError: () => {
      toast({ title: `Erro ao ${isEditing ? 'atualizar' : 'criar'} oficina`, variant: "destructive" });
    },
  });

  const onSubmit = (data: WorkshopFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Oficina' : 'Nova Oficina'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Ex: Oficina de Costura Silva"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="manager">Responsável *</Label>
              <Input
                id="manager"
                {...form.register("manager")}
                placeholder="Ex: Maria Silva"
              />
              {form.formState.errors.manager && (
                <p className="text-sm text-red-600">{form.formState.errors.manager.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                placeholder="(11) 99999-1234"
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="capacity">Capacidade</Label>
              <Input
                id="capacity"
                {...form.register("capacity")}
                placeholder="Ex: 50 peças/dia"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Endereço *</Label>
            <Input
              id="address"
              {...form.register("address")}
              placeholder="Rua das Flores, 123 - Vila Industrial"
            />
            {form.formState.errors.address && (
              <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="serviceType">Tipo de Serviço *</Label>
            <Input
              id="serviceType"
              {...form.register("serviceType")}
              placeholder="Ex: Costura, Acabamento"
            />
            {form.formState.errors.serviceType && (
              <p className="text-sm text-red-600">{form.formState.errors.serviceType.message}</p>
            )}
          </div>

          <div>
            <Label>Cor do Calendário *</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-12 h-12 rounded-lg border-2 ${
                    form.watch("color") === option.value ? "border-slate-400" : "border-slate-200"
                  }`}
                  style={{ backgroundColor: option.value }}
                  onClick={() => form.setValue("color", option.value)}
                />
              ))}
            </div>
            {form.formState.errors.color && (
              <p className="text-sm text-red-600">{form.formState.errors.color.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar" : "Criar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
