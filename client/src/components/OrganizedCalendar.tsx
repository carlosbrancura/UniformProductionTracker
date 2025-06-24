import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Batch, Product, Workshop } from '@shared/schema';

interface OrganizedCalendarProps {
  batches: Batch[];
  products: Product[];
  workshops: Workshop[];
  onBatchClick: (batch: Batch) => void;
}

export default function OrganizedCalendar({ batches, products, workshops, onBatchClick }: OrganizedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Calculate biweekly period
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const periodStart = getWeekStart(currentDate);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 13); // 14 days total

  const viewDays: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const day = new Date(periodStart);
    day.setDate(periodStart.getDate() + i);
    viewDays.push(day);
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

  const getBatchPosition = (batch: Batch) => {
    const cutDate = new Date(batch.cutDate);
    const returnDate = batch.expectedReturnDate ? new Date(batch.expectedReturnDate) : new Date(cutDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const startIndex = viewDays.findIndex(day => 
      day.toDateString() === cutDate.toDateString()
    );
    
    const endIndex = viewDays.findIndex(day => 
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
        <div className="grid gap-1 text-center text-sm font-medium text-gray-700 mb-4" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
          {viewDays.map((day, index) => (
            <div key={index} className="p-2">
              <div className="font-semibold">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.getDay()]}</div>
              <div className="text-xs text-gray-500">{formatDate(day)}</div>
            </div>
          ))}
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
                    marginBottom: workshopIndex < sortedWorkshops.length - 1 ? '8px' : '0',
                    minHeight: '45px' // Reduced height for more workshops on screen
                  }}
                >
                  {/* Grid background for reference */}
                  <div 
                    className="grid gap-1"
                    style={{ 
                      gridTemplateColumns: 'repeat(14, 1fr)',
                      height: '45px'
                    }}
                  >
                    {/* Invisible grid cells for structure */}
                    {Array.from({ length: 14 }).map((_, index) => (
                      <div key={index} className="border-r border-gray-50 last:border-r-0"></div>
                    ))}
                  </div>
                  
                  {/* Absolute positioned batches overlay */}
                  {workshopBatches.map((batch) => {
                    const position = getBatchPosition(batch);
                    if (!position) return null;
                    
                    const startCol = parseInt(position.gridColumn.split(' ')[0]);
                    const span = position.gridColumn.includes('span') ? parseInt(position.gridColumn.split('span ')[1]) : 1;
                    const leftPercent = ((startCol - 1) / 14) * 100;
                    const widthPercent = (span / 14) * 100;
                    
                    return (
                      <div
                        key={batch.id}
                        className="absolute top-1 rounded-lg p-1 text-white cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm flex items-center h-[40px] border border-white border-opacity-20"
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
                            Lote {batch.code} | {workshop.name} | {batch.productId ? getProductName(batch.productId).substring(0, 15) + (getProductName(batch.productId).length > 15 ? '...' : '') : 'Múltiplos'}
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