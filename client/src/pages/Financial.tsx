import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, DollarSign, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import type { Workshop } from '@shared/schema';
import WorkshopFinancialDetails from '@/components/WorkshopFinancialDetails';

/**
 * Financial Management Page
 * 
 * This component provides a comprehensive financial overview for workshop payments.
 * Features:
 * - Time period filtering (last 60 days default)
 * - Workshop summary with unpaid amounts
 * - Drill-down into workshop details
 * - Invoice management and payment tracking
 */
export default function Financial() {
  // State management for date filtering and workshop selection
  const [selectedPeriod, setSelectedPeriod] = useState('60'); // Days
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Calculate date range based on selected period
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch all workshops for fallback display
  const { data: allWorkshops = [] } = useQuery({
    queryKey: ['/api/workshops'],
  });

  // Fetch workshop financial summary data
  const { data: financialSummary = [], isLoading } = useQuery({
    queryKey: ['/api/financial/workshop-summary', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/financial/workshop-summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch financial summary');
      const data = await response.json();
      
      // If no financial data, show all workshops with zero values
      if (data.length === 0) {
        return allWorkshops.map((workshop: Workshop) => ({
          workshopId: workshop.id,
          workshopName: workshop.name,
          batchCount: 0,
          totalUnpaidValue: 0
        }));
      }
      
      return data;
    },
    enabled: allWorkshops.length > 0
  });

  // Calculate total unpaid amount across all workshops
  const totalUnpaidAmount = financialSummary.reduce((sum: number, workshop: any) => 
    sum + (parseFloat(workshop.totalUnpaidValue) || 0), 0
  );

  // Handle workshop selection for detailed view
  const handleWorkshopClick = (workshop: any) => {
    setSelectedWorkshop(workshop);
  };

  // Return to main financial view
  const handleBackToSummary = () => {
    setSelectedWorkshop(null);
  };

  // Render workshop details view if a workshop is selected
  if (selectedWorkshop) {
    return (
      <WorkshopFinancialDetails 
        workshop={selectedWorkshop}
        startDate={startDate}
        endDate={endDate}
        onBack={handleBackToSummary}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header with Title and Period Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-600 mt-1">
            Controle de pagamentos das oficinas parceiras
          </p>
        </div>

        {/* Period Selection Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Outstanding Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalUnpaidAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Período: {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardContent>
        </Card>

        {/* Total Workshops with Pending Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oficinas Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com valores em aberto
            </p>
          </CardContent>
        </Card>

        {/* Total Unpaid Batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lotes Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.reduce((sum: number, workshop: any) => 
                sum + parseInt(workshop.batchCount || 0), 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workshop Financial Summary List */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Oficina</CardTitle>
          <p className="text-sm text-gray-600">
            Clique em uma oficina para ver detalhes dos lotes e gerar faturas
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando dados financeiros...</p>
            </div>
          ) : financialSummary.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Nenhuma oficina com valores pendentes no período selecionado
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {financialSummary.map((workshop: any) => (
                <div
                  key={workshop.workshopId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleWorkshopClick(workshop)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{workshop.workshopName}</h3>
                      <Badge variant="secondary">
                        {workshop.batchCount} lote{workshop.batchCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Período: {formatDate(startDate)} - {formatDate(endDate)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        R$ {parseFloat(workshop.totalUnpaidValue || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Em aberto</p>
                    </div>
                    <Eye className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}