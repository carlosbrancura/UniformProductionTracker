import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  totalAmount: string;
  notes?: string;
  workshop: {
    name: string;
  };
  batches: Array<{
    id: number;
    code: string;
    cutDate: string;
    products: Array<{
      productName: string;
      selectedColor: string;
      quantity: number;
      productionValue: number;
      total: number;
    }>;
    batchTotal: number;
  }>;
}

export default function InvoicePrint() {
  const [location] = useLocation();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract invoice ID from URL
    const pathParts = location.split('/');
    const invoiceId = pathParts[pathParts.length - 1];
    
    if (invoiceId && invoiceId !== 'print') {
      fetchInvoiceData(parseInt(invoiceId));
    }
  }, [location]);

  const fetchInvoiceData = async (invoiceId: number) => {
    try {
      // Fetch invoice details
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      const invoice = await invoiceResponse.json();

      // Fetch workshop details
      const workshopResponse = await fetch(`/api/workshops/${invoice.workshopId}`);
      const workshop = await workshopResponse.json();

      // Fetch invoice batches
      const batchesResponse = await fetch(`/api/invoices/${invoiceId}/batches`);
      const invoiceBatches = await batchesResponse.json();

      // Fetch all products for reference
      const productsResponse = await fetch('/api/products');
      const products = await productsResponse.json();

      // Build detailed batch data with products
      const batchesWithDetails = await Promise.all(
        invoiceBatches.map(async (invoiceBatch: any) => {
          // Fetch batch products
          const batchProductsResponse = await fetch(`/api/batch-products/multiple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchIds: [invoiceBatch.batchId] })
          });
          const batchProducts = await batchProductsResponse.json();

          // Calculate products with totals
          const productsWithTotals = batchProducts.map((bp: any) => {
            const product = products.find((p: any) => p.id === bp.productId);
            const productionValue = parseFloat(product?.productionValue || '0');
            const total = bp.quantity * productionValue;

            return {
              productName: product?.name || 'Produto não encontrado',
              selectedColor: bp.selectedColor || 'N/A',
              quantity: bp.quantity,
              productionValue,
              total
            };
          });

          const batchTotal = productsWithTotals.reduce((sum, p) => sum + p.total, 0);

          return {
            id: invoiceBatch.batchId,
            code: invoiceBatch.batch?.code || 'N/A',
            cutDate: invoiceBatch.batch?.cutDate || '',
            products: productsWithTotals,
            batchTotal
          };
        })
      );

      setInvoiceData({
        ...invoice,
        workshop,
        batches: batchesWithDetails
      });
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  useEffect(() => {
    // Auto-print when data is loaded
    if (invoiceData && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [invoiceData, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando fatura...</div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Erro ao carregar fatura</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">FATURA DE SERVIÇOS</h1>
          
          {/* Workshop Name - Highlighted */}
          <div className="bg-gray-100 p-4 rounded-lg mb-4 inline-block">
            <h2 className="text-2xl font-bold text-blue-600">
              {invoiceData.workshop.name}
            </h2>
          </div>
          
          {/* Invoice Details */}
          <div className="flex justify-center gap-8 text-lg">
            <span><strong>Fatura:</strong> {invoiceData.invoiceNumber}</span>
            <span><strong>Data:</strong> {formatDate(invoiceData.issueDate)}</span>
          </div>
        </div>

        {/* Observations */}
        {invoiceData.notes && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Observações:</h3>
            <div className="bg-gray-50 p-4 rounded border">
              {invoiceData.notes}
            </div>
          </div>
        )}

        {/* Batches Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2">LOTES</h3>
          
          {invoiceData.batches.map((batch) => (
            <div key={batch.id} className="mb-6 border rounded-lg p-4 bg-gray-50">
              {/* Batch Header */}
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div className="flex gap-4">
                  <span className="font-bold text-lg">Lote {batch.code}</span>
                  <span className="text-gray-600">Data de Corte: {formatDate(batch.cutDate)}</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  Valor Total: {formatCurrency(batch.batchTotal)}
                </div>
              </div>

              {/* Products List */}
              <div className="space-y-1">
                {batch.products.map((product, index) => (
                  <div key={index} className="text-sm flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1">
                      <span className="font-medium">{product.productName}</span>
                      <span className="text-gray-600 ml-2">- {product.selectedColor}</span>
                    </div>
                    <div className="flex gap-4 text-right">
                      <span className="w-16">Qtd: {product.quantity}</span>
                      <span className="w-20">{formatCurrency(product.productionValue)}</span>
                      <span className="w-20 font-medium">{formatCurrency(product.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t-2 border-gray-400 pt-4">
          <div className="flex justify-end">
            <div className="bg-blue-50 p-4 rounded-lg">
              <span className="text-xl font-bold">
                TOTAL GERAL: {formatCurrency(parseFloat(invoiceData.totalAmount))}
              </span>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm print:block hidden">
          <p>Fatura gerada em {formatDate(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:p-4 { padding: 1rem !important; }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}