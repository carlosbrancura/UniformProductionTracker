import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';

export default function InvoicePrint() {
  const { id } = useParams();
  const invoiceId = parseInt(id || '0');
  
  // Fetch invoice data
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !!invoiceId && !isNaN(invoiceId)
  });

  // Fetch invoice batches
  const { data: invoiceBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['/api/invoices', invoiceId, 'batches'],
    enabled: !!invoiceId && !isNaN(invoiceId)
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['/api/products']
  });

  // Fetch workshop
  const { data: workshop } = useQuery({
    queryKey: ['/api/workshops', invoice?.workshopId],
    enabled: !!invoice?.workshopId
  });

  // Fetch batch details and products for each batch
  const batchIds = invoiceBatches?.length ? invoiceBatches.map((ib: any) => ib.batchId) : [];
  
  const batchQueries = batchIds.map((batchId: number) => 
    useQuery({
      queryKey: ['/api/batches', batchId],
      enabled: batchIds.length > 0 && !isNaN(batchId)
    })
  );

  const batchProductQueries = batchIds.map((batchId: number) => 
    useQuery({
      queryKey: ['/api/batch-products/batch', batchId],
      enabled: batchIds.length > 0 && !isNaN(batchId)
    })
  );

  // Auto-print when page loads
  useEffect(() => {
    if (!invoiceLoading && !batchesLoading && invoice) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [invoiceLoading, batchesLoading, invoice]);

  if (invoiceLoading || batchesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #3498db', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Carregando dados da fatura...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#e74c3c' }}>Fatura não encontrada</p>
        </div>
      </div>
    );
  }

  // Combine batch data with products
  const batchesWithProducts = batchIds.map((batchId: number, index: number) => {
    const batchData = batchQueries[index]?.data;
    const batchProducts = batchProductQueries[index]?.data || [];
    return {
      ...batchData,
      products: batchProducts
    };
  }).filter(batch => batch && batch.id);

  // Helper function to get product abbreviation
  const getProductAbbreviation = (productName: string) => {
    const words = productName.split(' ');
    if (words.length >= 2) {
      return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
    }
    return productName.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          .print-container { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 15px !important; 
            font-size: 10px !important;
            max-width: none !important;
          }
          .no-print { display: none !important; }
        }
        body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: Arial, sans-serif;
        }
        .print-container {
          width: 100%;
          margin: 0;
          padding: 15px;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          background: white;
          min-height: 100vh;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .invoice-title {
          font-size: 16px;
          font-weight: bold;
          margin: 8px 0;
        }
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .section {
          border: 1px solid #ddd;
          padding: 8px;
          border-radius: 3px;
        }
        .section-title {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 6px;
          color: #333;
        }
        .info-row {
          margin-bottom: 3px;
          font-size: 10px;
        }
        .label {
          font-weight: bold;
          display: inline-block;
          min-width: 50px;
        }
        .batches-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 9px;
        }
        .batches-table th,
        .batches-table td {
          border: 1px solid #ddd;
          padding: 4px;
          text-align: left;
        }
        .batches-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          font-size: 10px;
        }
        .total-section {
          text-align: right;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 2px solid #000;
        }
        .total-amount {
          font-size: 14px;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 8px;
          color: #666;
        }
      `}</style>

      <div className="print-container">
        {/* Invoice Header */}
        <div className="header">
          <div className="company-name">EMPRESA CONFECÇÕES</div>
          <div className="invoice-title">FATURA DE SERVIÇOS</div>
          <div>Fatura Nº: {invoice.invoiceNumber}</div>
        </div>

        {/* Invoice and Workshop Details */}
        <div className="invoice-details">
          <div className="section">
            <div className="section-title">Dados da Fatura</div>
            <div className="info-row">
              <span className="label">Emissão:</span>
              {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            <div className="info-row">
              <span className="label">Vencto:</span>
              {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            <div className="info-row">
              <span className="label">Status:</span>
              {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
            </div>
          </div>

          <div className="section">
            <div className="section-title">Oficina</div>
            <div className="info-row">
              <span className="label">Nome:</span>
              {workshop?.name || 'N/A'}
            </div>
            <div className="info-row">
              <span className="label">Resp:</span>
              {workshop?.manager || 'N/A'}
            </div>
            <div className="info-row">
              <span className="label">Tel:</span>
              {workshop?.phone || 'N/A'}
            </div>
          </div>
        </div>

        {/* Batches Table */}
        <table className="batches-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Prod</th>
              <th>Cor</th>
              <th>Tam</th>
              <th>Qtd</th>
              <th>Unit</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {batchesWithProducts.map((batch: any) => {
              return batch.products.map((batchProduct: any) => {
                const product = products?.find((p: any) => p.id === batchProduct.productId);
                const productValue = parseFloat(product?.productionValue || '0');
                const quantity = parseInt(batchProduct.quantity);
                const lineTotal = productValue * quantity;

                return (
                  <tr key={`${batch.id}-${batchProduct.id}`}>
                    <td>{batch.code}</td>
                    <td>{getProductAbbreviation(product?.name || 'N/A')}</td>
                    <td>{batchProduct.selectedColor || '-'}</td>
                    <td>{batchProduct.selectedSize || '-'}</td>
                    <td>{quantity}</td>
                    <td>R$ {productValue.toFixed(2)}</td>
                    <td>R$ {lineTotal.toFixed(2)}</td>
                  </tr>
                );
              });
            }).flat()}
          </tbody>
        </table>

        {/* Total Section */}
        <div className="total-section">
          <div className="total-amount">
            TOTAL: R$ {parseFloat(invoice.totalAmount).toFixed(2)}
          </div>
        </div>

        {/* Status and Notes */}
        <div className="section" style={{ marginTop: '15px' }}>
          <div className="section-title">Informações</div>
          <div className="info-row">
            <span className="label">Status:</span>
            {invoice.status === 'paid' ? 'PAGO' : 'PENDENTE'}
          </div>
          {invoice.notes && (
            <div className="info-row">
              <span className="label">Obs:</span>
              {invoice.notes}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <p>Fatura gerada automaticamente - {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
        </div>
      </div>
    </>
  );
}