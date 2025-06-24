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
    <div className="w-full h-1/2 p-6 border-b-2 border-gray-400 print:border-black">
      {/* Header Section */}
      <div className="flex items-start gap-6 mb-6">
        {/* Batch Code Box */}
        <div className="batch-code bg-blue-600 text-white p-6 rounded-lg font-bold text-3xl min-w-[150px] text-center shadow-lg">
          Lote {batch.code}
        </div>
        
        {/* Workshop and Dates */}
        <div className="flex-1">
          <div className="workshop-title text-2xl font-bold mb-3 text-gray-800">
            Oficina: {getWorkshopName(batch.workshopId)}
          </div>
          <div className="date-info flex gap-8 text-lg font-medium">
            <span>Data Corte: {formatDate(batch.cutDate)}</span>
            {batch.expectedReturnDate && (
              <span>Data Prevista Retorno: {formatDate(batch.expectedReturnDate)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="mb-12">
        <h3 className="font-bold mb-8 text-4xl text-gray-800">Produtos:</h3>
        <div className="space-y-6">
          {batch.products?.map((batchProduct: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-4 border-b-4 border-gray-300">
              <span className="product-name font-bold text-3xl">{getProductName(batchProduct.productId)}</span>
              <div className="product-details flex gap-12 text-2xl font-medium">
                <span>Qtd: {batchProduct.quantity}</span>
                <span>Cor: {batchProduct.selectedColor}</span>
                <span>Tamanho: {batchProduct.selectedSize}</span>
              </div>
            </div>
          )) || (
            <div className="text-gray-500 italic text-3xl">Nenhum produto especificado</div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-6 text-2xl">
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
        
        <div className="mt-12 pt-6 border-t-4 border-gray-300">
          <div className="flex justify-between text-xl text-gray-600 font-medium">
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
            font-size: 20px !important;
            width: 2480px !important;
            height: 3508px !important;
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
            margin: 0;
            padding: 0;
          }
          .print-only .batch-code {
            font-size: 60px !important;
            background-color: black !important;
            color: white !important;
            padding: 48px !important;
          }
          .print-only .workshop-title {
            font-size: 40px !important;
          }
          .print-only .date-info {
            font-size: 24px !important;
          }
          .print-only .product-name {
            font-size: 24px !important;
          }
          .print-only .product-details {
            font-size: 20px !important;
          }
          .print-only h3 {
            font-size: 30px !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
      
      {/* Via 1 Oficina */}
      <SingleCopy copyLabel="Via 1 Oficina" />
      
      {/* Via 2 Produção */}
      <SingleCopy copyLabel="Via 2 Produção" />
    </div>
  );
}