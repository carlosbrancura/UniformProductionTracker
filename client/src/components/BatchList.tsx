import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Factory, Package } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Batch, Product, Workshop } from "@shared/schema";

interface BatchListProps {
  batches: Batch[];
  products: Product[];
  workshops: Workshop[];
  onBatchClick: (batch: Batch) => void;
}

const statusLabels: Record<string, string> = {
  waiting: "Aguardando",
  internal_production: "Produção Interna",
  external_workshop: "Oficina Externa",
  returned_ok: "Retornado OK",
  returned_issues: "Retornado c/ Problemas"
};

const statusColors: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  internal_production: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  external_workshop: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  returned_ok: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  returned_issues: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export default function BatchList({ batches, products, workshops, onBatchClick }: BatchListProps) {
  const [dateFilter, setDateFilter] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Separate active and returned batches, then apply filters
  const activeBatches = batches.filter(batch => batch.status !== "returned");
  const returnedBatches = batches.filter(batch => batch.status === "returned");

  const filteredActiveBatches = activeBatches.filter(batch => {
    const dateMatch = !dateFilter || formatDate(batch.cutDate).includes(dateFilter);
    const workshopMatch = !workshopFilter || workshopFilter === "all" || 
      (workshopFilter === "internal" && !batch.workshopId) || 
      batch.workshopId?.toString() === workshopFilter;
    const statusMatch = !statusFilter || statusFilter === "all" || batch.status === statusFilter;
    
    return dateMatch && workshopMatch && statusMatch;
  });

  const filteredReturnedBatches = returnedBatches.filter(batch => {
    const dateMatch = !dateFilter || formatDate(batch.cutDate).includes(dateFilter);
    const workshopMatch = !workshopFilter || workshopFilter === "all" || 
      (workshopFilter === "internal" && !batch.workshopId) || 
      batch.workshopId?.toString() === workshopFilter;
    const statusMatch = !statusFilter || statusFilter === "all" || batch.status === statusFilter;
    
    return dateMatch && workshopMatch && statusMatch;
  });

  // Combine active batches first, then returned batches
  const allFilteredBatches = [...filteredActiveBatches, ...filteredReturnedBatches];
  
  // Calculate pagination
  const totalPages = Math.ceil(allFilteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBatches = allFilteredBatches.slice(startIndex, endIndex);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  const getProductName = (productId: number) => {
    return products.find(p => p.id === productId)?.name || "Produto não encontrado";
  };

  const getWorkshopName = (workshopId: number | null) => {
    if (!workshopId) return "Produção Interna";
    return workshops.find(w => w.id === workshopId)?.name || "Oficina não encontrada";
  };

  const clearFilters = () => {
    setDateFilter("");
    setWorkshopFilter("");
    setStatusFilter("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lista de Lotes
        </CardTitle>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Filtrar por data..."
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                resetPage();
              }}
              className="w-full"
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Select value={workshopFilter} onValueChange={(value) => {
              setWorkshopFilter(value);
              resetPage();
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por oficina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as oficinas</SelectItem>
                <SelectItem value="internal">Produção Interna</SelectItem>
                {workshops.map(workshop => (
                  <SelectItem key={workshop.id} value={workshop.id.toString()}>
                    {workshop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {paginatedBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lote encontrado com os filtros aplicados.
            </div>
          ) : (
            paginatedBatches.map((batch: Batch) => (
              <div
                key={batch.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onBatchClick(batch)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        Lote {batch.code}
                      </h3>
                      <Badge className={statusColors[batch.status] || ""}>
                        {statusLabels[batch.status] || batch.status}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {getProductName(batch.productId)} - {batch.quantity} peças
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        Corte: {formatDate(batch.cutDate)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Factory className="h-4 w-4" />
                        {getWorkshopName(batch.workshopId)}
                      </div>
                    </div>
                    
                    {batch.expectedReturnDate && (
                      <div className="text-sm text-muted-foreground">
                        Previsão de retorno: {formatDate(batch.expectedReturnDate)}
                      </div>
                    )}
                    
                    {batch.observations && (
                      <div className="text-sm text-muted-foreground italic">
                        {batch.observations}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(endIndex, allFilteredBatches.length)} de {allFilteredBatches.length} lotes
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}