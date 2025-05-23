import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product, Workshop } from "@shared/schema";

interface BatchFormProps {
  products: Product[];
  workshops: Workshop[];
  onClose: () => void;
}

const batchFormSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: z.number().min(1, "Quantidade deve ser maior que 0"),
  cutDate: z.string().min(1, "Data de corte é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  workshopId: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  observations: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchFormSchema>;

export default function BatchForm({ products, workshops, onClose }: BatchFormProps) {
  const { toast } = useToast();
  
  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      status: "waiting",
      cutDate: new Date().toISOString().split('T')[0],
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      const batchData = {
        productId: parseInt(data.productId),
        quantity: data.quantity,
        cutDate: new Date(data.cutDate),
        status: data.status,
        workshopId: data.workshopId ? parseInt(data.workshopId) : null,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        observations: data.observations || null,
        sentToProductionDate: null,
        actualReturnDate: null,
        conferenceResult: null,
        imageUrl: null,
      };
      
      const response = await apiRequest('POST', '/api/batches', batchData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lote criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Erro ao criar lote", variant: "destructive" });
    },
  });

  const onSubmit = (data: BatchFormData) => {
    createBatchMutation.mutate(data);
  };

  const watchedStatus = form.watch("status");

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lote de Produção</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productId">Produto *</Label>
              <Select onValueChange={(value) => form.setValue("productId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.productId && (
                <p className="text-sm text-red-600">{form.formState.errors.productId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                {...form.register("quantity", { valueAsNumber: true })}
                placeholder="Ex: 100"
              />
              {form.formState.errors.quantity && (
                <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cutDate">Data de Corte *</Label>
              <Input
                id="cutDate"
                type="date"
                {...form.register("cutDate")}
              />
              {form.formState.errors.cutDate && (
                <p className="text-sm text-red-600">{form.formState.errors.cutDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select onValueChange={(value) => form.setValue("status", value)} defaultValue="waiting">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="internal_production">Produção Interna</SelectItem>
                  <SelectItem value="external_workshop">Oficina Externa</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-600">{form.formState.errors.status.message}</p>
              )}
            </div>
          </div>

          {(watchedStatus === "external_workshop") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workshopId">Oficina</Label>
                <Select onValueChange={(value) => form.setValue("workshopId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops.map((workshop) => (
                      <SelectItem key={workshop.id} value={workshop.id.toString()}>
                        {workshop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedReturnDate">Previsão de Retorno</Label>
                <Input
                  id="expectedReturnDate"
                  type="date"
                  {...form.register("expectedReturnDate")}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              {...form.register("observations")}
              placeholder="Observações sobre o lote..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createBatchMutation.isPending}>
              {createBatchMutation.isPending ? "Criando..." : "Criar Lote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
