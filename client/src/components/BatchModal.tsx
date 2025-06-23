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
                    <span className="text-sm font-medium text-slate-900">
                      {workshops.find(w => w.id === batch.workshopId)?.name || "N/A"}
                    </span>
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
                {history.map((entry) => (
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
                          {format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getUserName(entry.userId)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}