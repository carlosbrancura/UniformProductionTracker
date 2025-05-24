import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X, Camera, Edit, RotateCcw, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Batch, Product, Workshop, BatchHistory, User } from "@shared/schema";

const batchEditSchema = z.object({
  quantity: z.number().min(1, "Quantidade deve ser maior que 0"),
  workshopId: z.number().nullable(),
  expectedReturnDate: z.string().optional(),
  status: z.enum(["waiting", "in_production", "at_workshop", "returned"]),
});

interface BatchModalProps {
  batch: Batch;
  products: Product[];
  workshops: Workshop[];
  onClose: () => void;
}

type BatchEditData = z.infer<typeof batchEditSchema>;

export default function BatchModal({ batch, products, workshops, onClose }: BatchModalProps) {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<BatchEditData>({
    resolver: zodResolver(batchEditSchema),
    defaultValues: {
      quantity: batch.quantity,
      workshopId: batch.workshopId,
      expectedReturnDate: batch.expectedReturnDate ? format(new Date(batch.expectedReturnDate), "yyyy-MM-dd") : "",
      status: batch.status as "waiting" | "in_production" | "at_workshop" | "returned",
    },
  });

  const { data: history = [] } = useQuery<BatchHistory[]>({
    queryKey: ["/api/batches", batch.id, "history"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const product = products.find(p => p.id === batch.productId);
  const workshop = workshops.find(w => w.id === batch.workshopId);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiRequest('POST', `/api/batches/${batch.id}/image`, formData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Imagem enviada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setImageFile(null);
    },
    onError: () => {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: async (data: BatchEditData) => {
      const response = await apiRequest('PATCH', `/api/batches/${batch.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lote atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar lote", variant: "destructive" });
    },
  });

  const onSubmit = (data: BatchEditData) => {
    updateBatchMutation.mutate(data);
  };

  const deleteBatchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/batches/${batch.id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lote excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Erro ao excluir lote", variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.")) {
      deleteBatchMutation.mutate();
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest('PUT', `/api/batches/${batch.id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Status atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const handleImageUpload = () => {
    if (imageFile) {
      uploadImageMutation.mutate(imageFile);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: "Aguardando",
      internal_production: "Produção Interna",
      external_workshop: "Oficina Externa",
      returned_ok: "Retornado OK",
      returned_issues: "Retornado com Problemas",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      waiting: "bg-slate-100 text-slate-800",
      internal_production: "bg-blue-100 text-blue-800",
      external_workshop: "bg-amber-100 text-amber-800",
      returned_ok: "bg-green-100 text-green-800",
      returned_issues: "bg-red-100 text-red-800",
    };
    return colorMap[status] || "bg-slate-100 text-slate-800";
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.username || "Usuário";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Lote {batch.code}
              </DialogTitle>
              <p className="text-sm text-slate-600">{product?.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    disabled={deleteBatchMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={updateBatchMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Batch Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {isEditing ? "Editar Lote" : "Detalhes do Lote"}
              </h3>
              
              {isEditing ? (
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="workshopId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Oficina</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "internal" ? null : parseInt(value))}
                            value={field.value ? field.value.toString() : "internal"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a oficina" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="internal">Produção Interna</SelectItem>
                              {workshops.map((workshop) => (
                                <SelectItem key={workshop.id} value={workshop.id.toString()}>
                                  {workshop.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="waiting">Aguardando</SelectItem>
                              <SelectItem value="in_production">Em Produção</SelectItem>
                              <SelectItem value="at_workshop">Na Oficina</SelectItem>
                              <SelectItem value="returned">Retornado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expectedReturnDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previsão de Retorno</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Quantidade:</span>
                    <span className="text-sm font-medium text-slate-900">{batch.quantity} peças</span>
                  </div>
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
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Oficina:</span>
                    <span className="text-sm font-medium text-slate-900">
                      {workshop?.name || "Produção Interna"}
                    </span>
                  </div>
                  {batch.expectedReturnDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Previsão de Retorno:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {format(new Date(batch.expectedReturnDate), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              )}
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

          {/* Observations */}
          {batch.observations && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Observações</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">{batch.observations}</p>
              </div>
            </div>
          )}

          {/* Status History */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Histórico de Status</h3>
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-slate-900">{entry.action}</p>
                      <span className="text-xs text-slate-500">
                        {entry.timestamp ? format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Data não disponível"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">Por: {getUserName(entry.userId)}</p>
                    {entry.notes && (
                      <p className="text-xs text-slate-600 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => updateStatusMutation.mutate("returned_ok")}
              disabled={updateStatusMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Marcar como Retornado
            </Button>
            <Button onClick={onClose}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Lote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
