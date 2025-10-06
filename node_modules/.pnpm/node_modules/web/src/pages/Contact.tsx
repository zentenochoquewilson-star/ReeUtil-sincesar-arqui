// apps/web/src/pages/Contact.tsx
import { Mail, Phone, MapPin, Clock, ShieldCheck, MessageSquare, ArrowRight, Send } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/20">
              <ShieldCheck className="h-3 w-3" />
              ReeUtil
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Contacto</h1>
            <p className="mt-2 text-sm/6 text-slate-300">
              Estamos para ayudarte. Resolvemos tus dudas con rapidez y transparencia.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        {/* Contact Info Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dirección</h3>
                <p className="mt-2 text-sm text-gray-600">Av. Obrajes, Calle 2</p>
                <p className="mt-1 text-xs text-gray-500">La Paz, Bolivia</p>
              </div>
            </div>
          </div>

          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Teléfono</h3>
                <p className="mt-2 text-sm text-gray-600">78945612</p>
                <p className="mt-1 text-xs text-gray-500">Lunes a Viernes 9:00-18:00</p>
              </div>
            </div>
          </div>

          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                <p className="mt-2 text-sm text-gray-600">contacto@reeutil.dev</p>
                <p className="mt-1 text-xs text-gray-500">Respuesta en menos de 24h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Horario de atención</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Lunes a Viernes</span>
                    <span className="font-medium text-gray-900">09:00 - 18:00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sábados</span>
                    <span className="font-medium text-gray-900">09:00 - 13:00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Domingos</span>
                    <span className="font-medium text-gray-900">Cerrado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <ShieldCheck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Soporte y garantías</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Protegemos tus datos y operaciones. Para cualquier inconveniente, escribe a nuestro equipo de soporte.
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm text-purple-700">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">Respuesta promedio: &lt; 24h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="card max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">¿Tienes alguna pregunta?</h2>
            <p className="mt-1 text-sm text-gray-600">Envíanos un mensaje y te responderemos pronto</p>
          </div>

          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  className="field"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="field"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
              <input
                type="text"
                className="field"
                placeholder="¿En qué podemos ayudarte?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea
                className="field min-h-[120px] resize-none"
                placeholder="Cuéntanos más detalles..."
                rows={4}
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Enviar mensaje
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:contacto@reeutil.dev" className="btn-primary">
              <Mail className="h-4 w-4" />
              Escríbenos por email
            </a>
            <a href="tel:78945612" className="btn-secondary">
              <Phone className="h-4 w-4" />
              Llamar ahora
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
