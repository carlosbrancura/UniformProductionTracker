import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

// Print page for invoices - opens in new tab
export default function InvoicePrint() {
  const { id } = useParams();

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['/api/invoices', id],
    enabled: !!id
  });

  // Fetch invoice batches
  const { data: invoiceBatches } = useQuery({
    queryKey: ['/api/invoices', id, 'batches'],
    enabled: !!id
  });

  // Fetch all products
  const { data: products } = useQuery({
    queryKey: ['/api/products']
  });

  // Fetch batch details and products
  const { data: batchDetails } = useQuery({
    queryKey: ['/api/batches/details', invoiceBatches],
    queryFn: async () => {
      if (!invoiceBatches || invoiceBatches.length === 0) return [];
      
      const batchPromises = invoiceBatches.map(async (ib: any) => {
        const [batchResponse, batchProductsResponse] = await Promise.all([
          fetch(`/api/batches/${ib.batchId}`),
          fetch(`/api/batch-products/batch/${ib.batchId}`)
        ]);
        
        const batch = await batchResponse.json();
        const batchProducts = await batchProductsResponse.json();
        
        return { ...batch, batchProducts };
      });
      
      return Promise.all(batchPromises);
    },
    enabled: !!invoiceBatches && invoiceBatches.length > 0
  });

  // Fetch workshop details
  const { data: workshop } = useQuery({
    queryKey: ['/api/workshops', invoice?.workshopId],
    enabled: !!invoice?.workshopId
  });

  // Auto-print when page loads
  useEffect(() => {
    if (invoice && batchDetails && products && workshop) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [invoice, batchDetails, products, workshop]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando fatura...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Erro ao carregar fatura</div>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <style jsx>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        @page {
          margin: 1.5cm;
          size: A4;
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">FATURA</h1>
            <p className="text-lg text-gray-600">#{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Data de Emissão</p>
            <p className="text-lg font-semibold">{formatDate(invoice.issueDate)}</p>
            <p className="text-sm text-gray-600 mt-2">Data de Vencimento</p>
            <p className="text-lg font-semibold">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>
      </div>

      {/* Workshop and Company Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Para:</h3>
          <div className="text-gray-700">
            <p className="text-xl font-semibold">{workshop?.name}</p>
            <p>Responsável: {workshop?.manager}</p>
            {workshop?.phone && <p>Telefone: {workshop?.phone}</p>}
            {workshop?.email && <p>Email: {workshop?.email}</p>}
            {workshop?.address && <p>Endereço: {workshop?.address}</p>}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">De:</h3>
          <div className="text-gray-700">
            <p className="text-xl font-semibold">Sua Empresa</p>
            <p>Endereço da empresa</p>
            <p>Telefone da empresa</p>
            <p>Email da empresa</p>
          </div>
        </div>
      </div>

      {/* Batch Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes dos Lotes</h3>
        
        {batchDetails?.map((batch: any) => (
          <div key={batch.id} className="border border-gray-200 rounded-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-semibold text-gray-900">Lote {batch.code}</h4>
              <div className="text-right text-sm text-gray-600">
                <p>Corte: {formatDate(batch.cutDate)}</p>
                <p>Retorno: {formatDate(batch.expectedReturnDate)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold">Produto</th>
                    <th className="text-left py-2 px-3 font-semibold">Cor</th>
                    <th className="text-left py-2 px-3 font-semibold">Tamanho</th>
                    <th className="text-center py-2 px-3 font-semibold">Qtd</th>
                    <th className="text-right py-2 px-3 font-semibold">Valor Unit.</th>
                    <th className="text-right py-2 px-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.batchProducts?.map((bp: any) => {
                    const product = products?.find((p: any) => p.id === bp.productId);
                    const unitValue = parseFloat(product?.productionValue || '0');
                    const totalValue = unitValue * bp.quantity;
                    
                    return (
                      <tr key={bp.id} className="border-b border-gray-100">
                        <td className="py-3 px-3">
                          {product?.name || 'Produto não encontrado'}
                        </td>
                        <td className="py-3 px-3">{bp.selectedColor}</td>
                        <td className="py-3 px-3">{bp.selectedSize}</td>
                        <td className="py-3 px-3 text-center">{bp.quantity}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(unitValue)}</td>
                        <td className="py-3 px-3 text-right font-semibold">{formatCurrency(totalValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              Total: {formatCurrency(invoice.totalAmount)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Status: {invoice.status === 'pending' ? 'Pendente' : 'Pago'}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Observações:</h4>
          <p className="text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* Footer for print */}
      <div className="mt-12 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Fatura gerada em {formatDate(new Date())}</p>
      </div>

      {/* Close button (not printed) */}
      <div className="no-print fixed top-4 right-4">
        <button
          onClick={() => window.close()}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}