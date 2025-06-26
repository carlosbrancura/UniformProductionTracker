import { useState, useEffect } from 'react';
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
  const [batchValues, setBatchValues] = useState<Record<number, number>>({});

  // Fetch batch product values for accurate calculations
  useEffect(() => {
    const fetchBatchValues = async () => {
      try {
        const batchIds = unpaidBatches.map(batch => batch.id);
        if (batchIds.length === 0) return;

        const response = await fetch('/api/batch-products/multiple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchIds })
        });

        if (response.ok) {
          const batchProductsData = await response.json();
          
          // Fetch products data
          const productsResponse = await fetch('/api/products');
          const products = await response.json();

          // Calculate values for each batch
          const values: Record<number, number> = {};
          unpaidBatches.forEach(batch => {
            const batchProducts = batchProductsData.filter((bp: any) => bp.batchId === batch.id);
            const value = batchProducts.reduce((total: number, bp: any) => {
              const product = products.find((p: any) => p.id === bp.productId);
              const productValue = parseFloat(product?.productionValue?.toString() || '0');
              return total + (bp.quantity * productValue);
            }, 0);
            values[batch.id] = value;
          });
          
          setBatchValues(values);
        }
      } catch (error) {
        console.error('Error fetching batch values:', error);
      }
    };

    fetchBatchValues();
  }, [unpaidBatches]);

  // Form setup with validation
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: `INV-${workshop.workshopName.substring(0, 3).toUpperCase()}-${Date.now()}`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: '',
      selectedBatches: []
    },
    mode: 'onChange' // Enable real-time validation
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Calculate total amount from selected batches using real values
      const totalAmount = selectedBatches.reduce((sum, batchId) => {
        return sum + (batchValues[batchId] || 0);
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
    const newSelection = checked 
      ? [...selectedBatches, batchId]
      : selectedBatches.filter(id => id !== batchId);
    
    setSelectedBatches(newSelection);
    
    // Update form field to trigger validation
    form.setValue('selectedBatches', newSelection);
    
    // Clear validation errors if batches are selected
    if (newSelection.length > 0) {
      form.clearErrors('selectedBatches');
    }
  };

  // Select all batches
  const handleSelectAll = () => {
    const newSelection = selectedBatches.length === unpaidBatches.length 
      ? [] 
      : unpaidBatches.map((batch: any) => batch.id);
    
    setSelectedBatches(newSelection);
    form.setValue('selectedBatches', newSelection);
  };

  // Form submission
  const onSubmit = (data: InvoiceFormData) => {
    // Ensure we have selected batches
    if (selectedBatches.length === 0) {
      form.setError('selectedBatches', { 
        type: 'manual', 
        message: 'Selecione pelo menos um lote' 
      });
      return;
    }
    
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
                  R$ {(batchValues[batch.id] || 0).toFixed(2)}
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
            R$ {selectedBatches.reduce((sum, batchId) => sum + (batchValues[batchId] || 0), 0).toFixed(2)}
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
        {selectedBatches.length === 0 && (
          <p className="text-sm text-red-600">Selecione pelo menos um lote</p>
        )}
      </div>
    </form>
  );
}