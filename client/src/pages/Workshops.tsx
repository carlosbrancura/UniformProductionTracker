import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Phone, MapPin, Cog, BarChart3, Plus } from "lucide-react";
import WorkshopForm from "@/components/WorkshopForm";
import type { Workshop, Batch } from "@shared/schema";

export default function Workshops() {
  const [showForm, setShowForm] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);

  const { data: workshops = [], isLoading } = useQuery<Workshop[]>({
    queryKey: ["/api/workshops"],
  });

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ["/api/batches"],
  });

  const getActiveBatchCount = (workshopId: number) => {
    return batches.filter(batch => 
      batch.workshopId === workshopId && 
      !['returned_ok', 'returned_issues'].includes(batch.status)
    ).length;
  };

  const handleEdit = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingWorkshop(null);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingWorkshop(null);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Oficinas</h2>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nova Oficina
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {workshops.map((workshop) => (
          <Card key={workshop.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: workshop.color }}
                  ></div>
                  <div>
                    <CardTitle className="text-lg">{workshop.name}</CardTitle>
                    <p className="text-sm text-slate-600">{workshop.manager}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(workshop)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-slate-700">
                  <Phone className="w-4 h-4 mr-3 text-slate-400" />
                  <span>{workshop.phone}</span>
                </div>
                <div className="flex items-center text-sm text-slate-700">
                  <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                  <span>{workshop.address}</span>
                </div>
                <div className="flex items-center text-sm text-slate-700">
                  <Cog className="w-4 h-4 mr-3 text-slate-400" />
                  <span>{workshop.serviceType}</span>
                </div>
                {workshop.capacity && (
                  <div className="flex items-center text-sm text-slate-700">
                    <BarChart3 className="w-4 h-4 mr-3 text-slate-400" />
                    <span>Capacidade: {workshop.capacity}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Lotes Ativos:</span>
                  <span className="font-medium text-slate-900">
                    {getActiveBatchCount(workshop.id)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <WorkshopForm
          workshop={editingWorkshop}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
