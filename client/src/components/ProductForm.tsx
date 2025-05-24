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
import { Plus, Trash2, X } from "lucide-react";
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
  availableColors: z.array(z.string()).min(1, "Pelo menos uma cor é obrigatória"),
  availableSizes: z.array(z.string()).min(1, "Pelo menos um tamanho é obrigatório"),
  productionValue: z.string().min(1, "Valor de produção é obrigatório"),
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
      availableColors: product?.availableColors || [""],
      availableSizes: product?.availableSizes || [""],
      productionValue: product?.productionValue?.toString() || "",
    },
  });

  const { fields: notionFields, append: appendNotion, remove: removeNotion } = useFieldArray({
    control: form.control,
    name: "notions",
  });

  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control: form.control,
    name: "availableColors",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "availableSizes",
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const url = isEditing ? `/api/products/${product!.id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: isEditing ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
    },
    onError: () => {
      toast({ 
        title: "Erro ao salvar produto", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    // Filter out empty colors and sizes
    const cleanData = {
      ...data,
      availableColors: data.availableColors.filter(color => color.trim() !== ""),
      availableSizes: data.availableSizes.filter(size => size.trim() !== ""),
    };
    mutation.mutate(cleanData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
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

          <div className="grid grid-cols-3 gap-4">
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

            <div>
              <Label htmlFor="productionValue">Valor de Produção (R$) *</Label>
              <Input
                id="productionValue"
                {...form.register("productionValue")}
                placeholder="Ex: 25.00"
                type="number"
                step="0.01"
              />
              {form.formState.errors.productionValue && (
                <p className="text-sm text-red-600">{form.formState.errors.productionValue.message}</p>
              )}
            </div>
          </div>

          {/* Cores Disponíveis */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Cores Disponíveis *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendColor("")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Cor
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {colorFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...form.register(`availableColors.${index}`)}
                    placeholder="Ex: Azul, Branco, Preto"
                    className="flex-1"
                  />
                  {colorFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColor(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {form.formState.errors.availableColors && (
              <p className="text-sm text-red-600">{form.formState.errors.availableColors.message}</p>
            )}
          </div>

          {/* Tamanhos Disponíveis */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Tamanhos Disponíveis *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSize("")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Tamanho
              </Button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {sizeFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...form.register(`availableSizes.${index}`)}
                    placeholder="Ex: P, M, G, GG"
                    className="flex-1"
                  />
                  {sizeFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSize(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {form.formState.errors.availableSizes && (
              <p className="text-sm text-red-600">{form.formState.errors.availableSizes.message}</p>
            )}
          </div>

          {/* Aviamentos */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Aviamentos *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendNotion({ name: "", quantity: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {notionFields.map((field, index) => (
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
                  {notionFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotion(index)}
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
              placeholder="Observações adicionais sobre o produto..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}