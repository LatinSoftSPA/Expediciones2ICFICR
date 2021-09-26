import { obtenerDatos, crearArchivos } from "../auxiliares/auxiliares.js";
import moment from "moment";
import { v4 as uuid } from "uuid";
import { interpolarPuntos } from "../auxiliares/interporlar.js";
import {
  getDistanceFromLatLonInKm,
  transFormValue,
} from "../auxiliares/medir-distancia.js";
// CONSTANTES
const METROS = 100;
const METROS_INTERPOLACION = 3000;
const PUNTOS_PATH = "auxiliares/PUNTOS.csv";
//5023

const obtenerListaRegistros = async (rutas) => {
  let registros = [];

  for (const ruta of rutas) {
    const currentDatos = await obtenerDatos(ruta);

    registros.push(currentDatos);
  }

  registros = registros.flat().filter((item) => item.codSentido !== "-1");

  //  return registros
  return registros;
};

const filtrarPasoPorPuntos = ({ listado, sentido, servicio, puntos }) => {
  let pasos = [];
  // console.log("============================================");
  // console.log(servicio);
  // console.log(listado.length);
  // console.log("============================================");
  const puntosServicio = puntos.filter(
    (item) => servicio === item.service && item.Sentido == sentido
    //  &&      parseFloat(item.ponderador) > 0
  );

  puntosServicio.forEach((pt) => {
    let pase = null;
    // PASE POR PUNTO
    // const finded = listado.find(
    //   (item) =>
    //     getDistanceFromLatLonInKm(
    //       transFormValue(item.lat),
    //       transFormValue(item.lng),
    //       transFormValue(pt.lat),
    //       transFormValue(pt.lng)
    //     ) <= METROS
    // );

    // if (finded) {
    //   pase = finded;
    // } else {
    pase = interpolarPuntos({
      puntos: listado.filter(
        (item) =>
          getDistanceFromLatLonInKm(
            transFormValue(item.lat),
            transFormValue(item.lng),
            transFormValue(pt.lat),
            transFormValue(pt.lng)
          ) <= METROS_INTERPOLACION
      ),
      pt,
    });
    // }

    if (pase) {
      pasos.push({ ...pase, pos: pt.pos, ponderador: pt.ponderador });
    }
  });

  return pasos;
};

const determinarVueltas = (registros, puntos) => {
  //   SEPARACION DE SERVICIO/MAQUINA DIARIO
  let maquinas = [];
  registros.forEach((reg) => {
    const finded = maquinas.find(
      (item) =>
        item.matricula == reg.matricula &&
        item.nameService == reg.nameService &&
        moment(item.dateChile, "DD/MM/YYYY HH:mm:ss").isSame(
          moment(reg.dateChile, "DD/MM/YYYY HH:mm:ss"),
          "day"
        )
    );

    if (!finded) {
      maquinas.push({
        matricula: reg.matricula,
        nameService: reg.nameService,
        dateChile: reg.dateChile,
      });
    }
  });

  //VUELTAS/MAQUINA/SERVICIO
  maquinas = maquinas.map((maquina) => {
    //   REGISTROS PARA UN SERVICIO
    const registrosServicio = registros.filter(
      (item) =>
        item.matricula == maquina.matricula &&
        item.nameService == maquina.nameService &&
        moment(item.dateChile, "DD/MM/YYYY HH:mm:ss").isSame(
          moment(maquina.dateChile, "DD/MM/YYYY HH:mm:ss"),
          "day"
        )
    );

    let grupoServicios = {};
    // SEPARACION EN SENTIDO IDA-VUELTA
    let currentSentido = null;
    let registroActual = null;
    registrosServicio.forEach((item, i) => {
      if (i == 0) {
        const id = uuid();
        registroActual = id;
        currentSentido = item.codSentido;
        //   CREACION DE PRIMER REGISTRO
        grupoServicios[id] = {
          inicio: item.dateChile,
          fin: null,
          registros: [item],
        };
      } else {
        // anexarRegistro si el sentido es igual
        if (currentSentido == item.codSentido) {
          grupoServicios[registroActual] = {
            ...grupoServicios[registroActual],
            registros: [...grupoServicios[registroActual].registros, item],
          };
        } else {
          // crear nuevo registro
          const id = uuid();
          registroActual = id;
          currentSentido = item.codSentido;

          //   CREACION DE PRIMER REGISTRO
          grupoServicios[id] = {
            inicio: item.dateChile,
            fin: null,
            registros: [item],
          };
        }
      }
    });

    let registrosUnicos = [];

    Object.keys(grupoServicios).forEach((item) => {
      const registro = grupoServicios[item];

      const aux = registro.registros[0];

      const registrosValidos = filtrarPasoPorPuntos({
        listado: registro.registros,
        sentido: aux.codSentido,
        servicio: aux.nameService,
        puntos,
      });

      const main = registrosValidos[0] ? registrosValidos[0] : null;

      return registrosValidos
        .map((reg) => {
          if (main) {
            registrosUnicos.push({
              id: item,
              DNI1: main.dni,
              DNI2: main.dniSec,
              PERIODO: main.periodo,
              ID_SERVI: main.idService,
              PATENTE: main.matricula,
              NOMBRE_SERVI: main.nameService,
              EXTRA: "0",
              FECH_CHI: main.dateChile,
              FECH_UTC: main.dateUtc,
              PERIODO_HORA: moment(
                main.dateChile,
                "DD/MM/YYYY HH:mm:ss"
              ).format("HH"),
              CODI_SENTI: main.codSentido,
              CODI_EXPE: (
                new Date(
                  moment(main.dateChile, "DD/MM/YYYY HH:mm:ss").format(
                    "MM/DD/YYYY HH:mm:ss"
                  )
                ).getTime() / 1000
              )
                .toString()
                .slice(2, 10),
              IDDE: `${main.matricula}-${main.dateChile}-${reg.pos}`,
              POSI_PUNTO: reg.pos,
              LATITUD: reg.lat,
              LONGITUD: reg.lng,
              VELOCIDAD: reg.speed,
              PASO_HORA_CHL: reg.dateChile,
              PASO_HORA_UTC: reg.dateUtc,
              VALIDA: validarExpediciones(
                registrosValidos,
                puntos,
                main.nameService,
                main.codSentido
              ),
            });
          }
        })
        .filter((item) => item);
    });

    return registrosUnicos;
  });

  return maquinas.flat();
};

const main = async (rutas, name) => {
  // CONSTANTES
  const PUNTOS = await obtenerDatos(PUNTOS_PATH);

  // OBTENCION DE REGISTROS
  const REGISTROS = await obtenerListaRegistros(rutas);

  // DETERMINAR VUELTAS DIARIAS DE UN MOVIL DETERMINADO
  const servicios = determinarVueltas(
    REGISTROS,
    // REGISTROS.filter((item) => item.matricula == "FPRY34"),
    PUNTOS
  );

  crearArchivos({
    headers: [
      { id: "IDDE", title: "IDDE" },
      { id: "DNI1", title: "DNI1" },
      { id: "DNI2", title: "DNI2" },
      { id: "PERIODO", title: "PERIODO" },
      { id: "ID_SERVI", title: "ID_SERVI" },
      { id: "NOMBRE_SERVI", title: "NOMBRE_SERVI" },
      { id: "CODI_SENTI", title: "CODI_SENTI" },
      { id: "PATENTE", title: "PATENTE" },
      { id: "CODI_EXPE", title: "CODI_EXPE" },
      { id: "FECH_CHI", title: "FECH_CHI" },
      { id: "FECH_UTC", title: "FECH_UTC" },
      { id: "POSI_PUNTO", title: "POSI_PUNTO" },
      { id: "LATITUD", title: "LATITUD" },
      { id: "LONGITUD", title: "LONGITUD" },
      { id: "VELOCIDAD", title: "VELOCIDAD" },
      { id: "PASO_HORA_CHL", title: "PASO_HORA_CHL" },
      { id: "PASO_HORA_UTC", title: "PASO_HORA_UTC" },
      { id: "PERIODO_HORA", title: "PERIODO_HORA" },
      { id: "VALIDA", title: "VALIDA" },
      { id: "EXTRA", title: "EXTRA" },
    ],
    records: servicios,
    pathResult: `RESULTADOS/${name}.csv`,
  });
};

const principal = async () => {
  console.log("Inicio 1: ", moment().format("DD/MM/YYYY HH:mm"));
  await main(["DB/1.csv"], "primero");
  // console.log("Inicio 2: ", moment().format("DD/MM/YYYY HH:mm"));
  // await main(["DB/dos.csv"], "segundo");
  // console.log("Inicio 3: ", moment().format("DD/MM/YYYY HH:mm"));
  // await main(["DB/tres.csv"], "tercero");
  // console.log("Inicio 4: ", moment().format("DD/MM/YYYY HH:mm"));
  // await main(["DB/cuatro.csv"], "cuarto");
};

principal();

const validarExpediciones = (registros, puntos, servicio, sentido) => {
  let valido = 0;

  // filtros iguales
  const currentPoints = puntos
    .filter((item) => item.service == servicio && item.Sentido == sentido)
    .sort((a, b) => parseInt(a.pos) - parseInt(b.pos));

  // return registros.reduce((acc, sum) => acc + parseFloat(sum.ponderador), 0) ===
  //   1
  //   ? 0
  //   : 1;

  // EL PRIMER Y ULTIMO REGISTROS SIEMPRE DEBEN SER VALIDOS
  const primerPunto = currentPoints[0];
  const ultimoPunto = currentPoints[currentPoints.length - 1];

  const pasoPrimero = registros.find((item) => item.pos == primerPunto.pos);
  const pasoUltimo = registros.find((item) => item.pos == ultimoPunto.pos);
  if (!pasoPrimero || !pasoUltimo) {
    valido = 1;
  }
  // DEBE MARCAR EL 80% de los otros PUNTOS
  const total = currentPoints.length - 2;
  const pasadas = registros.length - 2;
  // total --> 100%
  // pasadas --> x
  const porcentaje = (pasadas * 100) / total;

  if (porcentaje < 80) {
    valido = 1;
  }

  // console.log(registrosOrdenados);
  return valido;
};
