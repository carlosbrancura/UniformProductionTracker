import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus } from "lucide-react";
import ProductForm from "@/components/ProductForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const { toast } = useToast();

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/products/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir produto');
      }
      return response;
    },
    onSuccess: () => {
      toast({ title: "Produto excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao excluir produto", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleDelete = (product: Product) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Produtos</h2>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Listagem Compacta em Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo de Tecido</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Valor de Produção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.fabricType}</TableCell>
                  <TableCell>
                    {product.availableColors && product.availableColors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.availableColors.slice(0, 3).map((color, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{color}</Badge>
                        ))}
                        {product.availableColors.length > 3 && (
                          <span className="text-xs text-gray-500">+{product.availableColors.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.availableSizes && product.availableSizes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.availableSizes.slice(0, 3).map((size, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{size}</Badge>
                        ))}
                        {product.availableSizes.length > 3 && (
                          <span className="text-xs text-gray-500">+{product.availableSizes.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.productionValue ? (
                      `R$ ${product.productionValue}`
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive === 1 ? "default" : "secondary"}>
                      {product.isActive === 1 ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        disabled={deleteProductMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleClose}
        />
      )}
    </div>
  );
}