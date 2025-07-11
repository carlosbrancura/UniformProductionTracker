import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, ChevronRight, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import WorkshopFinancialDetails from "@/components/WorkshopFinancialDetails";

interface FinancialSummary {
  workshopId: number;
  workshopName: string;
  pendingBatchCount: number;
  paidBatchCount: number;
  totalBatchCount: number;
  totalUnpaidValue: string;
}

/**
 * Financial Management Page
 * 
 * Main dashboard for financial oversight including:
 * - Workshop payment summary with 60-day default filtering
 * - Outstanding batch values and counts
 * - Financial KPI cards (total outstanding, pending workshops, unpaid batches)
 * - Workshop drill-down navigation for detailed payment management
 */
export default function Financial() {
  const [selectedWorkshop, setSelectedWorkshop] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range for financial calculations (default: last 60 days)
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 60);
    return { startDate, endDate };
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const { startDate, endDate } = getDateRange();

  // Fetch financial data
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        console.log('Iniciando busca de dados financeiros...');
        setIsLoading(true);
        setError(null);
        
        const url = `/api/financial/workshop-summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        console.log('URL da requisição:', url);
        
        const response = await fetch(url);
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        
        setFinancialSummary(data || []);
      } catch (err) {
        console.error('Erro ao buscar dados financeiros:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setFinancialSummary([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancialData();
  }, []); // Remove dependency to prevent loops

  // Calculate summary values
  const totalUnpaidAmount = financialSummary.reduce((sum, workshop) => {
    const value = parseFloat(workshop.totalUnpaidValue || '0');
    return sum + value;
  }, 0);

  const totalPendingBatches = financialSummary.reduce((sum, workshop) => sum + workshop.pendingBatchCount, 0);
  const totalPaidBatches = financialSummary.reduce((sum, workshop) => sum + workshop.paidBatchCount, 0);
  const totalBatchCount = financialSummary.reduce((sum, workshop) => sum + workshop.totalBatchCount, 0);

  const workshopsWithDebt = financialSummary.filter(workshop => 
    parseFloat(workshop.totalUnpaidValue || '0') > 0
  ).length;

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

  console.log('Renderizando componente Financial. Loading:', isLoading, 'Error:', error, 'Data:', financialSummary);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-600 mt-1">Controle de pagamentos das oficinas parceiras</p>
        </div>

        {/* Period Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>Período: {formatDate(startDate)} - {formatDate(endDate)}</span>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total de Lotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Lotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalBatchCount}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>

        {/* Lotes Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalPendingBatches}</div>
            <p className="text-xs text-muted-foreground">aguardando pagamento</p>
          </CardContent>
        </Card>

        {/* Lotes Pagos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPaidBatches}</div>
            <p className="text-xs text-muted-foreground">já foram pagos</p>
          </CardContent>
        </Card>

        {/* Valor Total Pendente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalUnpaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">em {financialSummary.length} oficinas</p>
          </CardContent>
        </Card>

      </div>

      {/* Workshop Financial Summary List */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Oficina</CardTitle>
          <p className="text-sm text-gray-600">Clique em uma oficina para ver detalhes dos lotes e gerar faturas</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando dados financeiros...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">Erro ao carregar dados financeiros</p>
              <p className="text-xs text-gray-400">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Tentar novamente
              </button>
            </div>
          ) : !financialSummary || financialSummary.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Nenhuma oficina com valores pendentes no período selecionado
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Período: {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {financialSummary.map((workshop) => {
                const unpaidValue = parseFloat(workshop.totalUnpaidValue || '0');
                
                return (
                  <div
                    key={workshop.workshopId}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedWorkshop(workshop)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{workshop.workshopName}</h3>
                        <div className="flex flex-wrap gap-6 text-sm mt-2">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-blue-600">{workshop.totalBatchCount}</span>
                            <span className="text-gray-600">lotes total</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-red-600">{workshop.pendingBatchCount}</span>
                            <span className="text-gray-600">pendentes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-green-600">{workshop.paidBatchCount}</span>
                            <span className="text-gray-600">pagos</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-xl font-bold text-orange-600">
                          R$ {unpaidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">Pendente</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
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