import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product, Workshop } from "@shared/schema";

interface BatchFormProps {
  products: Product[];
  workshops: Workshop[];
  onClose: () => void;
}

const batchFormSchema = z.object({
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

type BatchFormData = z.infer<typeof batchFormSchema>;

export default function BatchForm({ products, workshops, onClose }: BatchFormProps) {
  const { toast } = useToast();
  
  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      status: "waiting",
      cutDate: new Date().toISOString().split('T')[0],
      products: [{ productId: "", quantity: 1, selectedColor: "", selectedSize: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      const batchData = {
        cutDate: new Date(data.cutDate),
        status: data.status,
        workshopId: data.workshopId ? parseInt(data.workshopId) : null,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        observations: data.observations,
        products: data.products.map(p => ({
          productId: parseInt(p.productId),
          quantity: p.quantity,
          selectedColor: p.selectedColor,
          selectedSize: p.selectedSize,
        })),
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

  const getSelectedProduct = (productId: string) => {
    return products.find(p => p.id.toString() === productId);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lote de Produção</DialogTitle>
        </DialogHeader>

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
              <Select onValueChange={(value) => form.setValue("status", value)} defaultValue="waiting">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
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

            <div>
              <Label htmlFor="workshopId">Oficina</Label>
              <Select onValueChange={(value) => form.setValue("workshopId", value)}>
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
                            // Reset color and size when product changes
                            form.setValue(`products.${index}.selectedColor`, "");
                            form.setValue(`products.${index}.selectedSize`, "");
                          }}
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
                        {form.formState.errors.products?.[index]?.productId && (
                          <p className="text-sm text-red-600">{form.formState.errors.products[index]?.productId?.message}</p>
                        )}
                      </div>

                      <div>
                        <Label>Quantidade *</Label>
                        <Input
                          type="number"
                          min="1"
                          {...form.register(`products.${index}.quantity`)}
                          placeholder="Quantidade"
                        />
                        {form.formState.errors.products?.[index]?.quantity && (
                          <p className="text-sm text-red-600">{form.formState.errors.products[index]?.quantity?.message}</p>
                        )}
                      </div>
                    </div>

                    {selectedProduct && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label>Cor *</Label>
                          <Select onValueChange={(value) => form.setValue(`products.${index}.selectedColor`, value)}>
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
                          {form.formState.errors.products?.[index]?.selectedColor && (
                            <p className="text-sm text-red-600">{form.formState.errors.products[index]?.selectedColor?.message}</p>
                          )}
                        </div>

                        <div>
                          <Label>Tamanho *</Label>
                          <Select onValueChange={(value) => form.setValue(`products.${index}.selectedSize`, value)}>
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
                          {form.formState.errors.products?.[index]?.selectedSize && (
                            <p className="text-sm text-red-600">{form.formState.errors.products[index]?.selectedSize?.message}</p>
                          )}
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

          <div>
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              {...form.register("observations")}
              placeholder="Observações sobre o lote..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
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