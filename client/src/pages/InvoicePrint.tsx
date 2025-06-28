import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';

export default function InvoicePrint() {
  // Extract invoice ID from URL
  const params = useParams();
  const invoiceId = params.id;

  // Fetch invoice data
  const { data: invoice, isLoading: invoiceLoading, error: invoiceError } = useQuery({
    queryKey: [`/api/invoices/${invoiceId}`],
    enabled: !!invoiceId
  });

  // Fetch invoice batches
  const { data: invoiceBatches, isLoading: batchesLoading } = useQuery({
    queryKey: [`/api/invoices/${invoiceId}/batches`],
    enabled: !!invoiceId
  });

  // Fetch workshop data
  const { data: workshop, isLoading: workshopLoading } = useQuery({
    queryKey: [`/api/workshops/${invoice?.workshop_id || invoice?.workshopId}`],
    enabled: !!(invoice?.workshop_id || invoice?.workshopId)
  });

  // Fetch all products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products']
  });

  // Fetch batch products for the invoice batches
  const { data: batchProducts, isLoading: batchProductsLoading } = useQuery({
    queryKey: [`/api/batch-products/multiple`],
    queryFn: async () => {
      if (!invoiceBatches || invoiceBatches.length === 0) return [];
      
      const batchIds = invoiceBatches.map((ib: any) => ib.batchId);
      const response = await fetch('/api/batch-products/multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch products');
      }
      
      return response.json();
    },
    enabled: !!(invoiceBatches && invoiceBatches.length > 0)
  });

  // Auto-print when data is loaded
  useEffect(() => {
    if (invoice && invoiceBatches && workshop && products && 
        !invoiceLoading && !batchesLoading && !workshopLoading && !productsLoading && !batchProductsLoading) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [invoice, invoiceBatches, workshop, products, batchProducts, invoiceLoading, batchesLoading, workshopLoading, productsLoading, batchProductsLoading]);

  // Debug logging
  console.log('InvoicePrint Debug:', {
    invoiceId,
    invoice,
    invoiceBatches,
    workshop,
    products,
    batchProducts,
    loading: { invoiceLoading, batchesLoading, workshopLoading, productsLoading, batchProductsLoading },
    error: invoiceError
  });

  // Loading state
  if (invoiceLoading || batchesLoading || workshopLoading || productsLoading || batchProductsLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">
            Carregando fatura...
          </h1>
          <div className="text-sm text-gray-500">
            <p>ID da fatura: {invoiceId}</p>
            <p>Invoice: {invoiceLoading ? 'Carregando...' : 'OK'}</p>
            <p>Lotes: {batchesLoading ? 'Carregando...' : 'OK'}</p>
            <p>Oficina: {workshopLoading ? 'Carregando...' : 'OK'}</p>
            <p>Produtos: {productsLoading ? 'Carregando...' : 'OK'}</p>
            <p>Produtos dos Lotes: {batchProductsLoading ? 'Carregando...' : 'OK'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (invoiceError) {
    console.error('Invoice error details:', invoiceError);
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erro ao carregar fatura
          </h1>
          <p className="text-gray-600 mb-4">
            ID da fatura: {invoiceId}
          </p>
          <p className="text-gray-600">
            {invoiceError instanceof Error ? invoiceError.message : 'Erro desconhecido'}
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Status da requisição: {(invoiceError as any)?.status || 'Desconhecido'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Data validation
  if (!invoice || !workshop) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Dados incompletos
          </h1>
          <p className="text-gray-600">
            Fatura: {invoice ? 'OK' : 'Não encontrada'}<br/>
            Oficina: {workshop ? 'OK' : 'Não encontrada'}<br/>
            Lotes: {invoiceBatches ? invoiceBatches.length : 0} encontrados
          </p>
        </div>
      </div>
    );
  }

  // Process batch data with products
  const processedBatches = (invoiceBatches || []).map((invoiceBatch: any) => {
    console.log('Processing batch:', invoiceBatch);
    
    // Get batch details
    const batch = invoiceBatch.batch;
    if (!batch) {
      console.warn('No batch data found for:', invoiceBatch);
      return null;
    }

    // Get batch products for this specific batch
    const batchProductsForBatch = (batchProducts || []).filter((bp: any) => bp.batchId === batch.id);
    
    // Handle both legacy and new batch structures
    let batchProductsList = [];
    
    if (batchProductsForBatch.length > 0) {
      // New structure - use fetched batch products
      batchProductsList = batchProductsForBatch;
    } else if (batch.productId && batch.quantity) {
      // Legacy structure - batch has direct product info
      batchProductsList = [{
        productId: batch.productId,
        quantity: batch.quantity,
        selectedColor: 'N/A',
        selectedSize: 'N/A'
      }];
    } else {
      // No product data available
      batchProductsList = [];
    }

    const productsWithTotals = batchProductsList
      .filter(bp => bp.productId)
      .map((bp: any) => {
        const product = (products as any[])?.find((p: any) => p.id === bp.productId);
        if (!product) {
          console.warn('Product not found for ID:', bp.productId);
          return null;
        }

        const productionValue = parseFloat(product.productionValue?.toString() || '0');
        const total = bp.quantity * productionValue;

        return {
          productName: product.name || 'Produto não identificado',
          selectedColor: bp.selectedColor || 'N/A',
          selectedSize: bp.selectedSize || 'N/A',
          quantity: bp.quantity,
          productionValue,
          total
        };
      })
      .filter(Boolean);

    const batchTotal = productsWithTotals.reduce((sum: number, p: any) => sum + p.total, 0);

    return {
      id: batch.id,
      code: batch.code || 'N/A',
      cutDate: batch.cutDate || '',
      products: productsWithTotals,
      batchTotal
    };
  }).filter(Boolean);

  // Calculate total
  const grandTotal = processedBatches.reduce((sum: number, batch: any) => sum + batch.batchTotal, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">FATURA</h1>
        <div className="text-lg">
          <p className="font-semibold text-blue-600">{workshop.name}</p>
          <p className="text-gray-600">Número: {invoice.invoice_number || invoice.invoiceNumber}</p>
          <p className="text-gray-600">Data: {formatDate(invoice.issue_date || invoice.issueDate)}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p><strong>Oficina:</strong> {workshop.name}</p>
            <p><strong>Responsável:</strong> {workshop.manager || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Data de Vencimento:</strong> {formatDate(invoice.due_date || invoice.dueDate)}</p>
            <p><strong>Status:</strong> {invoice.status === 'pending' ? 'Pendente' : 'Pago'}</p>
          </div>
        </div>
        
        {invoice.notes && (
          <div className="mt-4">
            <p><strong>Observações:</strong> {invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Batches Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Lotes Inclusos</h2>
        
        {processedBatches.map((batch: any, index: number) => (
          <div key={batch.id} className="mb-6 border border-gray-300 rounded">
            <div className="bg-gray-100 p-3">
              <h3 className="font-semibold">
                Lote {batch.code} - Data de Corte: {formatDate(batch.cutDate)}
              </h3>
            </div>
            
            <div className="p-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Produto</th>
                    <th className="text-left p-2">Cor</th>
                    <th className="text-left p-2">Tamanho</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Valor Unit.</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.products.map((product: any, pIndex: number) => (
                    <tr key={pIndex} className="border-b">
                      <td className="p-2">{product.productName}</td>
                      <td className="p-2">{product.selectedColor}</td>
                      <td className="p-2">{product.selectedSize}</td>
                      <td className="text-right p-2">{product.quantity}</td>
                      <td className="text-right p-2">{formatCurrency(product.productionValue)}</td>
                      <td className="text-right p-2">{formatCurrency(product.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-gray-50">
                    <td colSpan={5} className="text-right p-2">Total do Lote:</td>
                    <td className="text-right p-2">{formatCurrency(batch.batchTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t-2 border-gray-800 pt-4">
        <div className="text-right">
          <p className="text-2xl font-bold">
            Total Geral: {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-600">
        <p>Fatura gerada em {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}