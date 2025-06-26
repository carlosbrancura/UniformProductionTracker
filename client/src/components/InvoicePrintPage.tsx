import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { Invoice, Batch, Product } from '@shared/schema';

interface InvoicePrintPageProps {
  invoice: Invoice;
  batches: Batch[];
  products: Product[];
  workshop: any;
  onClose: () => void;
}

export default function InvoicePrintPage({ invoice, batches, products, workshop, onClose }: InvoicePrintPageProps) {
  // Auto-print when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      {/* Print controls - hidden when printing */}
      <div className="no-print mb-6 flex gap-3">
        <Button onClick={() => window.print()}>
          Imprimir Novamente
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>

      {/* Invoice Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">FATURA</h1>
        <p className="text-lg">#{invoice.invoiceNumber}</p>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2">DE:</h3>
          <p className="font-medium">Sua Empresa</p>
          <p>Endereço da Empresa</p>
          <p>Telefone: (XX) XXXX-XXXX</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">PARA:</h3>
          <p className="font-medium">{workshop.workshopName}</p>
          <p>{workshop.manager}</p>
          <p>{workshop.phone}</p>
          <p>{workshop.address}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p><strong>Data de Emissão:</strong> {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</p>
          <p><strong>Data de Vencimento:</strong> {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p>
        </div>
        <div>
          <p><strong>Status:</strong> {invoice.status === 'pending' ? 'Pendente' : 'Pago'}</p>
          <p><strong>Total:</strong> <span className="text-2xl font-bold text-green-600">R$ {parseFloat(invoice.totalAmount).toFixed(2)}</span></p>
        </div>
      </div>

      {/* Batches Table */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Lotes Incluídos</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left">Lote</th>
              <th className="border border-gray-300 p-3 text-left">Data de Corte</th>
              <th className="border border-gray-300 p-3 text-left">Produtos</th>
              <th className="border border-gray-300 p-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td className="border border-gray-300 p-3 font-medium">{batch.code}</td>
                <td className="border border-gray-300 p-3">
                  {new Date(batch.cutDate).toLocaleDateString('pt-BR')}
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="text-sm">
                    Produtos do lote (será preenchido automaticamente)
                  </div>
                </td>
                <td className="border border-gray-300 p-3 text-right font-medium">
                  R$ --
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={3} className="border border-gray-300 p-3 text-right font-bold">
                TOTAL:
              </td>
              <td className="border border-gray-300 p-3 text-right font-bold text-lg">
                R$ {parseFloat(invoice.totalAmount).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Observações</h3>
          <p className="text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 mt-12">
        <p>Esta fatura foi gerada automaticamente pelo sistema de produção.</p>
        <p>Data de geração: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}