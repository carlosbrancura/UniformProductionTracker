import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import BatchModal from "@/components/BatchModal";
import BatchForm from "@/components/BatchForm";
import type { Batch, Product, Workshop } from "@shared/schema";

export default function Dashboard() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [filters, setFilters] = useState({
    product: "",
    workshop: "",
    status: "",
    dateStart: "",
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ["/api/batches"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: workshops = [] } = useQuery<Workshop[]>({
    queryKey: ["/api/workshops"],
  });

  const filteredBatches = batches.filter((batch) => {
    if (filters.product && batch.productId !== parseInt(filters.product)) return false;
    if (filters.workshop && batch.workshopId !== parseInt(filters.workshop)) return false;
    if (filters.status && batch.status !== filters.status) return false;
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
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Lotes de Produção</h2>
          <Button onClick={handleNewBatch} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Novo Lote
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1">Produto</Label>
              <Select value={filters.product} onValueChange={(value) => setFilters({ ...filters, product: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os produtos</SelectItem>
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
                  <SelectItem value="">Todas as oficinas</SelectItem>
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
                  <SelectItem value="">Todos os status</SelectItem>
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
      </div>

      <WeeklyCalendar 
        batches={filteredBatches} 
        products={products}
        workshops={workshops}
        onBatchClick={handleBatchClick}
      />

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
