import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
}

const productFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().optional(),
  fabricType: z.string().min(1, "Tipo de tecido é obrigatório"),
  fabricMetersPerPiece: z.string().min(1, "Metragem por peça é obrigatória"),
  notions: z.array(z.object({
    name: z.string().min(1, "Nome do aviamento é obrigatório"),
    quantity: z.string().min(1, "Quantidade é obrigatória"),
  })).min(1, "Pelo menos um aviamento é obrigatório"),
  notes: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const { toast } = useToast();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      code: product?.code || "",
      description: product?.description || "",
      fabricType: product?.fabricType || "",
      fabricMetersPerPiece: product?.fabricMetersPerPiece || "",
      notions: product?.notions || [{ name: "", quantity: "" }],
      notes: product?.notes || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "notions",
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const url = isEditing ? `/api/products/${product!.id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
    },
    onError: () => {
      toast({ title: `Erro ao ${isEditing ? 'atualizar' : 'criar'} produto`, variant: "destructive" });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Ex: Camisa Social Masculina"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                {...form.register("code")}
                placeholder="Ex: CAMISA-001"
              />
              {form.formState.errors.code && (
                <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Descrição detalhada do produto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fabricType">Tipo de Tecido *</Label>
              <Input
                id="fabricType"
                {...form.register("fabricType")}
                placeholder="Ex: Algodão/Poliéster (60/40)"
              />
              {form.formState.errors.fabricType && (
                <p className="text-sm text-red-600">{form.formState.errors.fabricType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="fabricMetersPerPiece">Metragem por Peça *</Label>
              <Input
                id="fabricMetersPerPiece"
                {...form.register("fabricMetersPerPiece")}
                placeholder="Ex: 1.8m"
              />
              {form.formState.errors.fabricMetersPerPiece && (
                <p className="text-sm text-red-600">{form.formState.errors.fabricMetersPerPiece.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Aviamentos *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", quantity: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...form.register(`notions.${index}.name`)}
                    placeholder="Nome do aviamento"
                    className="flex-1"
                  />
                  <Input
                    {...form.register(`notions.${index}.quantity`)}
                    placeholder="Quantidade"
                    className="w-32"
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {form.formState.errors.notions && (
              <p className="text-sm text-red-600">{form.formState.errors.notions.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Observações adicionais..."
              rows={3}
            />
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
