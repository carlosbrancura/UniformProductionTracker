import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Product } from "@shared/schema";
import { Plus, X } from "lucide-react";

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
  notes: z.string().optional(),
  productionValue: z.string().min(1, "Valor de produção é obrigatório"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!product;
  
  // Estados para arrays
  const [notions, setNotions] = useState<Array<{ name: string; quantity: string }>>(
    product?.notions || [{ name: "", quantity: "" }]
  );
  const [colors, setColors] = useState<string[]>(
    product?.availableColors || [""]
  );
  const [sizes, setSizes] = useState<string[]>(
    product?.availableSizes || [""]
  );

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      code: product?.code || "",
      description: product?.description || "",
      fabricType: product?.fabricType || "",
      fabricMetersPerPiece: product?.fabricMetersPerPiece || "",
      notes: product?.notes || "",
      productionValue: product?.productionValue || "0",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const productData = {
        ...data,
        notions: notions.filter(n => n.name && n.quantity),
        availableColors: colors.filter(c => c.trim()),
        availableSizes: sizes.filter(s => s.trim()),
      };
      
      const url = isEditing ? `/api/products/${product!.id}` : '/api/products-new';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, productData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Sucesso",
        description: `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar o produto",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  const addNotion = () => {
    setNotions([...notions, { name: "", quantity: "" }]);
  };

  const removeNotion = (index: number) => {
    setNotions(notions.filter((_, i) => i !== index));
  };

  const updateNotion = (index: number, field: 'name' | 'quantity', value: string) => {
    const updated = [...notions];
    updated[index][field] = value;
    setNotions(updated);
  };

  const addColor = () => {
    setColors([...colors, ""]);
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, value: string) => {
    const updated = [...colors];
    updated[index] = value;
    setColors(updated);
  };

  const addSize = () => {
    setSizes([...sizes, ""]);
  };

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const updateSize = (index: number, value: string) => {
    const updated = [...sizes];
    updated[index] = value;
    setSizes(updated);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nome do produto"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                {...form.register("code")}
                placeholder="Código único"
              />
              {form.formState.errors.code && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Descrição do produto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fabricType">Tipo de Tecido *</Label>
              <Input
                id="fabricType"
                {...form.register("fabricType")}
                placeholder="Ex: Algodão, Poliéster"
              />
              {form.formState.errors.fabricType && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.fabricType.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="fabricMetersPerPiece">Metragem por Peça *</Label>
              <Input
                id="fabricMetersPerPiece"
                {...form.register("fabricMetersPerPiece")}
                placeholder="Ex: 2.5m"
              />
              {form.formState.errors.fabricMetersPerPiece && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.fabricMetersPerPiece.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="productionValue">Valor de Produção *</Label>
            <Input
              id="productionValue"
              {...form.register("productionValue")}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            {form.formState.errors.productionValue && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.productionValue.message}
              </p>
            )}
          </div>

          {/* Aviamentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Aviamentos</Label>
              <Button type="button" onClick={addNotion} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {notions.map((notion, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Nome do aviamento"
                  value={notion.name}
                  onChange={(e) => updateNotion(index, 'name', e.target.value)}
                />
                <Input
                  placeholder="Quantidade"
                  value={notion.quantity}
                  onChange={(e) => updateNotion(index, 'quantity', e.target.value)}
                />
                {notions.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeNotion(index)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Cores */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cores Disponíveis</Label>
              <Button type="button" onClick={addColor} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {colors.map((color, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Nome da cor"
                  value={color}
                  onChange={(e) => updateColor(index, e.target.value)}
                />
                {colors.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeColor(index)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Tamanhos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tamanhos Disponíveis</Label>
              <Button type="button" onClick={addSize} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {sizes.map((size, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Tamanho"
                  value={size}
                  onChange={(e) => updateSize(index, e.target.value)}
                />
                {sizes.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeSize(index)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Observações adicionais"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : (isEditing ? "Atualizar" : "Criar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}