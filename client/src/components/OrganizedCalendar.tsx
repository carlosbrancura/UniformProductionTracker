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
                {/* Workshop Label */}
                <div className="flex items-center mb-2">
                  <div 
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: workshop.color }}
                  />
                  <span className="font-medium text-sm text-gray-700 mr-2">{workshop.name}</span>
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