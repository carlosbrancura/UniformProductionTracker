import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Batch, Product, Workshop } from '@shared/schema';

interface OrganizedCalendarProps {
  batches: Batch[];
  products: Product[];
  workshops: Workshop[];
  onBatchClick: (batch: Batch) => void;
  viewType: 'quinzenal' | 'mensal';
}

export default function OrganizedCalendar({ batches, products, workshops, onBatchClick, viewType }: OrganizedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Calculate period based on view type
  const dayOfMonth = currentDate.getDate();
  let periodStart: Date, periodEnd: Date, viewDays: Date[];
  
  if (viewType === 'quinzenal') {
    if (dayOfMonth <= 15) {
      // First quinzena of month (1st to 15th)
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
    } else {
      // Second quinzena of month (16th to end of month)
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), lastDayOfMonth);
    }
  } else {
    // Monthly view - show entire month
    periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), lastDayOfMonth);
  }

  // Generate array of days for the actual period
  viewDays = [];
  for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
    viewDays.push(new Date(d));
  }

  // Sort workshops by schedule order
  const sortedWorkshops = [...workshops].sort((a, b) => (a.scheduleOrder || 1) - (b.scheduleOrder || 1));

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const dayOfMonth = currentDate.getDate();
    
    if (direction === 'next') {
      if (dayOfMonth <= 15) {
        // Move from 1st-15th to 16th-end
        newDate.setDate(16);
      } else {
        // Move to next month, 1st-15th
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setDate(1);
      }
    } else {
      if (dayOfMonth <= 15) {
        // Move to previous month, 16th-end
        newDate.setMonth(newDate.getMonth() - 1);
        newDate.setDate(16);
      } else {
        // Move from 16th-end to 1st-15th
        newDate.setDate(1);
      }
    }
    setCurrentDate(newDate);
  };

  const getBatchPosition = (batch: Batch, viewDaysArray: Date[]) => {
    const cutDate = new Date(batch.cutDate);
    const returnDate = batch.expectedReturnDate ? new Date(batch.expectedReturnDate) : new Date(cutDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const startIndex = viewDaysArray.findIndex(day => 
      day.toDateString() === cutDate.toDateString()
    );
    
    const endIndex = viewDaysArray.findIndex(day => 
      day.toDateString() === returnDate.toDateString()
    );

    if (startIndex === -1) return null;

    const span = endIndex === -1 ? 1 : Math.max(1, endIndex - startIndex + 1);
    
    return {
      gridColumn: `${startIndex + 1} / span ${span}`,
    };
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Touch/Mouse handlers
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

  const handleEnd = () => {
    if (!isDragging) return;
    
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        navigatePeriod('prev');
      } else {
        navigatePeriod('next');
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <Button variant="outline" size="sm" onClick={() => navigatePeriod('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold text-gray-800">
          {formatDate(periodStart)} - {formatDate(periodEnd)}
        </h2>
        
        <Button variant="outline" size="sm" onClick={() => navigatePeriod('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div 
        className="p-4 overflow-auto h-full"
        style={{ transform: `translateX(${dragOffset}px)` }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {/* Day Headers */}
        <div className="grid gap-1 text-center text-sm font-medium text-gray-700 mb-4" style={{ gridTemplateColumns: `repeat(${viewDays.length}, 1fr)` }}>
          {viewDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={index} className="p-2 relative">
                {isToday && (
                  <div className="absolute inset-0 bg-orange-300 bg-opacity-50 rounded"></div>
                )}
                <div className={`font-semibold relative z-10 ${isToday ? 'text-orange-800' : ''}`}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.getDay()]}
                </div>
                <div className={`text-xs relative z-10 ${isToday ? 'text-orange-700' : 'text-gray-500'}`}>
                  {formatDate(day)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workshop Lines - Fixed lines based on schedule order */}
        <div className="space-y-4">
          {sortedWorkshops.map((workshop, workshopIndex) => {
            const workshopBatches = batches.filter(batch => batch.workshopId === workshop.id);
            
            return (
              <div key={workshop.id} className="relative">

                {/* Fixed Batch Grid for this Workshop */}
                <div 
                  className="relative"
                  style={{ 
                    borderBottom: workshopIndex < sortedWorkshops.length - 1 ? '1px dotted #d1d5db' : 'none',
                    paddingBottom: workshopIndex < sortedWorkshops.length - 1 ? '8px' : '0',
                    marginBottom: workshopIndex < sortedWorkshops.length - 1 ? '4px' : '0',
                    minHeight: '58px' // Increased height by 30% (45px * 1.3 ≈ 58px)
                  }}
                >
                  {/* Grid background for reference */}
                  <div 
                    className="grid gap-1"
                    style={{ 
                      gridTemplateColumns: `repeat(${viewDays.length}, 1fr)`,
                      height: '45px'
                    }}
                  >
                    {/* Invisible grid cells for structure */}
                    {Array.from({ length: viewDays.length }).map((_, index) => (
                      <div key={index} className="border-r border-gray-50 last:border-r-0"></div>
                    ))}
                  </div>
                  
                  {/* Absolute positioned batches overlay */}
                  {workshopBatches.map((batch) => {
                    const position = getBatchPosition(batch, viewDays);
                    if (!position) return null;
                    
                    const startCol = parseInt(position.gridColumn.split(' ')[0]);
                    const span = position.gridColumn.includes('span') ? parseInt(position.gridColumn.split('span ')[1]) : 1;
                    const leftPercent = ((startCol - 1) / viewDays.length) * 100;
                    const widthPercent = (span / viewDays.length) * 100;
                    
                    return (
                      <div
                        key={batch.id}
                        className="absolute top-1 rounded-lg p-1 text-white cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm flex items-center h-[52px] border border-white border-opacity-20"
                        style={{ 
                          backgroundColor: workshop.color,
                          opacity: batch.status === 'returned' ? 0.5 : 1,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          margin: '1px'
                        }}
                        onClick={() => onBatchClick(batch)}
                      >
                        <div className="text-xs font-medium truncate w-full flex items-center">
                          {batch.status === 'returned' && (
                            <span className="bg-white text-gray-600 px-1 rounded text-xs mr-1 font-bold">RET</span>
                          )}
                          <span className="truncate">
                            {workshop.name} | LOTE {batch.code} | {batch.productId ? getProductName(batch.productId).substring(0, 15) + (getProductName(batch.productId).length > 15 ? '...' : '') : 'Múltiplos'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}