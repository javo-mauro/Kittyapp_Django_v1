import { Link, useLocation } from 'wouter';

export default function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/sensors', label: 'Sensors', icon: 'sensors' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/alerts', label: 'Alerts', icon: 'notifications' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-neutral-200 z-10">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a className={`flex flex-col items-center justify-center ${
              location === item.path ? 'text-primary' : 'text-neutral-500'
            }`}>
              <span className="material-icons text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}
