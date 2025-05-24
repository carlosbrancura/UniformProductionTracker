import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Camera, Edit, Save, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  const [isEditing, setIsEditing] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Form state for editing
  const [editData, setEditData] = useState({
    cutDate: batch.cutDate ? format(new Date(batch.cutDate), "yyyy-MM-dd") : "",
    status: batch.status || "waiting",
    workshopId: batch.workshopId ? batch.workshopId.toString() : "internal",
    expectedReturnDate: batch.expectedReturnDate ? format(new Date(batch.expectedReturnDate), "yyyy-MM-dd") : "",
    observations: batch.observations || "",
    products: [{ productId: "", quantity: 1, selectedColor: "", selectedSize: "" }],
  });

  // Query to get batch products
  const { data: batchProducts = [] } = useQuery({
    queryKey: ['/api/batch-products', batch.id],
    queryFn: async () => {
      const response = await fetch(`/api/batch-products/${batch.id}`);
      return response.json();
    },
  });

  // Load batch products when data is available
  useEffect(() => {
    if (batchProducts.length > 0) {
      const formattedProducts = batchProducts.map((bp: any) => ({
        productId: bp.productId.toString(),
        quantity: bp.quantity,
        selectedColor: bp.selectedColor || "",
        selectedSize: bp.selectedSize || "",
      }));
      setEditData(prev => ({ ...prev, products: formattedProducts }));
    }
  }, [batchProducts]);

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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to update batch: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lote atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar lote",
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
      return response.json();
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

  const handleUpdate = () => {
    updateMutation.mutate(editData);
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este lote?")) {
      deleteMutation.mutate();
    }
  };

  const addProduct = () => {
    setEditData(prev => ({
      ...prev,
      products: [...prev.products, { productId: "", quantity: 1, selectedColor: "", selectedSize: "" }]
    }));
  };

  const removeProduct = (index: number) => {
    setEditData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const getSelectedProduct = (productId: string) => {
    if (!productId) return null;
    return products.find(p => p.id.toString() === productId) || null;
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Lote {batch.code}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            /* EDITING MODE */
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Corte</Label>
                  <Input
                    type="date"
                    value={editData.cutDate}
                    onChange={(e) => setEditData({...editData, cutDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data Prevista de Retorno</Label>
                  <Input
                    type="date"
                    value={editData.expectedReturnDate}
                    onChange={(e) => setEditData({...editData, expectedReturnDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select onValueChange={(value) => setEditData({...editData, status: value})} value={editData.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waiting">Aguardando</SelectItem>
                      <SelectItem value="internal_production">Produção Interna</SelectItem>
                      <SelectItem value="external_workshop">Oficina Externa</SelectItem>
                      <SelectItem value="returned">Retornado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Oficina</Label>
                  <Select onValueChange={(value) => setEditData({...editData, workshopId: value})} value={editData.workshopId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Produção Interna</SelectItem>
                      {workshops.map((workshop) => (
                        <SelectItem key={workshop.id} value={workshop.id.toString()}>
                          {workshop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={editData.observations}
                  onChange={(e) => setEditData({...editData, observations: e.target.value})}
                  placeholder="Observações sobre o lote..."
                />
              </div>

              {/* Products Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg font-semibold">Produtos do Lote</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProduct}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Produto
                  </Button>
                </div>

                <div className="space-y-4">
                  {editData.products.map((product, index) => {
                    const selectedProduct = getSelectedProduct(product.productId);
                    
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium">Produto {index + 1}</h4>
                          {editData.products.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProduct(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Produto</Label>
                            <Select 
                              onValueChange={(value) => {
                                updateProduct(index, 'productId', value);
                                updateProduct(index, 'selectedColor', '');
                                updateProduct(index, 'selectedSize', '');
                              }}
                              value={product.productId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((prod) => (
                                  <SelectItem key={prod.id} value={prod.id.toString()}>
                                    {prod.name} - {prod.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value))}
                            />
                          </div>
                        </div>

                        {selectedProduct && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label>Cor</Label>
                              <Select 
                                onValueChange={(value) => updateProduct(index, 'selectedColor', value)} 
                                value={product.selectedColor}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a cor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedProduct.availableColors?.map((color, colorIndex) => (
                                    <SelectItem key={colorIndex} value={color}>
                                      {color}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Tamanho</Label>
                              <Select 
                                onValueChange={(value) => updateProduct(index, 'selectedSize', value)} 
                                value={product.selectedSize}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tamanho" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedProduct.availableSizes?.map((size, sizeIndex) => (
                                    <SelectItem key={sizeIndex} value={size}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {selectedProduct && (
                          <div className="mt-4 p-3 bg-blue-50 rounded">
                            <p className="text-sm text-blue-800">
                              <strong>Valor de Produção:</strong> R$ {selectedProduct.productionValue || "0,00"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            /* VIEW MODE */
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
                  {batch.observations && (
                    <div>
                      <span className="text-sm text-slate-600">Observações:</span>
                      <p className="text-sm text-slate-900 mt-1">{batch.observations}</p>
                    </div>
                  )}
                </div>

                {/* Products List */}
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
          )}

          {/* History Section */}
          {!isEditing && (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}