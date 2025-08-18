import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: "fas fa-chart-line" },
  { href: "/calls", label: "Active Calls", icon: "fas fa-phone" },
  { href: "/intakes", label: "Client Intake", icon: "fas fa-users" },
  { href: "/business-hours", label: "Business Hours", icon: "fas fa-clock" },
  { href: "/configuration", label: "Configuration", icon: "fas fa-cog" },
  { href: "/analytics", label: "Analytics", icon: "fas fa-chart-bar" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="bg-white border-r border-gray-200 w-64 flex-shrink-0">
      <div className="flex flex-col h-full">
        {/* Logo Area */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <i className="fas fa-balance-scale text-white text-lg"></i>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-lg" data-testid="text-app-title">Singh Law</h1>
              <p className="text-xs text-gray-500">Voice Agent Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      location === item.href
                        ? "text-white bg-primary-500"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <i className={`${item.icon} w-5`}></i>
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* System Status */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" data-testid="status-indicator"></div>
              <span className="text-sm font-medium text-green-800" data-testid="text-system-status">System Online</span>
            </div>
            <p className="text-xs text-green-600 mt-1">All services operational</p>
          </div>
        </div>
      </div>
    </div>
  );
}
