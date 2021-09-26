const CSVToJSON = require("csvtojson");
const moment = require("moment");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const { feriados } = require("../auxiliares/feriados");
moment.locale("es");

const archivoPuntos = "../auxiliares/PUNTOS.csv";
const archivoExigidos = "../auxiliares/exigidos.csv";
const archivoExaminar = "example.csv";

// AUXILIARES
const obtenerDatos = async (path) => {
  const datos = await CSVToJSON({ delimiter: ";" }).fromFile(path);

  return datos;
};

const obtenerServiciosUnicos = (registros) => {
  let uniques = [];
  registros.forEach((reg, i) => {
    if (
      !uniques.find(
        (item) =>
          item.nameService === reg.nameService &&
          item.matricula === reg.matricula &&
          item.fecha ===
            moment(reg.dateChile, "DD/MM/YYYY HH:mm:ss").format("DD/MM/YYYY")
      )
    ) {
      uniques.push({
        nameService: reg.nameService,
        matricula: reg.matricula,
        fecha: moment(reg.dateChile, "DD/MM/YYYY HH:mm:ss").format(
          "DD/MM/YYYY"
        ),
      });
    }
  });

  return uniques;
};
// const archivosTracking = [
//   { dia: "dia 1", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 2", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 3", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 4", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 5", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 6", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 7", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 8", ruta: "./TRACKING/separados/1.csv" },
//   { dia: "dia 9", ruta: "./TRACKING/separados/1.csv" },
// ];

const analizar = async () => {
  // METADATOS
  let puntos = await obtenerDatos(archivoPuntos);
  const exigidos = await obtenerDatos(archivoExigidos);

  //   2. ANALIZAR LAS EXPEDICIONES
  let EXPEDICIONES = await obtenerDatos(`../DB/${archivoExaminar}`);

  const expedicionesValidas = EXPEDICIONES.filter((item) => item.VALIDA == "0");

  // FORMATO
  // DNI1
  // DNI2
  // UNI --> UN04
  // PERI_MES --> PERIODO EXPEDICION
  // INDICADOR --> CALCULADO DIFERENCIA ENTRE LOS MOVILES VALIDOS
  // ID_SERVI --> ID_SERVICIO
  // NOM_SERV --> NOM_SERVCIO
  // CODI_SENTI --> CODI_SENTIDO
  // PERIODO_DIA --> PERIODO_DIA -> SOLO FECHA 01/05/2021
  // PERIODO_HORA --> PERIODO_HORA -> SOLO HORA
  // INTERVALO_INDICADOR --> debe ser mayor o igual a uno, depende de los moviles que van ingresando
  // POSI_PUNTO --> orden de los puntos de expediciones validas
  // HORA_PASADA_CHL --> HORA PASADA POR CADA PUNTO
  // HORA_PASADA_UTC --> HORA PASADA POR CADA PUNTO
  // MINU_DIFER --> HORA PASADA POR CADA PUNTO
  // INVERTALO_OBSERVADO --> cantidad de moviles que pasaron por hora
  // INVERTALO_EXIGIDO --> TRIANGULAR EN OTRA TABLA
  // INCUMPLIMIENTO --> OBSERVADO - EXIGIDO
  // PATENTE
  // PATENTE_ANTERIOR
  // NRO_UNICO_PASADA -> CODI_EXPE
  // TIPO_DIA ----> laboral = 0 , sabado = 1 , DOMINGO O FESTIVO = 2 --> se requiere una base de datos de festivos
  // TIPO_ESTACIONALIDAD -> año laboral normal = 0,Estival =1, Fiestas patrias =2 || por defecto es 0

  let expedicionesAnalizadas = expedicionesValidas
    .map((exp, i) => {
      const OTROS_MOVILES = expedicionesValidas.filter(
        (item) =>
          item.CODI_SENTI == exp.CODI_SENTI &&
          exp.NOMBRE_SERVI == item.NOMBRE_SERVI &&
          item.POSI_PUNTO == exp.POSI_PUNTO &&
          item.PATENTE !== exp.PATENTE
      );

      const pasadaExp = moment(exp.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss");
      const movilAnterior = OTROS_MOVILES.filter((movil) =>
        moment(movil.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isSame(
          pasadaExp,
          "day"
        )
      )
        .sort((a, b) =>
          moment(a.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(
            moment(b.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss"),
            "minutes"
          )
            ? 1
            : moment(a.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isAfter(
                moment(b.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss"),
                "minutes"
              )
            ? -1
            : 0
        )
        .find((item) =>
          moment(item.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(
            pasadaExp,
            "minutes"
          )
        );

      return {
        DNI1: exp.DNI1,
        DNI2: exp.DNI2,
        UNI: "UN04",
        PERI_MES: exp.PERIODO,
        INDICADOR: null,
        ID_SERVI: exp.ID_SERVI,
        NOM_SERV: exp.NOMBRE_SERVI,
        CODI_SENTI: exp.CODI_SENTI,
        PERIODO_DIA: moment(exp.FECH_CHI, "DD/MM/YYYY HH:mm:ss").format(
          "DD/MM/YYYY"
        ),
        PERIODO_HORA: moment(exp.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").format(
          "HH"
        ),
        INTERVALO_INDICADOR: null,
        POSI_PUNTO: exp.POSI_PUNTO,
        HORA_PASADA_CHL: exp.PASO_HORA_CHL,
        HORA_PASADA_CHL_ANTERIOR: movilAnterior
          ? movilAnterior.PASO_HORA_CHL
          : "",
        INTERVALO_OBSERVADO: movilAnterior
          ? Math.round(
              pasadaExp.diff(
                moment(movilAnterior.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss"),
                "minutes",
                true
              ) * 100
            ) / 100
          : "0",
        INTERVALO_EXIGIDO: null,
        INCUMPLIMIENTO: null,
        PATENTE: exp.PATENTE,
        PATENTE_ANTERIOR: movilAnterior ? movilAnterior.PATENTE : "",
        NRO_UNICO_PASADA: exp.CODI_EXPE,
        TIPO_DIA: calcularTipoDia(exp.PASO_HORA_CHL),
        TIPO_ESTACIONALIDAD: "0",
      };
    })
    .map((item) => ({ ...item, INTERVALO_EXIGIDO: getExi(exigidos, item) }))
    .filter((item) => item.INTERVALO_EXIGIDO)
    .map((item) => ({ ...item, INCUMPLIMIENTO: calcularIncumplimiento(item) }))
    .map((item) => ({ ...item, INDICADOR: calcularIndicador(item) }));

  //expedicionesAnalizadas

  // FILTRAR DIA, SENTIDO, NOM_SERVICIO, PERIODO DÍA
  // let reg = {
  //   dia: "",
  //   sentido: "",
  //   service: "",
  //   periodo: "",pos:""
  //   registros: [],
  // };

  const indiceRegistros = [];
  expedicionesAnalizadas.forEach((exp) => {
    const finded = indiceRegistros.findIndex(
      (item) =>
        item.dia == exp.PERIODO_DIA &&
        item.sentido == exp.CODI_SENTI &&
        item.service == exp.NOM_SERV &&
        item.periodo == exp.PERIODO_HORA &&
        item.pos == exp.POSI_PUNTO
    );

    if (finded != -1) {
      indiceRegistros[finded] = {
        ...indiceRegistros[finded],
        indiceRegistros: [...indiceRegistros[finded].indiceRegistros, exp],
      };
    } else {
      indiceRegistros.push({
        dia: exp.PERIODO_DIA,
        sentido: exp.CODI_SENTI,
        service: exp.NOM_SERV,
        periodo: exp.PERIODO_HORA,
        pos: exp.POSI_PUNTO,
        indiceRegistros: [exp],
      });
    }
  });

  expedicionesAnalizadas = indiceRegistros

    .map((ind) => ({
      ...ind,
      indiceRegistros: ind.indiceRegistros
        .sort((a, b) =>
          moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(
            moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss")
          )
            ? 1
            : moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(
                moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss")
              )
            ? -1
            : 0
        )
        .map((item, i) => ({
          ...item,
          INTERVALO_INDICADOR: i + 1,
        })),
    }))
    .map((item) => item.indiceRegistros)
    .flat();

  const archivo2 = createCsvWriter({
    path: "RESULTADOS/indicador-de-regularidad.csv",
    encoding: "utf8",

    fieldDelimiter: ";",
    header: [
      { id: "DNI1", title: "DNI1" },
      { id: "DNI2", title: "DNI2" },
      { id: "UNI", title: "UNI" },
      { id: "PERI_MES", title: "PERI_MES" },
      { id: "INDICADOR", title: "INDICADOR" },
      { id: "ID_SERVI", title: "ID_SERVI" },
      { id: "NOM_SERV", title: "NOM_SERV" },
      { id: "CODI_SENTI", title: "CODI_SENTI" },
      { id: "PERIODO_DIA", title: "PERIODO_DIA" },
      { id: "PERIODO_HORA", title: "PERIODO_HORA" },
      { id: "INTERVALO_INDICADOR", title: "INTERVALO_INDICADOR" },
      { id: "POSI_PUNTO", title: "POSI_PUNTO" },
      { id: "HORA_PASADA_CHL", title: "HORA_PASADA_CHL" },
      { id: "HORA_PASADA_CHL_ANTERIOR", title: "HORA_PASADA_CHL_ANTERIOR" },
      { id: "INTERVALO_OBSERVADO", title: "INTERVALO_OBSERVADO" },
      { id: "INTERVALO_EXIGIDO", title: "INTERVALO_EXIGIDO" },
      { id: "INCUMPLIMIENTO", title: "INCUMPLIMIENTO" },
      { id: "PATENTE", title: "PATENTE" },
      { id: "PATENTE_ANTERIOR", title: "PATENTE_ANTERIOR" },
      { id: "NRO_UNICO_PASADA", title: "NRO_UNICO_PASADA" },
      { id: "TIPO_DIA", title: "TIPO_DIA" },
      { id: "TIPO_ESTACIONALIDAD", title: "TIPO_ESTACIONALIDAD" },
    ],
  });

  await archivo2.writeRecords(
    expedicionesAnalizadas.sort((a, b) =>
      moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isAfter(
        moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss", "minutes")
      )
        ? 1
        : moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(
            moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss", "minutes")
          )
        ? -1
        : 0
    )
  ); // returns a promise

  return null;
};

analizar();

const transFormValue = (value) => parseFloat(value.replace(",", "."));

// AUX
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return Math.round(d * 1000);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const calcularTipoDia = (fecha) => {
  // laboral = 0 , sabado = 1 , DOMINGO O FESTIVO = 2 --> se requiere una base de datos de festivos

  let status = 0;

  if (
    feriados.find((item) => {
      return moment(item.fecha, "YYYY-MM-DD").isSame(
        moment(fecha, "DD/MM/YYYY HH:mm:ss"),
        "days"
      );
    })
  ) {
    status = 2;
  } else {
    const diaSemana = moment(fecha, "DD/MM/YYYY HH:mm:ss").format("dddd");

    if (diaSemana === "sábado") {
      status = 1;
    } else if (diaSemana === "domingo") {
      status = 2;
    } else {
      status = 0;
    }
  }

  return status;
};

const recuperarExpediciones = async () => {
  let registros = [];

  for (let index = 1; index <= 30; index++) {
    const nuevosRegistros = await obtenerDatos(
      `./RESULTADOS/EXPEDICIONES/${index}.csv`
    );

    registros = [...registros, ...nuevosRegistros];
  }
  return registros;
};
