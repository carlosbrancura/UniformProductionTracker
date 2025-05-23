import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Batch, Product, Workshop } from "@shared/schema";

interface WeeklyCalendarProps {
  batches: Batch[];
  products: Product[];
  workshops: Workshop[];
  onBatchClick: (batch: Batch) => void;
}

export default function WeeklyCalendar({ batches, products, workshops, onBatchClick }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const getWorkshopColor = (workshopId: number | null) => {
    if (!workshopId) return "#1E40AF"; // Internal production - blue-800
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.color || "#6B7280";
  };

  const getWorkshopName = (workshopId: number | null) => {
    if (!workshopId) return "Produção Interna";
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Oficina";
  };

  const getBatchesForDay = (day: Date) => {
    return batches.filter(batch => {
      const cutDate = new Date(batch.cutDate);
      const expectedReturn = batch.expectedReturnDate ? new Date(batch.expectedReturnDate) : cutDate;
      
      return isWithinInterval(day, {
        start: cutDate,
        end: expectedReturn
      });
    });
  };

  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Cronograma Semanal</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 px-4">
              {format(weekStart, "dd/MM/yyyy", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
          {/* Header */}
          {weekDays.map((day, index) => (
            <div key={day.toString()} className="bg-slate-100 p-3 text-center">
              <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                {dayNames[index]}
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-1">
                {format(day, "dd")}
              </div>
            </div>
          ))}

          {/* Calendar Body */}
          {weekDays.map((day) => {
            const dayBatches = getBatchesForDay(day);
            
            return (
              <div key={day.toString()} className="bg-white p-2 h-32 relative overflow-hidden">
                {dayBatches.map((batch, index) => {
                  const workshopColor = getWorkshopColor(batch.workshopId);
                  const workshopName = getWorkshopName(batch.workshopId);
                  
                  return (
                    <div
                      key={batch.id}
                      className="absolute left-1 right-1 text-white text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: workshopColor,
                        top: `${6 + index * 24}px`,
                        zIndex: 10,
                      }}
                      onClick={() => onBatchClick(batch)}
                    >
                      Lote {batch.code}, {workshopName}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: "#1E40AF" }}></div>
            <span className="text-sm text-slate-700">Produção Interna</span>
          </div>
          {workshops.map((workshop) => (
            <div key={workshop.id} className="flex items-center">
              <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: workshop.color }}></div>
              <span className="text-sm text-slate-700">{workshop.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
