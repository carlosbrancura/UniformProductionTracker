import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Camera, Edit, Trash2, CheckCircle, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SimpleBatchEdit from "./SimpleBatchEdit";
import BatchPrintLayout from "./BatchPrintLayout";
import type { Batch, Product, Workshop, BatchHistory, User } from "@shared/schema";

interface BatchModalProps {
  batch: Batch;
  products: Product[];
  workshops: Workshop[];
  onClose: () => void;
}

export default function BatchModal({ batch, products, workshops, onClose }: BatchModalProps) {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Query to get batch products for display only
  const { data: batchProducts = [] } = useQuery({
    queryKey: ['/api/batch-products', batch.id],
    queryFn: async () => {
      const response = await fetch(`/api/batch-products/${batch.id}`);
      return response.json();
    },
  });

  const { data: history = [] } = useQuery<BatchHistory[]>({
    queryKey: ["/api/batches", batch.id, "history"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`/api/batches/${batch.id}/image`, {
        method: "POST",
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Imagem enviada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setImageFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markReturnedMutation = useMutation({
    mutationFn: async () => {
      const newStatus = batch.status === "returned" ? "waiting" : "returned";
      const response = await fetch(`/api/batches/${batch.id}/simple`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update batch status: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      const message = batch.status === "returned" ? "Status anterior restaurado!" : "Lote marcado como retornado!";
      toast({ title: message });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao marcar como retornado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete batch: ${response.statusText}`);
      }
      return response;
    },
    onSuccess: () => {
      toast({ title: "Lote excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir lote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = () => {
    if (imageFile) {
      uploadImageMutation.mutate(imageFile);
    }
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate();
    }
  };

  const handlePrint = () => {
    // Open a new window with just the print layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Get workshop info for print
    const workshopInfo = workshops.find(w => w.id === batch.workshopId);
    const workshopName = workshopInfo?.name || 'Produção Interna';
    
    // Create the print content using our BatchPrintLayout component
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lote ${batch.code} - Impressão</title>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .batch-header {
              background-color: black !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .separator-line {
              border-bottom: 1px dotted black !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              body { margin: 0; padding: 0; }
              * { box-sizing: border-box; }
            }
          </style>
        </head>
        <body>
          <!-- Primeira Via - Oficina -->
          <div style="padding: 24px; min-height: 48vh;">
            <!-- Header -->
            <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
              <!-- Lote Box -->
              <div class="batch-header" style="color: white; padding: 16px; font-weight: bold; font-size: 24px; min-width: 120px; text-align: center;">
                LOTE ${batch.code}
              </div>
              
              <!-- Workshop and Dates -->
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                  Oficina: ${workshopName}
                </div>
                <div style="font-size: 14px;">
                  Data Corte: ${new Date(batch.cutDate).toLocaleDateString('pt-BR')} - Entrega Prevista: ${batch.expectedReturnDate ? new Date(batch.expectedReturnDate).toLocaleDateString('pt-BR') : 'Não definida'}
                </div>
              </div>
            </div>

            <!-- Products Section -->
            <div style="margin-bottom: 32px;">
              <div class="separator-line" style="font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 4px;">Produtos</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${batchProducts.map((bp: any) => {
                  const product = products.find(p => p.id === bp.productId);
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
                      <span style="flex: 1;">${product?.name || 'Produto'}</span>
                      <span style="width: 80px; text-align: center;">Quant: <strong>${bp.quantity}</strong></span>
                      <span style="width: 80px; text-align: center;">Cor: <strong>${bp.color}</strong></span>
                      <span style="width: 64px; text-align: center;">Tam: <strong>${bp.sizes}</strong></span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: auto;">
              <div class="separator-line" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-top: 8px;">
                <div>Status: ${batch.status === 'waiting' ? 'Aguardando' :
                           batch.status === 'internal_production' ? 'Em produção' :
                           batch.status === 'external_workshop' ? 'Em produção' :
                           batch.status === 'returned' ? 'Retornado' : 'Em produção'}</div>
                <div>1ª via Oficina</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px;">
                <div>Data de Impressão: ${new Date().toLocaleDateString('pt-BR')}</div>
                <div>Sistema de Controle de Produção</div>
              </div>
            </div>
          </div>

          <!-- Linha divisória -->
          <div class="separator-line" style="width: 100%;"></div>

          <!-- Segunda Via - Produção -->
          <div style="padding: 24px; min-height: 48vh;">
            <!-- Header -->
            <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
              <!-- Lote Box -->
              <div class="batch-header" style="color: white; padding: 16px; font-weight: bold; font-size: 24px; min-width: 120px; text-align: center;">
                LOTE ${batch.code}
              </div>
              
              <!-- Workshop and Dates -->
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                  Oficina: ${workshopName}
                </div>
                <div style="font-size: 16px;">
                  Data Corte: ${new Date(batch.cutDate).toLocaleDateString('pt-BR')} - Entrega Prevista: ${batch.expectedReturnDate ? new Date(batch.expectedReturnDate).toLocaleDateString('pt-BR') : 'Não definida'}
                </div>
              </div>
            </div>

            <!-- Products Section -->
            <div style="margin-bottom: 32px;">
              <div class="separator-line" style="font-size: 18px; font-weight: bold; margin-bottom: 12px; padding-bottom: 4px;">Produtos</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${batchProducts.map((bp: any) => {
                  const product = products.find(p => p.id === bp.productId);
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
                      <span style="flex: 1;">${product?.name || 'Produto'}</span>
                      <span style="width: 80px; text-align: center;">Quant: <strong>${bp.quantity}</strong></span>
                      <span style="width: 80px; text-align: center;">Cor: <strong>${bp.color}</strong></span>
                      <span style="width: 64px; text-align: center;">Tam: <strong>${bp.sizes}</strong></span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: auto;">
              <div class="separator-line" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-top: 8px;">
                <div>Status: ${batch.status === 'waiting' ? 'Aguardando' :
                           batch.status === 'internal_production' ? 'Em produção' :
                           batch.status === 'external_workshop' ? 'Em produção' :
                           batch.status === 'returned' ? 'Retornado' : 'Em produção'}</div>
                <div>2ª via Produção</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px;">
                <div>Data de Impressão: ${new Date().toLocaleDateString('pt-BR')}</div>
                <div>Sistema de Controle de Produção</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "internal_production":
      case "in_production":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "external_workshop":
      case "at_workshop":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "returned":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "waiting":
        return "Aguardando";
      case "internal_production":
      case "in_production":
        return "Em Produção";
      case "external_workshop":
      case "at_workshop":
        return "Na Oficina";
      case "returned":
        return "Retornado";
      default:
        return status;
    }
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.username || "Usuário";
  };

  if (showEdit) {
    return (
      <SimpleBatchEdit
        batch={batch}
        workshops={workshops}
        onClose={() => {
          setShowEdit(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Lote {batch.code}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {batch.status !== "returned" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markReturnedMutation.mutate()}
                  className="text-green-600 hover:text-green-700"
                  disabled={markReturnedMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {markReturnedMutation.isPending ? "Marcando..." : "Retornado"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEdit(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-blue-600 hover:text-blue-700"
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>

            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Detalhes do Lote</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Data de Corte:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {format(new Date(batch.cutDate), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Status:</span>
                  <Badge className={getStatusColor(batch.status)}>
                    {getStatusLabel(batch.status)}
                  </Badge>
                </div>
                {batch.workshopId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Oficina:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {workshop?.name || "N/A"}
                      </span>
                      {workshop?.phone && (
                        <a 
                          href={`https://wa.me/55${workshop.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                          title={`WhatsApp ${workshop.name}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.108"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {batch.expectedReturnDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Previsão de Retorno:</span>
                    <span className="text-sm font-medium text-slate-900">
                      {format(new Date(batch.expectedReturnDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {batch.actualReturnDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Data de Retorno:</span>
                    <span className="text-sm font-medium text-green-700">
                      {format(new Date(batch.actualReturnDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {batch.observations && (
                  <div>
                    <span className="text-sm text-slate-600">Observações:</span>
                    <p className="text-sm text-slate-900 mt-1">{batch.observations}</p>
                  </div>
                )}
              </div>

              {/* Products List - Read Only */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-slate-900 mb-3">Produtos</h4>
                <div className="space-y-2">
                  {batchProducts.map((bp: any, index: number) => {
                    const product = products.find(p => p.id === bp.productId);
                    return (
                      <div key={index} className="p-3 bg-slate-50 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{product?.name} - {product?.code}</p>
                            <p className="text-xs text-slate-600">
                              Qtd: {bp.quantity} | Cor: {bp.selectedColor} | Tamanho: {bp.selectedSize}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Foto do Lote</h3>
              {batch.imageUrl ? (
                <img
                  src={batch.imageUrl}
                  alt={`Lote ${batch.code}`}
                  className="w-full h-48 object-cover rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-full h-48 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                  <span className="text-slate-500">Nenhuma imagem</span>
                </div>
              )}
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Camera className="mr-1 h-4 w-4" />
                  Selecionar Foto
                </label>
                {imageFile && (
                  <Button
                    size="sm"
                    onClick={handleImageUpload}
                    disabled={uploadImageMutation.isPending}
                  >
                    {uploadImageMutation.isPending ? "Enviando..." : "Enviar Foto"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* History Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Histórico</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              >
                {isHistoryExpanded ? "Ocultar" : "Mostrar"} Histórico
              </Button>
            </div>
            
            {isHistoryExpanded && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history && history.length > 0 ? (
                  history.map((entry) => (
                    <div key={entry.id} className="p-3 bg-slate-50 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{entry.action}</p>
                          {entry.notes && (
                            <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            {entry.timestamp && format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {getUserName(entry.userId)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Nenhum histórico disponível</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Hidden Print Layout */}
      <BatchPrintLayout 
        batch={{
          ...batch,
          products: batchProducts
        }} 
        products={products} 
        workshops={workshops} 
      />
    </Dialog>
  );
}