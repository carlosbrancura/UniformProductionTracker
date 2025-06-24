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
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 14 : -14));
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
                {/* Workshop Color Indicator Only */}
                <div className="flex items-center mb-2">
                  <div 
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: workshop.color }}
                  />
                </div>

                {/* Fixed Batch Grid for this Workshop */}
                <div 
                  className="grid gap-1 relative"
                  style={{ 
                    gridTemplateColumns: 'repeat(14, 1fr)',
                    borderBottom: workshopIndex < sortedWorkshops.length - 1 ? '1px dotted #d1d5db' : 'none',
                    paddingBottom: workshopIndex < sortedWorkshops.length - 1 ? '16px' : '0',
                    minHeight: '60px' // Fixed height even if no batches
                  }}
                >
                  {workshopBatches.map((batch) => {
                    const position = getBatchPosition(batch);
                    if (!position) return null;

                    const productName = getProductName(batch.productId);
                    
                    return (
                      <div
                        key={batch.id}
                        style={{ 
                          gridColumn: position.gridColumn,
                          backgroundColor: workshop.color,
                          opacity: batch.status === 'returned' ? 0.5 : 1
                        }}
                        onClick={() => onBatchClick(batch)}
                        className="rounded-lg p-2 text-white cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm flex items-center min-h-[50px]"
                      >
                        <div className="text-xs font-medium truncate">
                          {batch.status === 'returned' && (
                            <span className="bg-white text-gray-600 px-1 rounded text-xs mr-1 font-bold">RETORNADO</span>
                          )}
                          Lote {batch.code} • <span className="italic opacity-80">{productName} (Qtd: {batch.quantity})</span>
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