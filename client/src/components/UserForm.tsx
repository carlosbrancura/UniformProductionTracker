import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
}

const userFormSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  role: z.string().min(1, "Cargo é obrigatório"),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserForm({ user, onClose }: UserFormProps) {
  const { toast } = useToast();
  const isEditing = !!user;
  
  const [permissions, setPermissions] = useState({
    view: user?.permissions.includes('view') || false,
    register: user?.permissions.includes('register') || false,
    edit: user?.permissions.includes('edit') || false,
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user?.username || "",
      password: "",
      role: user?.role || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const permissionsList = Object.entries(permissions)
        .filter(([_, enabled]) => enabled)
        .map(([permission]) => permission);
      
      const userData = {
        ...data,
        permissions: permissionsList.join(','),
      };
      
      const url = isEditing ? `/api/users/${user!.id}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, userData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: `Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: () => {
      toast({ title: `Erro ao ${isEditing ? 'atualizar' : 'criar'} usuário`, variant: "destructive" });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: checked,
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="username">Nome de Usuário *</Label>
            <Input
              id="username"
              {...form.register("username")}
              placeholder="Ex: joao.silva"
            />
            {form.formState.errors.username && (
              <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              placeholder={isEditing ? "Deixe em branco para manter a atual" : "Digite a senha"}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Cargo *</Label>
            <Select onValueChange={(value) => form.setValue("role", value)} defaultValue={user?.role}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="production_supervisor">Supervisor de Produção</SelectItem>
                <SelectItem value="cutter">Cortador</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-red-600">{form.formState.errors.role.message}</p>
            )}
          </div>

          <div>
            <Label>Permissões *</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view"
                  checked={permissions.view}
                  onCheckedChange={(checked) => handlePermissionChange('view', checked as boolean)}
                />
                <Label htmlFor="view" className="text-sm">Visualizar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="register"
                  checked={permissions.register}
                  onCheckedChange={(checked) => handlePermissionChange('register', checked as boolean)}
                />
                <Label htmlFor="register" className="text-sm">Registrar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit"
                  checked={permissions.edit}
                  onCheckedChange={(checked) => handlePermissionChange('edit', checked as boolean)}
                />
                <Label htmlFor="edit" className="text-sm">Editar</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar" : "Criar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
