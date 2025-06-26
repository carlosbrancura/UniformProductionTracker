import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Invoice {
  id: number;
  workshopId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
  status: 'pending' | 'paid';
  notes?: string;
  paidDate?: string;
}

interface InvoiceHistoryProps {
  workshopId: number;
}

/**
 * Invoice History Component
 * 
 * Displays the complete invoice history for a workshop with:
 * - List of all invoices (paid and pending)
 * - Payment status tracking
 * - Quick payment actions
 * - Invoice download/print functionality
 */
export default function InvoiceHistory({ workshopId }: InvoiceHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices for this workshop
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices/workshop', workshopId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/workshop/${workshopId}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    }
  });

  // Mark invoice as paid mutation
  const markInvoiceAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidDate: new Date().toISOString() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update invoice status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Fatura marcada como paga com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao marcar fatura como paga", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Get status badge variant based on invoice status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  // Get status text in Portuguese
  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'overdue':
        return 'Vencida';
      case 'pending':
      default:
        return 'Pendente';
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = (invoiceId: number) => {
    markInvoiceAsPaidMutation.mutate(invoiceId);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    // Open print page in new tab
    const printUrl = `/invoice-print/${invoice.id}`;
    window.open(printUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Carregando histórico de faturas...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhuma fatura encontrada para esta oficina</p>
        <p className="text-sm text-gray-400">As faturas geradas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total de Faturas</p>
          <p className="text-xl font-bold">{invoices.length}</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Pagas</p>
          <p className="text-xl font-bold text-green-600">
            {invoices.filter((inv: Invoice) => inv.status === 'paid').length}
          </p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-gray-600">Pendentes</p>
          <p className="text-xl font-bold text-red-600">
            {invoices.filter((inv: Invoice) => inv.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {invoices.map((invoice: Invoice) => (
          <div key={invoice.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                <Badge variant={getStatusBadgeVariant(invoice.status)}>
                  {getStatusText(invoice.status)}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  R$ {parseFloat(invoice.totalAmount).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
              <div>
                <span className="font-medium">Emissão:</span><br />
                {formatDate(invoice.issueDate)}
              </div>
              <div>
                <span className="font-medium">Vencimento:</span><br />
                {formatDate(invoice.dueDate)}
              </div>
              {invoice.paidDate && (
                <div>
                  <span className="font-medium">Pagamento:</span><br />
                  {formatDate(invoice.paidDate)}
                </div>
              )}
              <div>
                <span className="font-medium">Status:</span><br />
                {getStatusText(invoice.status)}
              </div>
            </div>

            {invoice.notes && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">Observações:</span> {invoice.notes}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintInvoice(invoice)}
              >
                <Download className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              
              {invoice.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => handleMarkAsPaid(invoice.id)}
                  disabled={markInvoiceAsPaidMutation.isPending}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Marcar como Paga
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}