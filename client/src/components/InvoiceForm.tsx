import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Batch } from '@shared/schema';

// Form validation schema
const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Número da fatura é obrigatório'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  notes: z.string().optional(),
  selectedBatches: z.array(z.number()).min(1, 'Selecione pelo menos um lote')
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  workshop: any;
  unpaidBatches: Batch[];
  onClose: () => void;
  showPrintPage: (invoice: any) => void;
}

/**
 * Simple Invoice Generation Form Component
 * 
 * Creates invoices for workshop payments with basic batch selection
 */
export default function InvoiceForm({ workshop, unpaidBatches, onClose, showPrintPage }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);

  // Form setup with validation - remove selectedBatches from schema validation
  const form = useForm<Omit<InvoiceFormData, 'selectedBatches'>>({
    resolver: zodResolver(invoiceFormSchema.omit({ selectedBatches: true })),
    defaultValues: {
      invoiceNumber: `INV-${workshop.workshopName.substring(0, 3).toUpperCase()}-${Date.now()}`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    },
    mode: 'onChange'
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const invoiceData = {
        workshopId: workshop.workshopId || workshop.id,
        invoiceNumber: data.invoiceNumber,
        dueDate: data.dueDate,
        totalAmount: "0.00", // Will be calculated on backend
        notes: data.notes || '',
        status: 'pending',
        batchIds: data.selectedBatches
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      console.log('Invoice mutation successful:', data);
      toast({ title: "Fatura gerada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/financial'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // Show print page
      if (showPrintPage) {
        showPrintPage(data);
      }
      onClose();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao gerar fatura", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: Omit<InvoiceFormData, 'selectedBatches'>) => {
    if (selectedBatches.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um lote para gerar a fatura",
        variant: "destructive"
      });
      return;
    }
    
    // Submit with selected batches
    const submissionData = { ...data, selectedBatches };
    createInvoiceMutation.mutate(submissionData);
  };

  // Handle batch selection
  const handleBatchSelection = (batchId: number, checked: boolean) => {
    setSelectedBatches(prev => {
      const newSelection = checked 
        ? [...prev, batchId]
        : prev.filter(id => id !== batchId);
      
      return newSelection;
    });
  };

  // Handle select all functionality
  const handleSelectAll = () => {
    if (selectedBatches.length === unpaidBatches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(unpaidBatches.map(batch => batch.id));
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalhes da Fatura</h3>
            
            {/* Invoice Number and Due Date - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Fatura</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="INV-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes - Reduced Size */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Observações..." 
                      rows={2} 
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Batch Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Selecionar Lotes ({unpaidBatches.length} disponíveis)</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedBatches.length === unpaidBatches.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
              {unpaidBatches.map((batch) => (
                <div key={batch.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded transition-colors">
                  <Checkbox
                    id={`batch-${batch.id}`}
                    checked={selectedBatches.includes(batch.id)}
                    onCheckedChange={(checked) => handleBatchSelection(batch.id, !!checked)}
                  />
                  <label 
                    htmlFor={`batch-${batch.id}`}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">Lote {batch.code}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {new Date(batch.cutDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      Valor será calculado
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {selectedBatches.length === 0 && (
              <p className="text-sm text-red-600">
                Selecione pelo menos um lote para gerar a fatura
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total da Fatura:</span>
              <span className="text-xl font-bold text-green-600">
                Será calculado automaticamente
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {selectedBatches.length} lote(s) selecionado(s)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createInvoiceMutation.isPending || selectedBatches.length === 0}
            >
              {createInvoiceMutation.isPending ? 'Gerando...' : 'Gerar Fatura'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}