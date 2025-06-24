import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, AlertTriangle, Printer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product, Workshop, Batch } from "@shared/schema";
import BatchPrintLayout from "./BatchPrintLayout";

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
  actualReturnDate: z.string().optional(),
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
  
  const openPrintWindow = (batch: any) => {
    // Get workshop info for print
    const workshopInfo = workshops.find(w => w.id === batch.workshopId);
    const workshopName = workshopInfo?.name || 'Produção Interna';
    
    // Create print window with batch data
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lote ${batch.code} - Impressão</title>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .batch-header {
              background-color: black !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .separator-line {
              border-bottom: 1px dotted black !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              body { margin: 0; padding: 0; }
              * { box-sizing: border-box; }
            }
          </style>
        </head>
        <body>
          <div style="padding: 24px; min-height: 48vh;">
            <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
              <div class="batch-header" style="color: white; padding: 16px; font-weight: bold; font-size: 24px; min-width: 120px; text-align: center;">
                LOTE ${batch.code}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                  Oficina: ${workshopName}
                </div>
                <div style="font-size: 16px;">
                  Data Corte: ${new Date(batch.cutDate).toLocaleDateString('pt-BR')} - Entrega Prevista: ${batch.expectedReturnDate ? new Date(batch.expectedReturnDate).toLocaleDateString('pt-BR') : 'Não definida'}
                </div>
              </div>
            </div>
            <div style="margin-bottom: 32px;">
              <div class="separator-line" style="font-size: 18px; font-weight: bold; margin-bottom: 12px; padding-bottom: 4px;">Produtos</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
                  <span style="flex: 1;">Produto: Em desenvolvimento</span>
                  <span style="width: 80px; text-align: center;">Quant: <strong>-</strong></span>
                  <span style="width: 80px; text-align: center;">Cor: <strong>-</strong></span>
                  <span style="width: 64px; text-align: center;">Tam: <strong>-</strong></span>
                </div>
              </div>
            </div>
            <div style="margin-top: auto;">
              <div class="separator-line" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-top: 8px;">
                <div>Status: Em produção</div>
                <div>1ª via Oficina</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px;">
                <div>Data de Impressão: ${new Date().toLocaleDateString('pt-BR')}</div>
                <div>Sistema de Controle de Produção</div>
              </div>
            </div>
          </div>

          <!-- Linha divisória -->
          <div class="separator-line" style="width: 100%;"></div>

          <!-- Segunda Via - Produção -->
          <div style="padding: 24px; min-height: 48vh;">
            <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
              <div class="batch-header" style="color: white; padding: 16px; font-weight: bold; font-size: 24px; min-width: 120px; text-align: center;">
                LOTE ${batch.code}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                  Oficina: ${workshopName}
                </div>
                <div style="font-size: 16px;">
                  Data Corte: ${new Date(batch.cutDate).toLocaleDateString('pt-BR')} - Entrega Prevista: ${batch.expectedReturnDate ? new Date(batch.expectedReturnDate).toLocaleDateString('pt-BR') : 'Não definida'}
                </div>
              </div>
            </div>
            <div style="margin-bottom: 32px;">
              <div class="separator-line" style="font-size: 18px; font-weight: bold; margin-bottom: 12px; padding-bottom: 4px;">Produtos</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
                  <span style="flex: 1;">Produto: Em desenvolvimento</span>
                  <span style="width: 80px; text-align: center;">Quant: <strong>-</strong></span>
                  <span style="width: 80px; text-align: center;">Cor: <strong>-</strong></span>
                  <span style="width: 64px; text-align: center;">Tam: <strong>-</strong></span>
                </div>
              </div>
            </div>
            <div style="margin-top: auto;">
              <div class="separator-line" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-top: 8px;">
                <div>Status: Em produção</div>
                <div>2ª via Produção</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px;">
                <div>Data de Impressão: ${new Date().toLocaleDateString('pt-BR')}</div>
                <div>Sistema de Controle de Produção</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };
  const { toast } = useToast();
  const [productSearches, setProductSearches] = useState<{ [key: number]: string }>({});
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<any>(null);

  // Get existing batches for conflict detection
  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ["/api/batches"],
  });

  // Function to detect conflicts with existing batches
  const checkForConflicts = (cutDate: string, workshopId: string) => {
    if (!workshopId || !cutDate) return null;

    const newCutDate = new Date(cutDate);
    const workshopBatches = batches.filter(batch => 
      batch.workshopId === parseInt(workshopId) && 
      batch.status !== 'returned'
    );

    for (const batch of workshopBatches) {
      if (batch.expectedReturnDate) {
        const expectedReturn = new Date(batch.expectedReturnDate);
        if (expectedReturn > newCutDate) {
          return {
            conflictingBatch: batch,
            message: `Conflito detectado: Lote ${batch.code} tem retorno previsto para ${expectedReturn.toLocaleDateString('pt-BR')} (após a data de corte deste novo lote)`
          };
        }
      }
    }
    return null;
  };
  
  // Filter active products only (default to active if isActive field doesn't exist)
  const activeProducts = products.filter(product => product.isActive === 1 || product.isActive === undefined);
  
  const getFilteredProducts = (searchTerm: string) => {
    if (searchTerm.length < 3) return [];
    return activeProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      status: "waiting",
      cutDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: "",
      observations: "",
      workshopId: "",
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
        cutDate: data.cutDate,
        status: data.status,
        workshopId: data.workshopId ? parseInt(data.workshopId) : null,
        expectedReturnDate: data.expectedReturnDate || null,
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
    onSuccess: async (newBatch) => {
      toast({ title: "Lote criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      
      // Auto-print after creation with proper product data
      setTimeout(async () => {
        try {
          // Fetch batch products for printing
          const batchProductsRes = await fetch(`/api/batch-products/${newBatch.id}`);
          const batchProducts = batchProductsRes.ok ? await batchProductsRes.json() : [];
          
          console.log('Batch products for print:', batchProducts);
          
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;
          
          // Get workshop info for print
          const workshopInfo = workshops.find(w => w.id === newBatch.workshopId);
          const workshopName = workshopInfo?.name || 'Produção Interna';
          
          // Generate product rows for print
          const generateProductRows = (batchProducts: any[]) => {
            return batchProducts.map((bp: any) => {
              const product = products.find(p => p.id === bp.productId);
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px; margin-bottom: 8px;">
                  <span style="flex: 1;">${product?.name || 'Produto'}</span>
                  <span style="width: 80px; text-align: center;">Quant: <strong>${bp.quantity}</strong></span>
                  <span style="width: 80px; text-align: center;">Cor: <strong>${bp.selectedColor || 'N/A'}</strong></span>
                  <span style="width: 64px; text-align: center;">Tam: <strong>${bp.selectedSize || 'N/A'}</strong></span>
                </div>
              `;
            }).join('');
          };
          
          const printContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Lote ${newBatch.code} - Impressão</title>
                <style>
                  body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: Arial, sans-serif; 
                    background: white;
                  }
                  .batch-header {
                    background-color: black !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  .separator-line {
                    border-bottom: 1px dotted black !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  .page-break {
                    border-bottom: 2px dotted black !important;
                    margin: 20px 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  @media print {
                    body { margin: 0; padding: 0; }
                    * { box-sizing: border-box; }
                  }
                </style>
              </head>
              <body>
                <!-- Primeira Via - Oficina -->
                <div style="padding: 24px; min-height: 48vh;">
                  <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
                    <div class="batch-header" style="color: white; padding: 16px; font-weight: bold; font-size: 24px; min-width: 120px; text-align: center;">
                      LOTE ${newBatch.code}
                    </div>
                    <div style="flex: 1;">
                      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                        Oficina: ${workshopName}
                      </div>
                      <div style="font-size: 16px;">
                        Data Corte: ${new Date(newBatch.cutDate).toLocaleDateString('pt-BR')} - Entrega Prevista: ${newBatch.expectedReturnDate ? new Date(newBatch.expectedReturnDate).toLocaleDateString('pt-BR') : 'Não definida'}
                      </div>
                    </div>
                  </div>
                  
                  <div style="margin-bottom: 32px;">
                    <div class="separator-line" style="font-size: 18px; font-weight: bold; margin-bottom: 12px; padding-bottom: 4px;">Produtos</div>
                    <div style="display: flex; flex-direction: column;">
                      ${generateProductRows(batchProducts)}
                    </div>
                  </div>
                  
                  <div style="margin-top: auto;">
                    <div class="separator-line" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-top: 8px;">
                      <div>Status: Em produção</div>
                      <div>1ª via Oficina</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px;">
                      <div>Data de Impressão: ${new Date().toLocaleDateString('pt-BR')}</div>
                      <div>Sistema de Controle de Produção</div>
                    </div>
                  </div>
                </div>

                <!-- Linha divisória -->
                <div class="page-break"></div>

                <!-- Segunda Via - Produção -->
                <div style="padding: 24px; min-height: 48vh;">
                  <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
                    <div class="batch-header" style="color: white; padding: 16px; font-weight: bold; font-size: 24px; min-width: 120px; text-align: center;">
                      LOTE ${newBatch.code}
                    </div>
                    <div style="flex: 1;">
                      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                        Oficina: ${workshopName}
                      </div>
                      <div style="font-size: 16px;">
                        Data Corte: ${new Date(newBatch.cutDate).toLocaleDateString('pt-BR')} - Entrega Prevista: ${newBatch.expectedReturnDate ? new Date(newBatch.expectedReturnDate).toLocaleDateString('pt-BR') : 'Não definida'}
                      </div>
                    </div>
                  </div>
                  
                  <div style="margin-bottom: 32px;">
                    <div class="separator-line" style="font-size: 18px; font-weight: bold; margin-bottom: 12px; padding-bottom: 4px;">Produtos</div>
                    <div style="display: flex; flex-direction: column;">
                      ${generateProductRows(batchProducts)}
                    </div>
                  </div>
                  
                  <div style="margin-top: auto;">
                    <div class="separator-line" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-top: 8px;">
                      <div>Status: Em produção</div>
                      <div>2ª via Produção</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px;">
                      <div>Data de Impressão: ${new Date().toLocaleDateString('pt-BR')}</div>
                      <div>Sistema de Controle de Produção</div>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;
          
          printWindow.document.write(printContent);
          printWindow.document.close();
          
          // Wait for content to load then print
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          };
        } catch (error) {
          console.error('Error in auto-print:', error);
          toast({ title: "Erro na impressão automática", variant: "destructive" });
        }
      }, 1000);
      
      onClose();
    },
    onError: () => {
      toast({ title: "Erro ao criar lote", variant: "destructive" });
    },
  });

  const onSubmit = (data: BatchFormData) => {
    // Check for conflicts before creating
    const conflict = checkForConflicts(data.cutDate, data.workshopId || "");
    if (conflict) {
      setConflictWarning(conflict.message);
      return;
    }
    
    setConflictWarning(null);
    createBatchMutation.mutate(data);
  };

  const handleConflictResolution = async (conflictingBatch: Batch, newCutDate: string) => {
    try {
      // Update the conflicting batch's expected return date to one day before new cut date
      const newReturnDate = new Date(newCutDate);
      newReturnDate.setDate(newReturnDate.getDate() - 1);
      
      await apiRequest('PATCH', `/api/batches/${conflictingBatch.id}`, {
        expectedReturnDate: newReturnDate,
        status: 'returned'
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      toast({ title: `Lote ${conflictingBatch.code} marcado como retornado para resolver conflito` });
      
      setConflictWarning(null);
      
      // Now create the new batch
      const formData = form.getValues();
      createBatchMutation.mutate(formData);
    } catch (error) {
      toast({ title: "Erro ao resolver conflito", variant: "destructive" });
    }
  };

  const printBatch = () => {
    window.print();
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

        {conflictWarning && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {conflictWarning}
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const conflict = checkForConflicts(form.getValues().cutDate, form.getValues().workshopId || "");
                    if (conflict) {
                      handleConflictResolution(conflict.conflictingBatch, form.getValues().cutDate);
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Marcar lote anterior como retornado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConflictWarning(null)}
                >
                  Cancelar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

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
                      <div className="relative">
                        <Label>Produto * (digite pelo menos 3 letras)</Label>
                        <Input
                          placeholder="Digite o nome ou código do produto..."
                          value={productSearches[index] || ""}
                          onChange={(e) => {
                            const searchTerm = e.target.value;
                            setProductSearches(prev => ({ ...prev, [index]: searchTerm }));
                            // Clear selection when typing
                            if (searchTerm.length < 3) {
                              form.setValue(`products.${index}.productId`, "");
                            }
                          }}
                        />
                        {productSearches[index] && productSearches[index].length >= 3 && !productSearches[index].includes(' - ') && getFilteredProducts(productSearches[index]).length > 0 && (
                          <div 
                            className="absolute z-[9999] w-full bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto"
                            style={{ top: '100%', left: 0, marginTop: '4px' }}
                          >
                            {getFilteredProducts(productSearches[index]).map((product) => (
                              <div
                                key={product.id}
                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  form.setValue(`products.${index}.productId`, product.id.toString());
                                  setProductSearches(prev => ({ ...prev, [index]: `${product.name} - ${product.code}` }));
                                  // Reset color and size when product changes
                                  form.setValue(`products.${index}.selectedColor`, "");
                                  form.setValue(`products.${index}.selectedSize`, "");
                                }}
                              >
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">Código: {product.code}</div>
                              </div>
                            ))}
                          </div>
                        )}
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
      
      {/* Print Dialog */}
      {showPrintDialog && createdBatch && (
        <Dialog open={showPrintDialog} onOpenChange={() => {
          setShowPrintDialog(false);
          onClose();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Lote Criado com Sucesso!</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>O lote {createdBatch.code} foi criado. Deseja imprimir a ficha de produção?</p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPrintDialog(false);
                    onClose();
                  }}
                >
                  Não imprimir
                </Button>
                <Button
                  onClick={() => {
                    openPrintWindow(createdBatch);
                    setShowPrintDialog(false);
                    onClose();
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Hidden Print Layout */}
      {createdBatch && (
        <BatchPrintLayout 
          batch={createdBatch} 
          products={products} 
          workshops={workshops} 
        />
      )}
    </Dialog>
  );
}