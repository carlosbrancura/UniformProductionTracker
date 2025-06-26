import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Invoice, Batch, Product } from '@shared/schema';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onClose: () => void;
}

interface BatchDetail {
  batch: Batch;
  products: Array<{
    name: string;
    quantity: number;
    color: string;
    size: string;
    unitValue: number;
    totalValue: number;
  }>;
  batchTotal: number;
}

/**
 * Professional Invoice Print View Component
 * 
 * Provides a clean, print-ready invoice layout with:
 * - Company header and invoice details
 * - Detailed batch and product information
 * - Individual and total value calculations
 * - Print-optimized styling
 */
export default function InvoicePrintView({ invoice, onClose }: InvoicePrintViewProps) {
  const [batchDetails, setBatchDetails] = useState<BatchDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        // Fetch invoice batches
        const batchesResponse = await fetch(`/api/invoices/${invoice.id}/batches`);
        const invoiceBatches = await batchesResponse.json();

        // Fetch all products for reference
        const productsResponse = await fetch('/api/products');
        const allProducts = await productsResponse.json();

        // Fetch batch details and products for each batch
        const batchDetailsPromises = invoiceBatches.map(async (invoiceBatch: any) => {
          const batchResponse = await fetch(`/api/batches/${invoiceBatch.batchId}`);
          const batch = await batchResponse.json();

          const batchProductsResponse = await fetch(`/api/batch-products/batch/${invoiceBatch.batchId}`);
          const batchProducts = await batchProductsResponse.json();

          let batchTotal = 0;
          const products = batchProducts.map((bp: any) => {
            const product = allProducts.find((p: any) => p.id === bp.productId);
            const unitValue = parseFloat(product?.productionValue || '0');
            const totalValue = unitValue * bp.quantity;
            batchTotal += totalValue;

            return {
              name: product?.name || 'Produto não encontrado',
              quantity: bp.quantity,
              color: bp.selectedColor,
              size: bp.selectedSize,
              unitValue,
              totalValue
            };
          });

          return {
            batch,
            products,
            batchTotal
          };
        });

        const details = await Promise.all(batchDetailsPromises);
        setBatchDetails(details);
      } catch (error) {
        console.error('Error fetching invoice details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [invoice.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando dados da fatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Print Controls - Hidden in print */}
      <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Impressão da Fatura {invoice.invoiceNumber}</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Company Header */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistema de Produção</h1>
          <p className="text-gray-600">Gestão de Uniformes e Confecções</p>
        </div>

        {/* Invoice Header */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Dados da Fatura</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Número:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-medium">Data de Emissão:</span> {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
              <p><span className="font-medium">Data de Vencimento:</span> {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  invoice.status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Valores</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Total da Fatura:</span> 
                <span className="text-2xl font-bold text-green-600 ml-2">
                  R$ {parseFloat(invoice.totalAmount).toFixed(2)}
                </span>
              </p>
              <p><span className="font-medium">Quantidade de Lotes:</span> {batchDetails.length}</p>
            </div>
          </div>
        </div>

        {/* Batch Details */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Detalhamento dos Lotes</h2>
          
          {batchDetails.map((detail, index) => (
            <div key={detail.batch.id} className="mb-6 border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">
                  Lote {detail.batch.code}
                </h3>
                <div className="text-sm text-gray-600">
                  Corte: {format(new Date(detail.batch.cutDate), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Produto</th>
                      <th className="text-center p-2">Cor</th>
                      <th className="text-center p-2">Tamanho</th>
                      <th className="text-center p-2">Qtd</th>
                      <th className="text-right p-2">Vlr. Unit.</th>
                      <th className="text-right p-2">Vlr. Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.products.map((product, prodIndex) => (
                      <tr key={prodIndex} className="border-b">
                        <td className="p-2">
                          {product.name.substring(0, 20)}
                          {product.name.length > 20 && '...'}
                        </td>
                        <td className="text-center p-2">{product.color}</td>
                        <td className="text-center p-2">{product.size}</td>
                        <td className="text-center p-2">{product.quantity}</td>
                        <td className="text-right p-2">R$ {product.unitValue.toFixed(2)}</td>
                        <td className="text-right p-2 font-medium">R$ {product.totalValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-gray-50">
                      <td colSpan={5} className="p-2 font-medium text-right">Total do Lote:</td>
                      <td className="p-2 font-bold text-right">R$ {detail.batchTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice Summary */}
        <div className="border-t-2 pt-4">
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-lg">
                <span className="font-medium">Total Geral da Fatura:</span>
              </p>
              <p className="text-3xl font-bold text-green-600">
                R$ {parseFloat(invoice.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Observações:</h3>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
          <p>Este documento foi gerado automaticamente pelo Sistema de Produção</p>
          <p>Data de impressão: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          .border {
            border: 1px solid #000 !important;
          }
          
          .border-b {
            border-bottom: 1px solid #ccc !important;
          }
          
          .border-t-2 {
            border-top: 2px solid #000 !important;
          }
          
          .bg-gray-50 {
            background-color: #f9f9f9 !important;
          }
        }
      `}</style>
    </div>
  );
}