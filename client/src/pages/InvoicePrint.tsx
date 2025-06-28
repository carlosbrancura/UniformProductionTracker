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
    processedBatches: processedBatches,
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
    let batchProductsList: any[] = [];
    
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
    <div className="min-h-screen bg-white p-8 print:p-4 print:text-sm">
      {/* Company Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">FATURA DE SERVIÇOS</h1>
        <div className="text-lg text-gray-700">
          <p className="font-bold text-2xl text-blue-700 mb-2">{(workshop as any)?.name || 'Workshop não encontrado'}</p>
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div className="text-left">
              <p><strong>Número da Fatura:</strong> {(invoice as any)?.invoiceNumber || (invoice as any)?.invoice_number || 'N/A'}</p>
              <p><strong>Data de Emissão:</strong> {formatDate((invoice as any)?.issueDate || (invoice as any)?.issue_date || new Date().toISOString())}</p>
            </div>
            <div className="text-left">
              <p><strong>Data de Vencimento:</strong> {formatDate((invoice as any)?.dueDate || (invoice as any)?.due_date || new Date().toISOString())}</p>
              <p><strong>Status:</strong> <span className={`font-semibold ${(invoice as any)?.status === 'pending' ? 'text-orange-600' : 'text-green-600'}`}>
                {(invoice as any)?.status === 'pending' ? 'Aberto' : 'Faturado'}
              </span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Workshop Information */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Informações da Oficina</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p><strong>Nome da Oficina:</strong> {(workshop as any)?.name || 'N/A'}</p>
            <p><strong>Responsável:</strong> {(workshop as any)?.manager || 'N/A'}</p>
            <p><strong>Contato:</strong> {(workshop as any)?.contact || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Endereço:</strong> {(workshop as any)?.address || 'N/A'}</p>
            <p><strong>Telefone:</strong> {(workshop as any)?.phone || 'N/A'}</p>
            <p><strong>Email:</strong> {(workshop as any)?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Observações */}
      {(invoice as any)?.notes && (
        <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Observações:</h3>
          <p className="text-gray-700">{(invoice as any).notes}</p>
        </div>
      )}

      {/* Detailed Batches */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b border-gray-300 pb-2">Detalhamento dos Serviços</h2>
        
        {processedBatches.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg">Nenhum lote encontrado para esta fatura</p>
          </div>
        ) : (
          processedBatches.map((batch: any, index: number) => (
            <div key={batch.id || index} className="mb-8 border border-gray-300 rounded-lg shadow-sm">
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">
                  Lote {batch.code || 'N/A'} - Data de Corte: {formatDate(batch.cutDate || new Date().toISOString())}
                </h3>
                {batch.expectedReturnDate && (
                  <p className="text-blue-100 mt-1">
                    Data Prevista de Retorno: {formatDate(batch.expectedReturnDate)}
                  </p>
                )}
              </div>
              
              <div className="p-4">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3 border border-gray-300 font-semibold">Produto</th>
                      <th className="text-left p-3 border border-gray-300 font-semibold">Descrição</th>
                      <th className="text-center p-3 border border-gray-300 font-semibold">Cor</th>
                      <th className="text-center p-3 border border-gray-300 font-semibold">Tamanho</th>
                      <th className="text-right p-3 border border-gray-300 font-semibold">Qtd</th>
                      <th className="text-right p-3 border border-gray-300 font-semibold">Valor Unit.</th>
                      <th className="text-right p-3 border border-gray-300 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.products && batch.products.length > 0 ? (
                      batch.products.map((product: any, pIndex: number) => (
                        <tr key={pIndex} className="hover:bg-gray-50">
                          <td className="p-3 border border-gray-300 font-medium">{product.productName || 'Produto não encontrado'}</td>
                          <td className="p-3 border border-gray-300 text-sm text-gray-600">{product.description || 'N/A'}</td>
                          <td className="text-center p-3 border border-gray-300">{product.selectedColor || 'N/A'}</td>
                          <td className="text-center p-3 border border-gray-300">{product.selectedSize || 'N/A'}</td>
                          <td className="text-right p-3 border border-gray-300 font-medium">{product.quantity || 0}</td>
                          <td className="text-right p-3 border border-gray-300">{formatCurrency(product.productionValue || 0)}</td>
                          <td className="text-right p-3 border border-gray-300 font-semibold">{formatCurrency(product.total || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center p-6 text-gray-500 italic">
                          Nenhum produto encontrado para este lote
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50">
                      <td colSpan={6} className="text-right p-3 border border-gray-300 font-bold text-lg">Subtotal do Lote:</td>
                      <td className="text-right p-3 border border-gray-300 font-bold text-lg text-blue-700">
                        {formatCurrency(batch.batchTotal || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                
                {/* Additional batch information */}
                <div className="mt-4 bg-gray-50 p-3 rounded text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Status do Lote:</strong> {batch.status || 'N/A'}</p>
                      <p><strong>Observações:</strong> {batch.observations || 'Nenhuma observação'}</p>
                    </div>
                    <div>
                      <p><strong>Data de Envio:</strong> {batch.sentToProductionDate ? formatDate(batch.sentToProductionDate) : 'Não enviado'}</p>
                      <p><strong>Data de Retorno:</strong> {batch.actualReturnDate ? formatDate(batch.actualReturnDate) : 'Não retornado'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary and Total */}
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