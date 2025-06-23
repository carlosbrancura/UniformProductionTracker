import React from "react";
import type { Batch, Product, Workshop } from "@shared/schema";

interface BatchPrintLayoutProps {
  batch: any; // Will receive the full batch data with products
  products: Product[];
  workshops: Workshop[];
}

export default function BatchPrintLayout({ batch, products, workshops }: BatchPrintLayoutProps) {
  const getWorkshopName = (workshopId: number | null) => {
    if (!workshopId) return "Produção Interna";
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Oficina";
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto";
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const SingleCopy = () => (
    <div className="w-full h-1/2 p-4 border-b border-gray-300 print:border-black">
      {/* Header Section */}
      <div className="flex items-start gap-4 mb-4">
        {/* Batch Code Box */}
        <div className="bg-blue-600 text-white p-3 rounded-lg font-bold text-lg min-w-[100px] text-center">
          Lote {batch.code}
        </div>
        
        {/* Workshop and Dates */}
        <div className="flex-1">
          <div className="text-lg font-semibold mb-1">
            Oficina: {getWorkshopName(batch.workshopId)}
          </div>
          <div className="flex gap-6 text-sm">
            <span>Data Corte: {formatDate(batch.cutDate)}</span>
            {batch.expectedReturnDate && (
              <span>Data Prevista Retorno: {formatDate(batch.expectedReturnDate)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2 text-gray-800">Produtos:</h3>
        <div className="space-y-2">
          {batch.products?.map((batchProduct: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-1 border-b border-gray-200">
              <span className="font-medium">{getProductName(batchProduct.productId)}</span>
              <div className="flex gap-4 text-sm">
                <span>Qtd: {batchProduct.quantity}</span>
                <span>Cor: {batchProduct.selectedColor}</span>
                <span>Tamanho: {batchProduct.selectedSize}</span>
              </div>
            </div>
          )) || (
            <div className="text-gray-500 italic">Nenhum produto especificado</div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-2 text-sm">
        <div>
          <strong>Status:</strong> {batch.status === 'cut' ? 'Cortado' : 
                                  batch.status === 'in_production' ? 'Em Produção' : 
                                  batch.status === 'ready' ? 'Pronto' : 'Retornado'}
        </div>
        
        {batch.observations && (
          <div>
            <strong>Observações:</strong> {batch.observations}
          </div>
        )}
        
        <div className="mt-4 pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Data de Impressão: {new Date().toLocaleDateString('pt-BR')}</span>
            <span>Sistema de Controle de Produção</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="print-only w-full h-full bg-white">
      <style>{`
        @media print {
          .print-only {
            display: block !important;
          }
          body * {
            visibility: hidden;
          }
          .print-only, .print-only * {
            visibility: visible;
          }
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: 100% !important;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
      
      {/* First Copy */}
      <SingleCopy />
      
      {/* Second Copy */}
      <SingleCopy />
    </div>
  );
}