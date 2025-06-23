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
  const [currentDate, setCurrentDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Show 7 days starting from current week's Sunday
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const viewDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const previousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const previousDay = () => setCurrentDate(addDays(currentDate, -1));
  const nextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Touch/Mouse scroll handlers for smooth daily navigation
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setDragOffset(0);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    setDragOffset(deltaX);
  };

  const handleEnd = (clientX: number) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaX = clientX - startX;
    const dayThreshold = 30; // Smaller threshold for daily navigation
    const weekThreshold = 150; // Larger movement for week navigation
    
    if (Math.abs(deltaX) > weekThreshold) {
      // Large movement = week navigation
      if (deltaX > 0) {
        previousWeek();
      } else {
        nextWeek();
      }
    } else if (Math.abs(deltaX) > dayThreshold) {
      // Small movement = day navigation
      if (deltaX > 0) {
        previousDay();
      } else {
        nextDay();
      }
    }
    
    setDragOffset(0);
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
    // Use actualReturnDate if available, otherwise expectedReturnDate, otherwise default span
    const returnDate = batch.actualReturnDate 
      ? new Date(batch.actualReturnDate)
      : batch.expectedReturnDate
        ? new Date(batch.expectedReturnDate)
        : new Date(cutDate.getTime() + 1 * 24 * 60 * 60 * 1000); // Default 1 day from cut date
    
    // Calculate position relative to the first day in viewDays
    const viewStart = viewDays[0];
    const startCol = differenceInDays(cutDate, viewStart);
    const endCol = differenceInDays(returnDate, viewStart);
    
    // Check if batch is visible in current view (7 days)
    if (endCol < 0 || startCol > 6) return null;
    
    const adjustedStartCol = Math.max(0, startCol);
    const adjustedEndCol = Math.min(6, endCol);
    const span = adjustedEndCol - adjustedStartCol + 1;
    
    if (span <= 0) return null;
    
    return {
      gridColumn: `${adjustedStartCol + 1} / span ${span}`,
      visible: true
    };
  };

  const visibleBatches = batches.filter(batch => {
    // Don't hide returned batches, show all batches for testing
    const cutDate = new Date(batch.cutDate);
    const endDate = batch.actualReturnDate 
      ? new Date(batch.actualReturnDate)
      : batch.expectedReturnDate
        ? new Date(batch.expectedReturnDate)
        : new Date(cutDate.getTime() + 1 * 24 * 60 * 60 * 1000); // Default 1 day span
    
    // Check if batch overlaps with current week view
    const weekStart = viewDays[0];
    const weekEnd = viewDays[6];
    
    return (cutDate <= weekEnd && endDate >= weekStart);
  }).sort((a, b) => {
    // Sort by cut date
    return new Date(a.cutDate).getTime() - new Date(b.cutDate).getTime();
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
              {format(currentDate, "dd/MM/yyyy", { locale: ptBR })} - {format(addDays(currentDate, 6), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Container with Touch Support */}
        <div 
          ref={containerRef}
          className="overflow-hidden cursor-grab active:cursor-grabbing select-none transition-transform duration-200 ease-out"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            touchAction: 'pan-x',
            transform: isDragging ? `translateX(${dragOffset * 0.3}px)` : 'translateX(0px)'
          }}
        >
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {viewDays.map((day, index) => (
              <div key={day.toString()} className="bg-slate-50 p-3 text-center rounded-md">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  {dayNames[index % 7]}
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
                const productName = batch.productId ? getProductName(batch.productId) : "Produto";
                
                return (
                  <div key={batch.id} className="grid grid-cols-7 gap-1 min-h-[54px]">
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
