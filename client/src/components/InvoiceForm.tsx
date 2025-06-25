import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
}

/**
 * Invoice Generation Form Component
 * 
 * Allows creation of invoices for workshop payments with:
 * - Batch selection for inclusion in invoice
 * - Invoice details (number, due date, notes)
 * - Automatic calculation of total amount
 * - Payment tracking integration
 */
export default function InvoiceForm({ workshop, unpaidBatches, onClose }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);

  // Form setup with validation
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: `INV-${workshop.workshopName.substring(0, 3).toUpperCase()}-${Date.now()}`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: '',
      selectedBatches: []
    }
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Calculate total amount from selected batches
      const totalAmount = selectedBatches.reduce((sum, batchId) => {
        const batch = unpaidBatches.find(b => b.id === batchId);
        // Note: In a real implementation, you'd calculate this from batch products
        // For now, using a simplified calculation
        return sum + 100; // Placeholder value
      }, 0);

      const invoiceData = {
        workshopId: workshop.workshopId,
        invoiceNumber: data.invoiceNumber,
        dueDate: new Date(data.dueDate),
        totalAmount: totalAmount.toString(),
        notes: data.notes,
        batchIds: selectedBatches
      };

      return apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
      });
    },
    onSuccess: () => {
      toast({ title: "Fatura gerada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/financial'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
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

  // Handle batch selection
  const handleBatchSelection = (batchId: number, checked: boolean) => {
    if (checked) {
      setSelectedBatches(prev => [...prev, batchId]);
    } else {
      setSelectedBatches(prev => prev.filter(id => id !== batchId));
    }
  };

  // Select all batches
  const handleSelectAll = () => {
    if (selectedBatches.length === unpaidBatches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(unpaidBatches.map(batch => batch.id));
    }
  };

  // Form submission
  const onSubmit = (data: InvoiceFormData) => {
    createInvoiceMutation.mutate({
      ...data,
      selectedBatches
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Invoice Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detalhes da Fatura</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="invoiceNumber">Número da Fatura</Label>
            <Input
              id="invoiceNumber"
              {...form.register('invoiceNumber')}
              placeholder="INV-001"
            />
            {form.formState.errors.invoiceNumber && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.invoiceNumber.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <Input
              id="dueDate"
              type="date"
              {...form.register('dueDate')}
            />
            {form.formState.errors.dueDate && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.dueDate.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            {...form.register('notes')}
            placeholder="Observações adicionais sobre a fatura..."
            rows={3}
          />
        </div>
      </div>

      {/* Batch Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Selecionar Lotes</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedBatches.length === unpaidBatches.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
          {unpaidBatches.map((batch) => (
            <div key={batch.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
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
                  R$ 100,00 {/* Placeholder - would calculate from batch products */}
                </span>
              </label>
            </div>
          ))}
        </div>

        {form.formState.errors.selectedBatches && (
          <p className="text-sm text-red-600">
            {form.formState.errors.selectedBatches.message}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total da Fatura:</span>
          <span className="text-xl font-bold text-green-600">
            R$ {(selectedBatches.length * 100).toFixed(2)} {/* Placeholder calculation */}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {selectedBatches.length} lote{selectedBatches.length !== 1 ? 's' : ''} selecionado{selectedBatches.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
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
  );
}