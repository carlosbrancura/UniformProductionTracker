import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Batch, Product, Workshop } from "@shared/schema";

const batchEditSchema = z.object({
  cutDate: z.string().min(1, "Data de corte é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  workshopId: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  observations: z.string().optional(),
  products: z.array(z.object({
    productId: z.string().min(1, "Produto é obrigatório"),
    quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
    selectedColor: z.string().min(1, "Cor é obrigatória"),
    selectedSize: z.string().min(1, "Tamanho é obrigatório"),
  })).min(1, "Pelo menos um produto é obrigatório"),
});

type BatchEditData = z.infer<typeof batchEditSchema>;

interface BatchEditFormProps {
  batch: Batch;
  products: Product[];
  workshops: Workshop[];
  onClose: () => void;
}

export default function BatchEditForm({ batch, products, workshops, onClose }: BatchEditFormProps) {
  const { toast } = useToast();

  // Query to get batch products
  const { data: batchProducts = [], isLoading } = useQuery({
    queryKey: ['/api/batch-products', batch.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/batch-products/${batch.id}`);
      return response;
    },
  });

  const form = useForm<BatchEditData>({
    resolver: zodResolver(batchEditSchema),
    defaultValues: {
      cutDate: batch.cutDate ? new Date(batch.cutDate).toISOString().split('T')[0] : "",
      status: batch.status || "waiting",
      workshopId: batch.workshopId ? batch.workshopId.toString() : "internal",
      expectedReturnDate: batch.expectedReturnDate ? new Date(batch.expectedReturnDate).toISOString().split('T')[0] : "",
      observations: batch.observations || "",
      products: [{ productId: "", quantity: 1, selectedColor: "", selectedSize: "" }],
    },
  });

  // Set batch products when data is loaded
  useState(() => {
    if (batchProducts.length > 0) {
      const formattedProducts = batchProducts.map((bp: any) => ({
        productId: bp.productId.toString(),
        quantity: bp.quantity,
        selectedColor: bp.selectedColor || "",
        selectedSize: bp.selectedSize || "",
      }));
      form.setValue("products", formattedProducts);
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const getSelectedProduct = (productId: string) => {
    if (!productId) return null;
    return products.find(p => p.id.toString() === productId) || null;
  };

  const updateMutation = useMutation({
    mutationFn: async (data: BatchEditData) => {
      return await apiRequest(`/api/batches/${batch.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Lote atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
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

  const onSubmit = (data: BatchEditData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Editar Lote {batch.code}</h2>
        <Button variant="ghost" onClick={onClose}>×</Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <Label htmlFor="expectedReturnDate">Data Prevista de Retorno</Label>
            <Input
              id="expectedReturnDate"
              type="date"
              {...form.register("expectedReturnDate")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select onValueChange={(value) => form.setValue("status", value)} defaultValue={form.watch("status")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">Aguardando</SelectItem>
                <SelectItem value="internal_production">Produção Interna</SelectItem>
                <SelectItem value="external_workshop">Oficina Externa</SelectItem>
                <SelectItem value="returned">Retornado</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-red-600">{form.formState.errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="workshopId">Oficina</Label>
            <Select onValueChange={(value) => form.setValue("workshopId", value)} defaultValue={form.watch("workshopId")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a oficina" />
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
        </div>

        <div>
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            {...form.register("observations")}
            placeholder="Observações sobre o lote..."
          />
        </div>

        {/* Produtos do Lote */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <Label className="text-lg font-semibold">Produtos do Lote *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantity: 1, selectedColor: "", selectedSize: "" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Produto
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedProduct = getSelectedProduct(form.watch(`products.${index}.productId`));
              
              return (
                <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">Produto {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Produto *</Label>
                      <Select 
                        onValueChange={(value) => {
                          form.setValue(`products.${index}.productId`, value);
                          form.setValue(`products.${index}.selectedColor`, "");
                          form.setValue(`products.${index}.selectedSize`, "");
                        }}
                        defaultValue={form.watch(`products.${index}.productId`)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - {product.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Quantidade *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...form.register(`products.${index}.quantity`)}
                      />
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Cor *</Label>
                        <Select onValueChange={(value) => form.setValue(`products.${index}.selectedColor`, value)} defaultValue={form.watch(`products.${index}.selectedColor`)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a cor" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProduct.availableColors?.map((color, colorIndex) => (
                              <SelectItem key={colorIndex} value={color}>
                                {color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Tamanho *</Label>
                        <Select onValueChange={(value) => form.setValue(`products.${index}.selectedSize`, value)} defaultValue={form.watch(`products.${index}.selectedSize`)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tamanho" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProduct.availableSizes?.map((size, sizeIndex) => (
                              <SelectItem key={sizeIndex} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {selectedProduct && (
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Valor de Produção:</strong> R$ {selectedProduct.productionValue || "0,00"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {form.formState.errors.products && (
            <p className="text-sm text-red-600">{form.formState.errors.products.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}