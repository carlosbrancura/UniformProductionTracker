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
    select: (data: Workshop[]) => [...data].sort((a, b) => (a.scheduleOrder || 1) - (b.scheduleOrder || 1)),
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
                    <CardTitle className="text-lg flex items-center gap-2">
                      #{workshop.scheduleOrder} {workshop.name}
                      <a 
                        href={`https://wa.me/55${workshop.phone?.replace(/\D/g, '') || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                        title={`WhatsApp ${workshop.name}`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.108"/>
                        </svg>
                      </a>
                    </CardTitle>
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
                  <a 
                    href={`https://wa.me/55${workshop.phone?.replace(/\D/g, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800"
                  >
                    {workshop.phone}
                  </a>
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
