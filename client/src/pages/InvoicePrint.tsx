import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

export default function InvoicePrint() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all invoice data in one go
  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!id || isNaN(parseInt(id))) {
        setError('ID da fatura inválido');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch invoice
        const invoiceResponse = await fetch(`/api/invoices/${id}`);
        if (!invoiceResponse.ok) {
          throw new Error('Fatura não encontrada');
        }
        const invoice = await invoiceResponse.json();

        // Fetch workshop
        const workshopResponse = await fetch(`/api/workshops/${invoice.workshopId}`);
        const workshop = workshopResponse.ok ? await workshopResponse.json() : null;

        // Fetch invoice batches
        const batchesResponse = await fetch(`/api/invoices/${id}/batches`);
        const invoiceBatches = batchesResponse.ok ? await batchesResponse.json() : [];

        // Fetch products
        const productsResponse = await fetch('/api/products');
        const products = productsResponse.ok ? await productsResponse.json() : [];

        // Fetch batch details for each batch
        const batchDetails = [];
        for (const invoiceBatch of invoiceBatches) {
          try {
            const batchResponse = await fetch(`/api/batches/${invoiceBatch.batchId}`);
            const batchProductsResponse = await fetch(`/api/batch-products/batch/${invoiceBatch.batchId}`);
            
            if (batchResponse.ok && batchProductsResponse.ok) {
              const batch = await batchResponse.json();
              const batchProducts = await batchProductsResponse.json();
              batchDetails.push({ ...batch, products: batchProducts });
            }
          } catch (err) {
            console.error('Erro ao buscar detalhes do lote:', err);
          }
        }

        setInvoiceData({
          invoice,
          workshop,
          batches: batchDetails,
          products
        });

      } catch (err) {
        console.error('Erro ao carregar dados da fatura:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [id]);

  // Auto-print when data is ready
  useEffect(() => {
    if (invoiceData && !isLoading) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [invoiceData, isLoading]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
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
          <p>Carregando fatura...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#e74c3c', fontSize: '16px' }}>
            {error || 'Erro ao carregar fatura'}
          </p>
        </div>
      </div>
    );
  }

  const { invoice, workshop, batches, products } = invoiceData;

  // Helper function to get product abbreviation
  const getProductAbbreviation = (productName: string) => {
    if (!productName) return 'N/A';
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
            {batches.map((batch: any) => {
              return batch.products.map((batchProduct: any) => {
                const product = products.find((p: any) => p.id === batchProduct.productId);
                const productValue = parseFloat(product?.productionValue || '0');
                const quantity = parseInt(batchProduct.quantity?.toString() || '0');
                const lineTotal = productValue * quantity;

                return (
                  <tr key={`${batch.id}-${batchProduct.id}`}>
                    <td>{batch.code}</td>
                    <td>{getProductAbbreviation(product?.name)}</td>
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
            TOTAL: R$ {parseFloat(invoice.totalAmount || '0').toFixed(2)}
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