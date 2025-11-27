// keep your existing imports & ServiceModal code exactly as-is above…

export const Services: React.FC = () => {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        setSelectedServiceId(customEvent.detail.id);
      }
    };

    const checkHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#service-')) {
        const id = hash.replace('#service-', '');
        setSelectedServiceId(id);
      }
    };

    window.addEventListener('open-service-modal', handleCustomEvent);
    window.addEventListener('hashchange', checkHash);

    checkHash();

    return () => {
      window.removeEventListener('open-service-modal', handleCustomEvent);
      window.removeEventListener('hashchange', checkHash);
    };
  }, []);

  const activeService = SERVICES.find((s) => s.id === selectedServiceId);

  return (
    <section id="services" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-brand-600 dark:text-brand-500 font-semibold tracking-wide uppercase text-sm mb-3">
            Core Services
          </h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold text-slate-900 dark:text-white mb-6">
            Everything You Need to <br />
            <span className="text-slate-400 dark:text-slate-500">Scale Automatically</span>
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            We integrate cutting-edge AI directly into your existing workflow, replacing manual grunt work with instant,
            24/7 performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
          {SERVICES.map((service, index) => {
            let colSpan = 'md:col-span-1';
            if (index === 0) colSpan = 'md:col-span-2';
            if (index === 3) colSpan = 'md:col-span-2';
            if (index === 5) colSpan = 'md:col-span-2';

            const isDarkCard = index === 0 || index === 5;

            return (
              <div
                key={service.id}
                id={`service-${service.id}`}
                className={`${colSpan} group h-full cursor-pointer min-h-[320px] scroll-mt-32 transition-transform duration-300 hover:scale-[1.01]`}
                onClick={() => setSelectedServiceId(service.id)}
              >
                <div
                  className={`
                    w-full h-full rounded-3xl p-8 overflow-hidden relative
                    flex flex-col
                    ${
                      isDarkCard
                        ? 'bg-slate-900 text-white shadow-2xl shadow-brand-900/20'
                        : 'bg-white/90 dark:bg-dark-card text-slate-900 dark:text-white shadow-sm border border-slate-100/60 dark:border-dark-border'
                    }
                  `}
                >
                  {isDarkCard && (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  )}

                  <div className="relative z-10 h-full flex flex-col">
                    <div
                      className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110
                        ${
                          isDarkCard
                            ? 'bg-white/10 text-brand-400'
                            : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                        }
                      `}
                    >
                      <service.icon className="w-6 h-6" />
                    </div>

                    <h4
                      className={`text-2xl font-bold mb-3 ${
                        isDarkCard ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {service.title}
                    </h4>

                    <p
                      className={`mb-6 leading-relaxed flex-grow ${
                        isDarkCard ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {service.description}
                    </p>

                    <div className="space-y-3 mt-auto">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm font-medium opacity-90">
                          <CheckCircle2
                            className={`w-4 h-4 mr-2 ${isDarkCard ? 'text-brand-400' : 'text-brand-500'}`}
                          />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
