import { Link, useLocation } from "wouter";

export default function Navigation() {
  const [location] = useLocation();

  const tabs = [
    { path: "/", label: "Lotes de Produção", id: "batches" },
    { path: "/products", label: "Produtos", id: "products" },
    { path: "/workshops", label: "Oficinas", id: "workshops" },
    { path: "/users", label: "Usuários", id: "users" },
    { path: "/financial", label: "Financeiro", id: "financial" },
  ];

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = location === tab.path;
            return (
              <Link key={tab.id} href={tab.path}>
                <button
                  className={`py-4 px-1 text-sm font-medium border-b-2 ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
