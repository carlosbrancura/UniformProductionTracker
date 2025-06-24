import React from "react";
import type { Batch, Product, Workshop } from "@shared/schema";

interface BatchPrintLayoutProps {
  batch: any; // Will receive the full batch data with products
  products: Product[];
  workshops: Workshop[];
}

export default function BatchPrintLayout({ batch, products, workshops }: BatchPrintLayoutProps) {
  const workshop = workshops.find(w => w.id === batch.workshopId);
  const workshopName = workshop?.name || "Produção Interna";

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando';
      case 'internal_production': return 'Em produção';
      case 'external_workshop': return 'Em produção';
      case 'returned': return 'Retornado';
      default: return 'Em produção';
    }
  };

  return (
    <div className="print-layout bg-white text-black min-h-screen">
      <style>{`
        @media print {
          .print-layout {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          * { box-sizing: border-box; }
          .page-break { page-break-before: always; }
        }
        .batch-header {
          background-color: black !important;
          color: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .separator-line {
          border-bottom: 2px solid black !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      {/* Primeira Via - Oficina */}
      <div className="p-6 min-h-[48vh]">
        {/* Header */}
        <div className="flex items-start gap-6 mb-6">
          {/* Lote Box */}
          <div className="batch-header text-white p-4 font-bold text-2xl min-w-[120px] text-center">
            LOTE {batch.code}
          </div>
          
          {/* Workshop and Dates */}
          <div className="flex-1">
            <div className="text-xl font-bold mb-2">
              Oficina: {workshopName}
            </div>
            <div className="text-base">
              Data Corte: {formatDate(batch.cutDate)} - Entrega Prevista: {batch.expectedReturnDate ? formatDate(batch.expectedReturnDate) : 'Não definida'}
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-8">
          <div className="text-lg font-bold mb-3 separator-line pb-1">Produtos</div>
          <div className="space-y-2">
            {batch.products?.map((product: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-base">
                <span className="flex-1">{product.name}</span>
                <span className="w-20 text-center">Quant: <strong>{product.quantity}</strong></span>
                <span className="w-20 text-center">Cor: <strong>{product.color}</strong></span>
                <span className="w-16 text-center">Tam: <strong>{product.sizes}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <div className="flex justify-between items-center text-sm separator-line pt-2">
            <div>Status: {getStatusText(batch.status)}</div>
            <div>1ª via Oficina</div>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <div>Data de Impressão: {formatDate(new Date())}</div>
            <div>Sistema de Controle de Produção</div>
          </div>
        </div>
      </div>

      {/* Linha divisória */}
      <div className="separator-line w-full"></div>

      {/* Segunda Via - Produção */}
      <div className="p-6 min-h-[48vh]">
        {/* Header */}
        <div className="flex items-start gap-6 mb-6">
          {/* Lote Box */}
          <div className="batch-header text-white p-4 font-bold text-2xl min-w-[120px] text-center">
            LOTE {batch.code}
          </div>
          
          {/* Workshop and Dates */}
          <div className="flex-1">
            <div className="text-xl font-bold mb-2">
              Oficina: {workshopName}
            </div>
            <div className="text-base">
              Data Corte: {formatDate(batch.cutDate)} - Entrega Prevista: {batch.expectedReturnDate ? formatDate(batch.expectedReturnDate) : 'Não definida'}
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-8">
          <div className="text-lg font-bold mb-3 separator-line pb-1">Produtos</div>
          <div className="space-y-2">
            {batch.products?.map((product: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-base">
                <span className="flex-1">{product.name}</span>
                <span className="w-20 text-center">Quant: <strong>{product.quantity}</strong></span>
                <span className="w-20 text-center">Cor: <strong>{product.color}</strong></span>
                <span className="w-16 text-center">Tam: <strong>{product.sizes}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <div className="flex justify-between items-center text-sm separator-line pt-2">
            <div>Status: {getStatusText(batch.status)}</div>
            <div>2ª via Produção</div>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <div>Data de Impressão: {formatDate(new Date())}</div>
            <div>Sistema de Controle de Produção</div>
          </div>
        </div>
      </div>
    </div>
  );
}