// src/data/resenasGoogle.ts
// Reseñas reales de Google Maps, transcritas de las capturas que mandó
// Tobias (23/9/2026) para la sección "Lo que dicen de nosotras" del Home.
// Se transcribió el texto en vez de usar las capturas directamente para
// que se vean con el diseño propio del sitio (recuadro dorado premium),
// no con la interfaz de Google de fondo. Todas son 5 estrellas.
export interface ResenaGoogle {
  nombre: string;
  estrellas: number;
  texto: string;
  servicio?: string;
}

export const resenasGoogle: ResenaGoogle[] = [
  {
    nombre: 'Valeria Martinez',
    estrellas: 5,
    texto:
      'Me atiendo con Yosi hace más de un año, es una genia! Además de ser muy dulce, puntual y un trato muy bueno, las pestañas me duran mucho más que en otros lugares en los cuales me realicé el servicio, entre mes y mes y medio. Salgo diosa y con el volumen que deseo. No la cambio por nadie — y eso que me vengo desde lejos y hay opciones por mi barrio. Súper recomendadas.',
  },
  {
    nombre: 'Yurhana Martinez',
    estrellas: 5,
    texto:
      'Me encanta este lugar, la decoración es hermosa, las chicas súper amables y pacientes con clientes inquietas como yo. Las pestañas brasileras me duraron muchísimo y sobrevivieron a dos semanas de pileta y pocos cuidados. Usan materiales de calidad — soy muy alérgica a los pegamentos y no tuve ninguna reacción. Los precios están bastante razonables, ya investigué en un par de lugares y prácticamente los duplicaban. Excelente ubicación a media cuadra del subte.',
    servicio: 'Extensiones de pestañas',
  },
  {
    nombre: 'Agustina Videla',
    estrellas: 5,
    texto:
      'Yosa sos lo más. Fui a hacerme las pestañas y quedé enamorada de su atención desde el primer minuto. Muy atenta y excelente profesional. Sin dudas voy a volver.',
  },
  {
    nombre: 'Malena Neri',
    estrellas: 5,
    texto:
      'Encontré este lugar por internet, fui por primera vez y mi experiencia fue excelente, muy lindo lugar, muy amables y profesionales. Las pestañas me quedaron excelentes, me realicé volumen tecnológico, me fui una semana a la playa donde me metí todos los días al mar y siguen intactas. El mejor lugar al que fui hasta el momento.',
  },
  {
    nombre: 'Daryeris Pérez Farrel',
    estrellas: 5,
    texto:
      'Súper recomendadas, son muy amables todas las chicas. Me hago pestañas y nunca me quedaron ni me duraron tanto como con ellas.',
  },
  {
    nombre: 'Daniela Carrasquilla',
    estrellas: 5,
    texto:
      'Tengo 2 años atendiéndome con Yosy y es la mejor haciendo pestañas, y las demás chicas del estudio también. He llevado a casi todas mis amigas y siempre quedamos felices y conformes.',
    servicio: 'Extensiones de pestañas',
  },
  {
    nombre: 'Micaela Torres',
    estrellas: 5,
    texto:
      'Las mejores pestañas y la mejor atención a sus clientas. Me vengo haciendo las pestañas hace casi un año ahí y siempre salgo bellísima y muy contenta con los resultados, un amor el trato de las chicas hacia sus clientes y viceversa. Siempre muy atentas, te hacen sentir en casa. Siempre fiel al efecto Tecnológico.',
    servicio: 'Embellecimiento de cejas, Depilación definitiva, Extensiones de pestañas, Lifting de pestañas y Laminado de cejas',
  },
];
