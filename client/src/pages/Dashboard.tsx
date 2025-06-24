import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import OrganizedCalendar from "@/components/OrganizedCalendar";
import BatchModal from "@/components/BatchModal";
import BatchForm from "@/components/BatchForm";
import BatchList from "@/components/BatchList";
import type { Batch, Product, Workshop } from "@shared/schema";

export default function Dashboard() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [filters, setFilters] = useState({
    product: "all",
    workshop: "all", 
    status: "all",
    dateStart: "",
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ["/api/batches"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: workshops = [] } = useQuery<Workshop[]>({
    queryKey: ["/api/workshops"],
  });

  const filteredBatches = batches.filter((batch) => {
    if (filters.product && filters.product !== "all" && batch.productId !== parseInt(filters.product)) return false;
    if (filters.workshop && filters.workshop !== "all" && batch.workshopId !== parseInt(filters.workshop)) return false;
    if (filters.status && filters.status !== "all" && batch.status !== filters.status) return false;
    if (filters.dateStart) {
      const filterDate = new Date(filters.dateStart);
      const batchDate = new Date(batch.cutDate);
      if (batchDate < filterDate) return false;
    }
    return true;
  });

  const handleBatchClick = (batch: Batch) => {
    setSelectedBatch(batch);
  };

  const handleNewBatch = () => {
    setShowBatchForm(true);
  };

  if (batchesLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cronograma Semanal com Destaque Total */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Cronograma Semanal de Produção</h1>
          <Button onClick={handleNewBatch} size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" />
            Novo Lote
          </Button>
        </div>
        
        <OrganizedCalendar 
          batches={batches} 
          products={products}
          workshops={workshops}
          onBatchClick={handleBatchClick}
        />
      </div>

      {/* Filtros movidos para baixo do cronograma */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1">Produto</Label>
            <Select value={filters.product} onValueChange={(value) => setFilters({ ...filters, product: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1">Oficina</Label>
            <Select value={filters.workshop} onValueChange={(value) => setFilters({ ...filters, workshop: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as oficinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as oficinas</SelectItem>
                {workshops.map((workshop) => (
                  <SelectItem key={workshop.id} value={workshop.id.toString()}>
                    {workshop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1">Status</Label>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="waiting">Aguardando</SelectItem>
                <SelectItem value="internal_production">Produção Interna</SelectItem>
                <SelectItem value="external_workshop">Oficina Externa</SelectItem>
                <SelectItem value="returned_ok">Retornado OK</SelectItem>
                <SelectItem value="returned_issues">Retornado com Problemas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1">Data Inicial</Label>
            <Input
              type="date"
              value={filters.dateStart}
              onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Lista de Lotes */}
      <div className="bg-white rounded-lg shadow">
        <BatchList
          batches={filteredBatches || []}
          products={products || []}
          workshops={workshops || []}
          onBatchClick={handleBatchClick}
        />
      </div>

      {selectedBatch && (
        <BatchModal
          batch={selectedBatch}
          products={products}
          workshops={workshops}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {showBatchForm && (
        <BatchForm
          products={products}
          workshops={workshops}
          onClose={() => setShowBatchForm(false)}
        />
      )}
    </div>
  );
}
