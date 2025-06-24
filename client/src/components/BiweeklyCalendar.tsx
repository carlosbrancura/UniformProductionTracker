import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, addDays, addMonths, subMonths, differenceInDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Batch, Product, Workshop } from "@shared/schema";

interface BiweeklyCalendarProps {
  batches: Batch[];
  products: Product[];
  workshops: Workshop[];
  onBatchClick: (batch: Batch) => void;
}

export default function BiweeklyCalendar({ batches, products, workshops, onBatchClick }: BiweeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"biweekly" | "monthly">("biweekly");
  
  // Automatically detect which half of the month we're in
  const today = new Date();
  const todayDay = today.getDate();
  const [isFirstHalf, setIsFirstHalf] = useState(todayDay <= 15);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Determine current period based on view mode
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const midMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
  
  let periodStart: Date, periodEnd: Date, periodLength: number, viewDays: Date[];
  
  if (viewMode === "monthly") {
    periodStart = monthStart;
    periodEnd = monthEnd;
    periodLength = differenceInDays(periodEnd, periodStart) + 1;
    viewDays = Array.from({ length: periodLength }, (_, i) => addDays(periodStart, i));
  } else {
    periodStart = isFirstHalf ? monthStart : addDays(midMonth, 1);
    periodEnd = isFirstHalf ? midMonth : monthEnd;
    periodLength = differenceInDays(periodEnd, periodStart) + 1;
    viewDays = Array.from({ length: periodLength }, (_, i) => addDays(periodStart, i));
  }

  const previousPeriod = () => {
    if (viewMode === "monthly") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      if (isFirstHalf) {
        setCurrentDate(subMonths(currentDate, 1));
        setIsFirstHalf(false);
      } else {
        setIsFirstHalf(true);
      }
    }
  };
  
  const nextPeriod = () => {
    if (viewMode === "monthly") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      if (isFirstHalf) {
        setIsFirstHalf(false);
      } else {
        setCurrentDate(addMonths(currentDate, 1));
        setIsFirstHalf(true);
      }
    }
  };

  // Touch/Mouse scroll handlers for period navigation
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
    
    const deltaX = clientX - startX;
    const threshold = 50;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        previousPeriod();
      } else {
        nextPeriod();
      }
    }
    
    setIsDragging(false);
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
    // Use actualReturnDate if returned, otherwise expectedReturnDate for planning
    const returnDate = batch.status === 'returned' && batch.actualReturnDate
      ? new Date(batch.actualReturnDate)
      : batch.expectedReturnDate
        ? new Date(batch.expectedReturnDate)
        : new Date(cutDate.getTime() + 1 * 24 * 60 * 60 * 1000); // Default 1 day from cut date
    
    // Calculate position relative to the first day in viewDays
    const viewStart = viewDays[0];
    const startCol = differenceInDays(cutDate, viewStart);
    const endCol = differenceInDays(returnDate, viewStart);
    
    // Check if batch is visible in current view
    if (endCol < 0 || startCol >= periodLength) {
      return null;
    }
    
    const adjustedStartCol = Math.max(0, startCol);
    const adjustedEndCol = Math.min(periodLength - 1, endCol);
    const span = adjustedEndCol - adjustedStartCol + 1;
    
    if (span <= 0) return null;
    
    return {
      gridColumn: `${adjustedStartCol + 1} / span ${span}`,
      visible: true
    };
  };

  const visibleBatches = batches.filter(batch => {
    // Show all batches, including returned ones
    
    const cutDate = new Date(batch.cutDate);
    const endDate = batch.expectedReturnDate
      ? new Date(batch.expectedReturnDate)
      : new Date(cutDate.getTime() + 1 * 24 * 60 * 60 * 1000); // Default 1 day span
    
    // Check if batch overlaps with current period view
    const periodStart = viewDays[0];
    const periodEnd = viewDays[viewDays.length - 1];
    
    const overlaps = (cutDate <= periodEnd && endDate >= periodStart);
    
    return overlaps;
  });

  // Group batches by workshop for same-line display
  const batchesByWorkshop = visibleBatches.reduce((acc, batch) => {
    const workshopId = batch.workshopId || 0; // Use 0 for internal production
    if (!acc[workshopId]) {
      acc[workshopId] = [];
    }
    acc[workshopId].push(batch);
    return acc;
  }, {} as Record<number, Batch[]>);

  // Sort batches within each workshop by cut date
  Object.keys(batchesByWorkshop).forEach(workshopId => {
    batchesByWorkshop[parseInt(workshopId)].sort((a, b) => {
      return new Date(a.cutDate).getTime() - new Date(b.cutDate).getTime();
    });
  });

  const getPeriodTitle = () => {
    const monthName = format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "monthly") {
      return monthName;
    } else {
      const period = isFirstHalf ? "1ª Quinzena" : "2ª Quinzena";
      return `${period} - ${monthName}`;
    }
  };

  return (
    <div className="w-full h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={previousPeriod}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold text-slate-800">
            {getPeriodTitle()}
          </h2>
          
          <Button
            variant="outline"
            size="icon"
            onClick={nextPeriod}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: "biweekly" | "monthly") => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="biweekly">Quinzenal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        className="p-4 h-full overflow-hidden"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Day Headers */}
        <div className={`grid gap-1 mb-2`} style={{ gridTemplateColumns: `repeat(${periodLength}, 1fr)` }}>
          {viewDays.map((day, index) => {
            const isToday = isSameDay(day, today);
            return (
              <div 
                key={index} 
                className={`text-center py-2 text-sm font-medium rounded ${
                  isToday 
                    ? "bg-orange-500 text-white" 
                    : "text-slate-600 bg-slate-50"
                }`}
              >
                <div>{format(day, "dd", { locale: ptBR })}</div>
                <div className="text-xs">{format(day, "EEE", { locale: ptBR })}</div>
              </div>
            );
          })}
        </div>



        {/* Batch Bars - Grouped by Workshop */}
        <div className="relative space-y-1 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
          {Object.keys(batchesByWorkshop).length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500">
              Nenhum lote neste período
            </div>
          ) : (
            Object.entries(batchesByWorkshop).map(([workshopId, workshopBatches]) => {
              const id = parseInt(workshopId);
              const workshopColor = getWorkshopColor(id === 0 ? null : id);
              const workshopName = getWorkshopName(id === 0 ? null : id);
              
              return (
                <div key={workshopId} className={`grid gap-1 min-h-[40px] relative z-10`} style={{ gridTemplateColumns: `repeat(${periodLength}, 1fr)` }}>
                  {workshopBatches.map((batch) => {
                    const position = getBatchPosition(batch);
                    if (!position) return null;
                    
                    const productName = batch.productId ? getProductName(batch.productId) : "Produto";
                    
                    return (
                      <div
                        key={batch.id}
                        style={{ 
                          gridColumn: position.gridColumn,
                          backgroundColor: workshopColor,
                          opacity: batch.status === 'returned' ? 0.5 : 1
                        }}
                        onClick={() => onBatchClick(batch)}
                        className="rounded-lg p-2 text-white cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm flex items-center"
                      >
                        <div className="text-xs font-medium truncate">
                          {batch.status === 'returned' && (
                            <span className="bg-white text-gray-600 px-1 rounded text-xs mr-1 font-bold">RETORNADO</span>
                          )}
                          Lote {batch.code} • {workshopName} • <span className="italic opacity-80">{productName} (Qtd: {batch.quantity})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-800 rounded"></div>
              <span className="text-slate-600">Produção Interna</span>
            </div>
            {workshops.map((workshop) => (
              <div key={workshop.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: workshop.color }}
                ></div>
                <span className="text-slate-600">{workshop.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}