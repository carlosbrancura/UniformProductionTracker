import { Building } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Building className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-xl font-bold text-slate-900">Sistema de Produção</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600">João Silva</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              JS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
