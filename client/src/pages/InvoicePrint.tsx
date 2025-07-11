import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useEffect } from "react";

export default function InvoicePrint() {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  // Debug logging for URL params
  console.log('InvoicePrint - Current URL:', window.location.href);
  console.log('InvoicePrint - Parsed invoiceId:', invoiceId);
  console.log('InvoicePrint - All params:', useParams());
  
  // Extract invoiceId from URL if useParams fails
  const urlParts = window.location.pathname.split('/');
  const urlInvoiceId = urlParts[urlParts.length - 1];
  const finalInvoiceId = invoiceId || urlInvoiceId;
  
  console.log('InvoicePrint - Final invoiceId:', finalInvoiceId);

  // Fetch invoice data
  const { data: invoice, isLoading: invoiceLoading, error: invoiceError } = useQuery({
    queryKey: [`/api/invoices/${finalInvoiceId}`],
    enabled: !!finalInvoiceId
  });

  // Fetch invoice batches
  const { data: invoiceBatches, isLoading: batchesLoading } = useQuery({
    queryKey: [`/api/invoices/${finalInvoiceId}/batches`],
    enabled: !!finalInvoiceId
  });

  // Fetch workshop data
  const { data: workshop, isLoading: workshopLoading } = useQuery({
    queryKey: [`/api/workshops/${(invoice as any)?.workshopId}`],
    enabled: !!(invoice as any)?.workshopId
  });

  // Fetch all products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products']
  });

  // Fetch batch products for the invoice batches
  const { data: batchProducts, isLoading: batchProductsLoading } = useQuery({
    queryKey: [`/api/batch-products/multiple`],
    queryFn: async () => {
      if (!(invoiceBatches as any[])?.length) return [];
      
      const batchIds = (invoiceBatches as any[]).map((ib: any) => ib.batchId);
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
    enabled: !!((invoiceBatches as any[])?.length > 0)
  });

  // Auto-print when data is loaded
  useEffect(() => {
    if (invoice && invoiceBatches && workshop && products && 
        !invoiceLoading && !batchesLoading && !workshopLoading && !productsLoading && !batchProductsLoading) {
      // Use a longer delay to ensure DOM is stable
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (error) {
          console.error('Print error:', error);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [invoice, invoiceBatches, workshop, products, batchProducts, invoiceLoading, batchesLoading, workshopLoading, productsLoading, batchProductsLoading]);

  // Process batch data with products
  const processedBatches = ((invoiceBatches as any[]) || []).map((invoiceBatch: any) => {
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
      .filter((bp: any) => bp.productId)
      .map((bp: any) => {
        const product = (products as any[])?.find((p: any) => p.id === bp.productId);
        if (!product) {
          console.warn('Product not found for ID:', bp.productId);
          return {
            productName: 'Produto não encontrado',
            description: 'N/A',
            productionValue: 0,
            quantity: bp.quantity || 0,
            total: 0,
            selectedColor: bp.selectedColor || 'N/A',
            selectedSize: bp.selectedSize || 'N/A'
          };
        }

        const productionValue = parseFloat(product.productionValue) || 0;
        const quantity = bp.quantity || 0;
        const total = productionValue * quantity;

        return {
          productName: product.name || 'Nome não disponível',
          description: product.description || 'Descrição não disponível',
          productionValue,
          quantity,
          total,
          selectedColor: bp.selectedColor || 'N/A',
          selectedSize: bp.selectedSize || 'N/A'
        };
      });

    const batchTotal = productsWithTotals.reduce((sum: number, p: any) => sum + p.total, 0);

    return {
      id: batch.id,
      code: batch.code,
      cutDate: batch.cutDate || '',
      expectedReturnDate: batch.expectedReturnDate,
      actualReturnDate: batch.actualReturnDate,
      sentToProductionDate: batch.sentToProductionDate,
      status: batch.status,
      observations: batch.observations,
      products: productsWithTotals,
      batchTotal
    };
  }).filter(Boolean);

  // Calculate total
  const grandTotal = processedBatches.reduce((sum: number, batch: any) => sum + batch.batchTotal, 0);

  // Debug logging
  console.log('InvoicePrint Debug:', {
    invoiceId,
    finalInvoiceId,
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
            <p>ID da fatura: {finalInvoiceId}</p>
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

  // Error states
  if (invoiceError || !invoice) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erro ao carregar fatura
          </h1>
          <p className="text-gray-600">
            {invoiceError ? `Erro na API: ${invoiceError}` : 'Fatura não encontrada'}
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>ID da fatura solicitada: {finalInvoiceId}</p>
            <p>URL atual: {window.location.href}</p>
            <p>Status da busca: {invoiceLoading ? 'Carregando...' : 'Finalizada'}</p>
            {invoiceError && (
              <p>Detalhes do erro: {JSON.stringify(invoiceError)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              <p><strong>Número da Fatura:</strong> {(invoice as any)?.invoiceNumber || 'N/A'}</p>
              <p><strong>Data de Emissão:</strong> {formatDate((invoice as any)?.issueDate || new Date().toISOString())}</p>
            </div>
            <div className="text-left">
              <p><strong>Data de Vencimento:</strong> {formatDate((invoice as any)?.dueDate || new Date().toISOString())}</p>
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
      <div className="border-t-2 border-gray-400 pt-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Summary */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Resumo da Fatura</h3>
            <div className="space-y-2">
              <p><strong>Total de Lotes:</strong> {processedBatches.length}</p>
              <p><strong>Total de Peças:</strong> {processedBatches.reduce((sum: number, batch: any) => {
                return sum + (batch.products || []).reduce((batchSum: number, product: any) => batchSum + (product.quantity || 0), 0);
              }, 0)}</p>
              <p><strong>Período de Serviço:</strong> {processedBatches.length > 0 ? 
                `${formatDate(Math.min(...processedBatches.map((b: any) => new Date(b.cutDate || new Date()).getTime())).toString())} a ${formatDate(Math.max(...processedBatches.map((b: any) => new Date(b.cutDate || new Date()).getTime())).toString())}` 
                : 'N/A'}</p>
            </div>
          </div>

          {/* Total Amount */}
          <div className="text-right">
            <div className="bg-blue-600 text-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-2">VALOR TOTAL</h2>
              <div className="text-3xl font-bold">
                {formatCurrency(grandTotal)}
              </div>
              <p className="text-blue-100 mt-2 text-sm">
                {(invoice as any)?.status === 'pending' ? 'Valor em aberto' : 'Valor faturado'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Informações de Pagamento</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p><strong>Forma de Pagamento:</strong> Conforme acordo</p>
              <p><strong>Prazo de Pagamento:</strong> {formatDate((invoice as any)?.dueDate || new Date().toISOString())}</p>
            </div>
            <div>
              <p><strong>Status:</strong> <span className={`font-semibold ${(invoice as any)?.status === 'pending' ? 'text-orange-600' : 'text-green-600'}`}>
                {(invoice as any)?.status === 'pending' ? 'Aberto' : 'Faturado'}
              </span></p>
              {(invoice as any)?.paidDate && (
                <p><strong>Data de Pagamento:</strong> {formatDate((invoice as any).paidDate)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 border-t border-gray-300 pt-4">
          <p className="text-sm">
            Esta fatura foi gerada automaticamente pelo sistema em {formatDate(new Date().toISOString())}
          </p>
          <p className="text-xs mt-2">
            Em caso de dúvidas, entre em contato com o setor financeiro
          </p>
        </div>
      </div>
    </div>
  );
}