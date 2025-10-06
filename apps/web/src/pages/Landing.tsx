// apps/web/src/pages/Landing.tsx
import { Link } from "react-router-dom";
import { ArrowRight, BadgeDollarSign, Clock, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero estilo morado con tarjeta lateral */}
      <section className="relative overflow-hidden text-white bg-hero-gradient">
        <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-16 relative">
          <div className="grid gap-10 md:grid-cols-2 items-center">
            {/* Columna izquierda: titular y CTA */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/20">
                ReeUtil
              </div>
              <h1 className="mt-4 text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Vendemos tu tecnología al mejor precio
              </h1>
              <p className="mt-4 max-w-xl text-white/80 text-sm md:text-base">
                Compramos teléfonos, laptops, tablets y más. Cotización instantánea, pago rápido y proceso 100% seguro.
              </p>
              <div className="mt-8 flex gap-3">
                <Link to="/quote/new" className="btn-primary">
                  Cotizar mi dispositivo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/services" className="btn-secondary">Cómo funciona</Link>
              </div>
            </div>

            {/* Columna derecha: tarjeta tipo glass con items */}
            <div className="hidden md:block">
              <div className="glass rounded-2xl p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-600/80 ring-2 ring-white/30" />
                      <div>
                        <div className="font-semibold">iPhone 13 Pro</div>
                        <div className="text-white/90 text-lg font-bold">$450</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-600/80 ring-2 ring-white/30" />
                      <div>
                        <div className="font-semibold">MacBook Air M1</div>
                        <div className="text-white/90 text-lg font-bold">$650</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onda separadora al final del hero */}
        <div className="absolute bottom-0 left-0 right-0" aria-hidden>
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-[80px] md:h-[120px]">
            <path fill="#fff" d="M0,64L60,74.7C120,85,240,107,360,112C480,117,600,107,720,96C840,85,960,75,1080,80C1200,85,1320,107,1380,117.3L1440,128L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" />
          </svg>
        </div>
      </section>

      {/* Features: precio, rapidez, seguro */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="card">
            <div className="flex items-center gap-3">
              <BadgeDollarSign className="h-6 w-6 text-purple-600" />
              <div>
                <div className="font-semibold">Mejor precio</div>
                <div className="text-sm text-gray-600">Cotizaciones justas y consistentes.</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-purple-600" />
              <div>
                <div className="font-semibold">Pago rápido</div>
                <div className="text-sm text-gray-600">Proceso ágil, sin complicaciones.</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-purple-600" />
              <div>
                <div className="font-semibold">100% seguro</div>
                <div className="text-sm text-gray-600">Protegemos tus datos y transacciones.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
