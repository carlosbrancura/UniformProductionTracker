import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import UserForm from "@/components/UserForm";
import type { User } from "@shared/schema";

export default function Users() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
    },
    onSuccess: () => {
      toast({ title: "Usuário excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({ title: "Erro ao excluir usuário", variant: "destructive" });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = (user: User) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${user.username}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleNew = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "Administrador",
      production_supervisor: "Supervisor de Produção",
      cutter: "Cortador",
    };
    return roleMap[role] || role;
  };

  const getPermissionsLabel = (permissions: string) => {
    const permList = permissions.split(',');
    if (permList.includes('view') && permList.includes('register') && permList.includes('edit')) {
      return "Todas";
    }
    return permList.join(', ');
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (username: string) => {
    const colors = ["bg-blue-600", "bg-amber-600", "bg-green-600", "bg-purple-600", "bg-red-600"];
    const index = username.length % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Usuários</h2>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Nome</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Cargo</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Permissões</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Status</th>
              <th className="text-right py-3 px-6 text-sm font-medium text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 ${getAvatarColor(user.username)} rounded-full flex items-center justify-center text-white text-sm font-medium mr-3`}>
                      {getInitials(user.username)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{user.username}</div>
                      <div className="text-sm text-slate-500">{user.username}@empresa.com</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-slate-700">
                  {getRoleLabel(user.role)}
                </td>
                <td className="py-4 px-6">
                  <Badge variant="secondary">
                    {getPermissionsLabel(user.permissions)}
                  </Badge>
                </td>
                <td className="py-4 px-6">
                  <Badge className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </td>
                <td className="py-4 px-6 text-right">
                  <Button variant="ghost" size="sm" className="mr-2" onClick={() => handleEdit(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(user)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
