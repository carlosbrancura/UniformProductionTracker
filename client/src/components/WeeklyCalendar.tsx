import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks, differenceInDays, isWithinInterval } from "date-fns";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  // Touch/Mouse scroll handlers for week navigation
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    // Visual feedback during drag (optional)
  };

  const handleEnd = (clientX: number) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaX = clientX - startX;
    const threshold = 50; // Reduced threshold for better sensitivity
    
    if (deltaX > threshold) {
      previousWeek(); // Drag right = previous week
    } else if (deltaX < -threshold) {
      nextWeek(); // Drag left = next week
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleMove(e.clientX);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleEnd(e.clientX);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isDragging) {
      handleEnd(e.clientX);
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.changedTouches[0];
      handleEnd(touch.clientX);
    }
  };

  const getWorkshopColor = (workshopId: number | null) => {
    if (!workshopId) return "#1E40AF"; // Internal production - blue-800
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.color || "#6B7280";
  };

  const getWorkshopName = (workshopId: number | null) => {
    if (!workshopId) return "Interno";
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Oficina";
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    const name = product?.name || "Produto";
    return name.length > 25 ? name.substring(0, 25) + "..." : name;
  };

  const getBatchPosition = (batch: Batch) => {
    const cutDate = new Date(batch.cutDate);
    const expectedReturn = batch.expectedReturnDate ? new Date(batch.expectedReturnDate) : cutDate;
    
    const startCol = differenceInDays(cutDate, weekStart);
    const endCol = differenceInDays(expectedReturn, weekStart);
    
    // Check if batch is visible in this week
    if (endCol < 0 || startCol > 6) return null;
    
    // Adjust positions to fit within the week
    const adjustedStartCol = Math.max(0, startCol);
    const adjustedEndCol = Math.min(6, endCol);
    const span = adjustedEndCol - adjustedStartCol + 1;
    
    return {
      gridColumn: `${adjustedStartCol + 1} / span ${span}`,
      visible: true
    };
  };

  const visibleBatches = batches.filter(batch => {
    const position = getBatchPosition(batch);
    return position && position.visible;
  });

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

        {/* Calendar Container with Touch Support */}
        <div 
          ref={containerRef}
          className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-x' }}
        >
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day, index) => (
              <div key={day.toString()} className="bg-slate-50 p-3 text-center rounded-md">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  {dayNames[index]}
                </div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  {format(day, "dd")}
                </div>
              </div>
            ))}
          </div>

          {/* Batch Rows */}
          <div className="space-y-3">
            {visibleBatches.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>Nenhum lote programado para esta semana</p>
              </div>
            ) : (
              visibleBatches.map((batch) => {
                const position = getBatchPosition(batch);
                if (!position) return null;
                
                const workshopColor = getWorkshopColor(batch.workshopId);
                const workshopName = getWorkshopName(batch.workshopId);
                const productName = getProductName(batch.productId);
                
                return (
                  <div key={batch.id} className="grid grid-cols-7 gap-1 min-h-[60px]">
                    <div
                      style={{ 
                        gridColumn: position.gridColumn,
                        backgroundColor: workshopColor 
                      }}
                      onClick={() => onBatchClick(batch)}
                      className="rounded-lg p-3 text-white cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm flex items-center"
                    >
                      <div className="text-sm font-medium truncate">
                        Lote {batch.code} • {workshopName} • <span className="italic opacity-80">{productName} (Qtd: {batch.quantity})</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-4">
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
    </div>
  );
}
