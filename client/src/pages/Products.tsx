import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Plus } from "lucide-react";
import ProductForm from "@/components/ProductForm";
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

      <div className="grid gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-slate-600 font-mono">{product.code}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {product.description && (
                <p className="text-sm text-slate-700 mb-4">{product.description}</p>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Tecido Principal</h4>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">{product.fabricType}</p>
                    <p className="text-xs text-slate-500">{product.fabricMetersPerPiece} por peça</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Aviamentos</h4>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <ul className="text-sm text-slate-700 space-y-1">
                      {product.notions.map((notion, index) => (
                        <li key={index}>• {notion.name} ({notion.quantity})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {product.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-600">
                    <strong>Observações:</strong> {product.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
