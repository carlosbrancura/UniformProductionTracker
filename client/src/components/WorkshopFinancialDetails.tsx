import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, CreditCard, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import type { Batch, Product, BatchProduct } from '@shared/schema';
import InvoiceForm from './InvoiceForm';
import InvoiceHistory from './InvoiceHistory';

interface WorkshopFinancialDetailsProps {
  workshop: any; // Workshop summary data
  startDate: Date;
  endDate: Date;
  onBack: () => void;
}

/**
 * Workshop Financial Details Component
 * 
 * Displays detailed financial information for a specific workshop including:
 * - List of unpaid batches with product details
 * - Batch values and calculations
 * - Invoice generation and payment management
 * - Invoice history and tracking
 */
export default function WorkshopFinancialDetails({ 
  workshop, 
  startDate, 
  endDate, 
  onBack 
}: WorkshopFinancialDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for dialog management
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);

  // Fetch unpaid batches for this workshop
  const { data: unpaidBatches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['/api/financial/unpaid-batches', workshop.workshopId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/financial/unpaid-batches/${workshop.workshopId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch unpaid batches');
      return response.json();
    }
  });

  // Fetch all products for reference
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch batch products for detailed calculations
  const { data: batchProductsData = [] } = useQuery({
    queryKey: ['/api/batch-products/workshop', workshop.workshopId],
    queryFn: async () => {
      const batchIds = unpaidBatches.map((batch: Batch) => batch.id);
      if (batchIds.length === 0) return [];
      
      const response = await fetch('/api/batch-products/multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds })
      });
      if (!response.ok) throw new Error('Failed to fetch batch products');
      return response.json();
    },
    enabled: unpaidBatches.length > 0
  });

  // Mark batch as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (batchId: number) => {
      return apiRequest('/api/batches/' + batchId, {
        method: 'PATCH',
        body: JSON.stringify({ paid: true })
      });
    },
    onSuccess: () => {
      toast({ title: "Lote marcado como pago com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/financial'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao marcar lote como pago", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Calculate total value for a batch
  const calculateBatchValue = (batch: Batch) => {
    const batchProducts = batchProductsData.filter((bp: BatchProduct) => bp.batchId === batch.id);
    return batchProducts.reduce((total: number, bp: BatchProduct) => {
      const product = products.find((p: Product) => p.id === bp.productId);
      return total + (bp.quantity * (product?.productionValue || 0));
    }, 0);
  };

  // Get product details for a batch
  const getBatchProductDetails = (batch: Batch) => {
    return batchProductsData.filter((bp: BatchProduct) => bp.batchId === batch.id);
  };

  // Handle print report
  const handlePrintReport = () => {
    window.print();
  };

  // Handle mark batch as paid
  const handleMarkAsPaid = (batchId: number) => {
    markAsPaidMutation.mutate(batchId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Resumo
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{workshop.workshopName}</h1>
          <p className="text-gray-600">
            Detalhes financeiros - {formatDate(startDate)} a {formatDate(endDate)}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={handlePrintReport} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Relatório
        </Button>
        
        <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
          <DialogTrigger asChild>
            <Button>
              <CreditCard className="h-4 w-4 mr-2" />
              Gerar Fatura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerar Fatura - {workshop.workshopName}</DialogTitle>
            </DialogHeader>
            <InvoiceForm 
              workshop={workshop}
              unpaidBatches={unpaidBatches}
              onClose={() => setShowInvoiceForm(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showInvoiceHistory} onOpenChange={setShowInvoiceHistory}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Histórico de Faturas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Histórico de Faturas - {workshop.workshopName}</DialogTitle>
            </DialogHeader>
            <InvoiceHistory workshopId={workshop.workshopId} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Financial Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total de Lotes</p>
              <p className="text-2xl font-bold">{unpaidBatches.length}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Valor Total em Aberto</p>
              <p className="text-2xl font-bold text-red-600">
                R$ {parseFloat(workshop.totalUnpaidValue || 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Período</p>
              <p className="text-lg font-semibold">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Batches List */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes Pendentes de Pagamento</CardTitle>
          <p className="text-sm text-gray-600">
            Lista detalhada dos lotes enviados para esta oficina com valores em aberto
          </p>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando lotes...</p>
            </div>
          ) : unpaidBatches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum lote pendente de pagamento no período</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unpaidBatches.map((batch: Batch) => {
                const batchValue = calculateBatchValue(batch);
                const batchProducts = getBatchProductDetails(batch);
                
                return (
                  <div key={batch.id} className="border rounded-lg p-4 space-y-3">
                    {/* Batch header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">Lote {batch.code}</h3>
                        <Badge variant={batch.status === 'returned' ? 'default' : 'secondary'}>
                          {batch.status === 'returned' ? 'Retornado' : 'Em Produção'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            R$ {batchValue.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">Valor do lote</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkAsPaid(batch.id)}
                          disabled={markAsPaidMutation.isPending}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Marcar como Pago
                        </Button>
                      </div>
                    </div>

                    {/* Batch dates */}
                    <div className="flex gap-6 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Data de Corte:</span> {formatDate(batch.cutDate)}
                      </div>
                      <div>
                        <span className="font-medium">Retorno Esperado:</span> {formatDate(batch.expectedReturnDate)}
                      </div>
                      {batch.actualReturnDate && (
                        <div>
                          <span className="font-medium">Retorno Real:</span> {formatDate(batch.actualReturnDate)}
                        </div>
                      )}
                    </div>

                    {/* Product details */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Produtos do Lote
                      </h4>
                      <div className="grid gap-2">
                        {batchProducts.map((bp: BatchProduct) => {
                          const product = products.find((p: Product) => p.id === bp.productId);
                          const itemValue = bp.quantity * (product?.productionValue || 0);
                          
                          return (
                            <div key={bp.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div className="flex-1">
                                <p className="font-medium">{product?.name || 'Produto não encontrado'}</p>
                                <div className="flex gap-4 text-sm text-gray-600">
                                  <span>Cor: {bp.selectedColor}</span>
                                  <span>Tamanho: {bp.selectedSize}</span>
                                  <span>Quantidade: {bp.quantity}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">R$ {itemValue.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">
                                  R$ {product?.productionValue || 0} × {bp.quantity}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}