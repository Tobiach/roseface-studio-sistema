// src/pages/Reserva.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Servicio, Profesional } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RitualTimeline } from '../components/ui/RitualTimeline';
import { formatCurrency, formatDateReadable } from '../lib/formatters';
import { calcularHorariosDisponibles, sumarMinutos } from '../lib/disponibilidad';
import {
  Clock,
  Star,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  User,
  Sparkles,
} from 'lucide-react';

export const Reserva: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { servicios, profesionales, turnos, crearTurno, actualizarEstadoTurno, buscarOCrearClienta, showToast } = useApp();

  // El paso vive en la URL (?paso=N) para que el botón atrás del navegador
  // (o el gesto del celular) retroceda de a un paso, en vez de sacarte de
  // /reserva directamente.
  const step = Number(searchParams.get('paso')) || 1;
  const irAPaso = (n: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('paso', String(n));
    setSearchParams(next);
  };

  // Selected values
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('2026-08-13'); // Default tomorrow
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('');
  
  // Client details
  const [nombreClienta, setNombreClienta] = useState<string>('Sofia Martínez');
  const [telefonoClienta, setTelefonoClienta] = useState<string>('+54 9 11 4589-1234');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Auto select service if passed in URL query
  useEffect(() => {
    const servId = searchParams.get('servicioId');
    if (servId && step === 1) {
      const found = servicios.find((s) => s.id === servId);
      if (found) {
        setServicioSeleccionado(found);
        irAPaso(2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, servicios]);

  // Filter professionals for selected service
  const profesionalesDisponibles = servicioSeleccionado
    ? profesionales.filter((p) =>
        servicioSeleccionado.profesionalesQueLoRealizan.includes(p.id)
      )
    : profesionales;

  // Horarios reales: horario semanal de la profesional para ese día, menos
  // los turnos que ya tiene ocupados esa fecha (ya no es una lista fija).
  const horariosDisponibles =
    profesionalSeleccionado && servicioSeleccionado
      ? calcularHorariosDisponibles(
          profesionalSeleccionado,
          fechaSeleccionada,
          servicioSeleccionado.duracionMinutos,
          turnos
        )
      : [];

  // Monto de seña real del servicio elegido — nunca hardcodeado, sale de
  // servicio.porcentajeSena (hoy 30% en todos, pero puede variar por servicio).
  // Solo para mostrar en pantalla — el monto que efectivamente se cobra lo
  // recalcula el servidor en /api/mercadopago/crear-preferencia.
  const montoSena = servicioSeleccionado
    ? Math.round(servicioSeleccionado.precio * (servicioSeleccionado.porcentajeSena / 100))
    : 0;
  const saldoRestante = servicioSeleccionado ? servicioSeleccionado.precio - montoSena : 0;

  // Handle Mercado Pago payment — intenta crear una preferencia real contra
  // /api/mercadopago/crear-preferencia (el turno se crea del lado del
  // servidor, con el monto recalculado ahí). Si falla (sin MP configurado
  // todavía, o corriendo local sin funciones serverless), cae al flujo
  // simulado para no romper la demo.
  const handlePagarSena = async () => {
    if (!servicioSeleccionado || !profesionalSeleccionado || !horaSeleccionada) return;

    setIsProcessingPayment(true);
    const horaFin = sumarMinutos(horaSeleccionada, servicioSeleccionado.duracionMinutos);

    try {
      const response = await fetch('/api/mercadopago/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicioId: servicioSeleccionado.id,
          profesionalId: profesionalSeleccionado.id,
          fecha: fechaSeleccionada,
          hora: horaSeleccionada,
          horaFin,
          clienta: { nombre: nombreClienta, telefono: telefonoClienta },
        }),
      });

      if (response.status === 409) {
        showToast('❌ Ese horario ya no está disponible — elegí otro.');
        setIsProcessingPayment(false);
        setHoraSeleccionada('');
        irAPaso(3);
        return;
      }
      if (!response.ok) throw new Error('crear-preferencia respondió con error');
      const data = await response.json();
      if (!data.initPoint) throw new Error('crear-preferencia no devolvió initPoint');

      window.location.href = data.initPoint;
    } catch {
      // Sin Mercado Pago real disponible todavía — simulamos la confirmación
      // instantánea como hacía el flujo anterior, para que la demo no se rompa.
      const clientaId = await buscarOCrearClienta(nombreClienta, telefonoClienta);
      const turnoReservado = await crearTurno({
        clientaId,
        profesionalId: profesionalSeleccionado.id,
        servicioId: servicioSeleccionado.id,
        fecha: fechaSeleccionada,
        horaInicio: horaSeleccionada,
        horaFin,
        estado: 'reservado',
        montoTotal: servicioSeleccionado.precio,
        montoSena,
        senaVerificadaAutomaticamente: false,
        origenReserva: 'web',
        idTransaccionMP: null,
        notasInternas: `Reserva web cliente: ${nombreClienta} (${telefonoClienta})`,
      });

      setTimeout(async () => {
        await actualizarEstadoTurno(turnoReservado.id, 'sena_confirmada');
        setIsProcessingPayment(false);
        navigate('/reserva/confirmacion', { state: { turno: { ...turnoReservado, estado: 'sena_confirmada' } } });
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Stepper with Signature Ritual Timeline styling */}
      <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-rf-rose-deep uppercase tracking-wider">
                Reserva de Turno Online
              </span>
              <Badge variant="success" size="sm">Disponible 24/7</Badge>
            </div>
            <h1 className="font-display text-2xl font-bold text-rf-black">
              {step === 1 && 'Paso 1: Seleccioná tu Servicio'}
              {step === 2 && 'Paso 2: Elegí tu Profesional'}
              {step === 3 && 'Paso 3: Seleccioná Fecha y Hora'}
              {step === 4 && 'Paso 4: Confirmación y Seña con Mercado Pago'}
            </h1>
          </div>
          <Badge variant="gold">Paso {step} de 4</Badge>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-rf-rose-deep' : 'bg-pink-100'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: ELEGIR SERVICIO */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicios.map((serv) => (
              <Card
                key={serv.id}
                hoverable
                onClick={() => {
                  setServicioSeleccionado(serv);
                  irAPaso(2);
                }}
                className={`transition-all ${
                  servicioSeleccionado?.id === serv.id
                    ? 'ring-2 ring-rf-rose-deep bg-pink-50/30'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="rose" size="sm">
                        {serv.categoria}
                      </Badge>
                      <Badge variant="gold" size="sm">
                        +{serv.puntosVIP} pts VIP
                      </Badge>
                    </div>
                    <h3 className="font-display font-bold text-base text-rf-black">
                      {serv.nombre}
                    </h3>
                    <p className="text-xs text-rf-charcoal">{serv.descripcion}</p>
                    <div className="flex items-center gap-3 pt-2 text-xs font-medium text-rf-charcoal">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-rf-rose-deep" />
                        {serv.duracionMinutos} min
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        Seña {serv.porcentajeSena}%: {formatCurrency(Math.round(serv.precio * (serv.porcentajeSena / 100)))}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-rf-black block">
                      {formatCurrency(serv.precio)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-rf-rose-deep ml-auto mt-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: ELEGIR PROFESIONAL */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-sm text-rf-charcoal">
            Profesionales disponibles para{' '}
            <strong className="text-rf-black">{servicioSeleccionado?.nombre}</strong>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profesionalesDisponibles.map((prof) => {
              const esCategoriaCejas = servicioSeleccionado?.categoria === 'Cejas';
              const tecnicaCejas =
                prof.id === 'prof-mili'
                  ? 'Perfilado y diseño'
                  : prof.id === 'prof-camila'
                  ? 'Visajismo'
                  : prof.id === 'prof-valentina'
                  ? 'Laminado'
                  : '';

              return (
                <Card
                  key={prof.id}
                  hoverable
                  onClick={() => {
                    setProfesionalSeleccionado(prof);
                    irAPaso(3);
                  }}
                  className={`transition-all ${
                    profesionalSeleccionado?.id === prof.id
                      ? 'ring-2 ring-rf-rose-deep bg-pink-50/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={prof.fotoUrl}
                      alt={prof.nombre}
                      className="w-16 h-16 rounded-full object-cover border-2 border-rf-gold shrink-0 filter brightness-[1.02]"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-display font-bold text-base text-rf-black">
                          {prof.nombre}
                        </h3>
                        {/* Google Style Rating */}
                        <div className="flex items-center gap-1 text-xs font-semibold text-rf-black bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                          <Star className="w-3 h-3 fill-rf-gold-bright text-rf-gold-bright" />
                          <span>{prof.calificacionPromedio.toFixed(1)}</span>
                          <span className="text-[10px] text-rf-charcoal font-normal">
                            ({prof.cantidadResenas})
                          </span>
                        </div>
                      </div>

                      {/* Specific technique badge if Cejas */}
                      {esCategoriaCejas && tecnicaCejas && (
                        <div className="pt-0.5">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rf-rose-deep bg-pink-100/70 px-2 py-0.5 rounded-md">
                            {prof.nombre} — {tecnicaCejas}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-rf-charcoal line-clamp-2">{prof.bio}</p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-rf-rose-deep font-medium">
                        <Sparkles className="w-3 h-3 text-rf-gold" />
                        <span>{prof.aniosExperiencia} años de trayectoria</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" onClick={() => irAPaso(1)}>
              <ChevronLeft className="w-4 h-4" /> Volver a servicios
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: ELEGIR FECHA Y HORA */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Date selector */}
            <div className="md:col-span-6 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-rf-charcoal flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-rf-rose-deep" />
                <span>Seleccioná el Día</span>
              </label>
              <input
                type="date"
                min="2026-08-12"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-rf-rose-deep bg-white text-rf-black font-medium"
              />
              <p className="text-xs text-rf-charcoal italic">
                Día seleccionado: {formatDateReadable(fechaSeleccionada)}
              </p>
            </div>

            {/* Time slots */}
            <div className="md:col-span-6 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-rf-charcoal flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rf-rose-deep" />
                <span>Horarios Disponibles para {profesionalSeleccionado?.nombre}</span>
              </label>

              {horariosDisponibles.length === 0 ? (
                <p className="text-xs text-rf-charcoal bg-rf-cream border border-pink-100 rounded-xl p-3">
                  {profesionalSeleccionado?.nombre} no atiende ese día, o ya no quedan horarios libres. Probá con otra fecha.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {horariosDisponibles.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => setHoraSeleccionada(hora)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        horaSeleccionada === hora
                          ? 'bg-rf-rose-deep text-white border-rf-rose-deep shadow-xs'
                          : 'bg-white text-rf-black border-pink-100 hover:border-rf-rose'
                      }`}
                    >
                      {hora} hs
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-pink-100">
            <Button variant="ghost" onClick={() => irAPaso(2)}>
              <ChevronLeft className="w-4 h-4" /> Volver a profesional
            </Button>

            <Button
              variant="primary"
              disabled={!horaSeleccionada}
              onClick={() => irAPaso(4)}
            >
              <span>Continuar a confirmación</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: REVISIÓN Y MERCADO PAGO SIMULACIÓN DE SEÑA */}
      {step === 4 && servicioSeleccionado && profesionalSeleccionado && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Summary details */}
            <div className="md:col-span-7 space-y-4">
              <Card className="space-y-4">
                <h3 className="font-display font-bold text-lg text-rf-black pb-2 border-b border-pink-100">
                  Resumen de tu Reserva
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-rf-charcoal">Servicio:</span>
                    <span className="font-semibold text-rf-black">{servicioSeleccionado.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rf-charcoal">Especialista:</span>
                    <span className="font-semibold text-rf-black">{profesionalSeleccionado.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rf-charcoal">Fecha y Hora:</span>
                    <span className="font-semibold text-rf-black">
                      {formatDateReadable(fechaSeleccionada)} - {horaSeleccionada} hs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rf-charcoal">Duración estimada:</span>
                    <span className="font-semibold text-rf-black">{servicioSeleccionado.duracionMinutos} min</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-pink-100 space-y-2">
                  <div className="flex justify-between text-base">
                    <span className="text-rf-charcoal">Total del Servicio:</span>
                    <span className="font-bold text-rf-black">{formatCurrency(servicioSeleccionado.precio)}</span>
                  </div>
                  <div className="flex justify-between text-lg bg-pink-50 p-3 rounded-xl border border-pink-200">
                    <span className="font-bold text-rf-rose-deep">
                      Seña a Abonar Hoy ({servicioSeleccionado.porcentajeSena}%):
                    </span>
                    <span className="font-extrabold text-rf-rose-deep">
                      {formatCurrency(montoSena)}
                    </span>
                  </div>
                  <p className="text-[11px] text-rf-charcoal italic">
                    El saldo restante de {formatCurrency(saldoRestante)} se abona en el estudio el día de tu turno.
                  </p>
                </div>
              </Card>

              {/* Client Info Inputs */}
              <Card className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rf-black">
                  Tus Datos de Contacto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-rf-charcoal block mb-1">Nombre completo</label>
                    <input
                      type="text"
                      value={nombreClienta}
                      onChange={(e) => setNombreClienta(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-rf-charcoal block mb-1">WhatsApp (para recordatorios)</label>
                    <input
                      type="text"
                      value={telefonoClienta}
                      onChange={(e) => setTelefonoClienta(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-medium"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Mercado Pago Payment Action Box */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-gradient-to-b from-sky-50 to-white rounded-3xl p-6 border border-sky-200 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
                  <CreditCard className="w-5 h-5" />
                  <span>Pago Seguro de Seña</span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Vas a abonar la seña de{' '}
                  <strong className="text-sky-900">{formatCurrency(montoSena)}</strong> con Mercado Pago. Tu reserva queda confirmada al instante.
                </p>

                <div className="space-y-2 pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    disabled={isProcessingPayment}
                    onClick={handlePagarSena}
                    className="bg-[#009EE3] hover:bg-[#0089C7] text-white border-none shadow-md py-4"
                  >
                    {isProcessingPayment ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando con Mercado Pago...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 font-bold">
                        <span>Pagar con Mercado Pago</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t border-sky-100 space-y-2 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rf-rose-deep shrink-0" />
                    <span>La seña confirma tu turno y no es reembolsable ante cancelación.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" onClick={() => irAPaso(3)}>
              <ChevronLeft className="w-4 h-4" /> Volver a horario
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
