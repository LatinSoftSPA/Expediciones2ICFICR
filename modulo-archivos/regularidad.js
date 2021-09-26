import { obtenerDatos, calcularTipoDia } from "../auxiliares/auxiliares.js";
import moment from "moment";
import { createObjectCsvWriter as createCsvWriter } from "csv-writer";

const ANEXO_1 = "ARCHIVOS/ANEXOS/A1-AGO-2021.csv"; // LISTADO DE EXIGIDAS
// const URL_EXPEDICIONES = ["RESULTADOS/EXPEDICIONES/AGO/AGO_1-22.csv", "RESULTADOS/EXPEDICIONES/AGO/AGO_23-31.csv"];
const URL_EXPEDICIONES = ["RESULTADOS/EXPEDICIONES/SEP/1.csv"];
const URL_ICR = "RESULTADOS/ICR/SEP/1.csv";

const LEER_EXPEDICIONES = async (files) => {
  let EXPEDICIONES = [];
  // RECORRER FUENTE DE DATOS
  for (const file of files) {
    const lista = await obtenerDatos(file);
    EXPEDICIONES = [...EXPEDICIONES, ...lista];
  }
  return EXPEDICIONES;
}

const CREAR_ARCHIVO_ICR = createCsvWriter(
  {
    path: URL_ICR,
    encoding: "utf8",

    fieldDelimiter: ";",
    header: [
      { id: "DNI1", title: "DNI1" },
      { id: "DNI2", title: "DNI2" },
      { id: "UNI", title: "UNI" },
      { id: "PERI_MES", title: "PERI_MES" },
      { id: "INDICADOR", title: "INDICADOR" },
      { id: "CODI_SERVI", title: "CODI_SERVI" },
      { id: "NOM_SERV", title: "NOM_SERV" },
      { id: "CODI_SENTI", title: "CODI_SENTI" },
      { id: "PERI_DIA", title: "PERI_DIA" },
      { id: "PERI_HORA", title: "PERI_HORA" },
      { id: "POSI_BUS", title: "POSI_BUS" },
      { id: "POSI_PUNTO", title: "POSI_PUNTO" },
      { id: "PASA_ACT", title: "PASA_ACT" },
      { id: "PASA_ANT", title: "PASA_ANT" },
      { id: "INT_OBS", title: "INT_OBS" },
      { id: "INT_EXI", title: "INT_EXI" },
      { id: "INCUM", title: "INCUM" },
      { id: "PPU_ACT", title: "PPU_ACT" },
      { id: "PPU_ANT", title: "PPU_ANT" },
      { id: "CODI_EXPED", title: "CODI_EXPED" },
      { id: "TIPO_DIA", title: "TIPO_DIA" },
      { id: "TIPO_ESTACIONALIDAD", title: "TIPO_ESTACIONALIDAD" },
    ],
  }
);

const start = async (files = []) => {
  const LISTADO_PC = await obtenerDatos("auxiliares/PUNTOS.csv");

  const EXPEDICIONES = await LEER_EXPEDICIONES(files);
  
  // EXPEDICIONES = EXPEDICIONES.filter((item) => item.VALIDA === "0" && item.PERI_HORA === "7");
  const EXPEDICIONES_VALIDAS = EXPEDICIONES.filter((exp) => exp.VALIDA === "0");
  const EXP_FILTRADAS = EXPEDICIONES_VALIDAS.filter((exp) => exp.PERIODO_HORA === "6");

  // const EXPEDICIONES_ANALIZARE = EXP_FILTRADAS.filter((exp) => {
  const EXPEDICIONES_ANALIZARE = EXPEDICIONES_VALIDAS.filter((exp) => {
    const PC_FILTRADOS = LISTADO_PC.filter((pc) => pc.ICR === "1");
    const PC_ICR = PC_FILTRADOS.find((pc) =>
      pc.pos == exp.POSI_PUNTO && pc.service == exp.NOMBRE_SERVI && pc.Sentido === exp.CODI_SENTI 
    );

    if (PC_ICR && PC_ICR.ICR == "1") {
      return true;
    }
    // if(item.VALIDA == "0"){
    //   return true
    // }
  });
  const EXP_ANAL_ORDENADAS = EXPEDICIONES_ANALIZARE.sort((a, b) =>
    moment(a.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isAfter(moment(b.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss", "minutes")) ? 1 : 
    moment(a.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(moment(b.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss", "minutes")) ? -1 : 
    0
  );

  let LISTADO_ANALIZADO = await ANALIZAR_EXPEDICIONES(EXP_ANAL_ORDENADAS);
  
  let EXPEDICIONES_FILTRADAS = filtrarExpediciones(LISTADO_ANALIZADO);
  let EXPEDICIONES_ORDENADAS = EXPEDICIONES_FILTRADAS.sort((a, b) =>
    moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isAfter(moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss", "minutes")) ? 1 : 
    moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss", "minutes")) ? -1 : 
    0
  );

  await CREAR_ARCHIVO_ICR.writeRecords(EXPEDICIONES_ORDENADAS);

  return null;
};

// ANALISIS DE EXPEDICION
const ANALIZAR_EXPEDICIONES = async (list) => {
  const exigidos = await obtenerDatos(ANEXO_1);

  return list
    .map((exp, i) => {
      // OBTIENE OTROS MOVILES
      const OTROS_MOVILES = list.filter(
        (item) =>
          item.CODI_SENTI == exp.CODI_SENTI &&
          exp.NOMBRE_SERVI == item.NOMBRE_SERVI &&
          item.POSI_PUNTO == exp.POSI_PUNTO &&
          item.PPU_ACT !== exp.PATENTE
      );
      // ALMACENA LA PASADA
      const pasadaExp = moment(exp.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss");
      // MOVIL ANTERIOR
      const movilAnterior = OTROS_MOVILES
        .filter((movil) => moment(movil.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isSame(pasadaExp, "day"))
        .sort((a, b) =>
          moment(a.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(moment(b.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss"), "seconds") ? 1 : 
          moment(a.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isAfter(moment(b.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss"), "seconds") ? -1 : 
          0
        )
        .find((item) => 
            moment(item.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(pasadaExp, "seconds") 
            && item.POSI_PUNTO === exp.POSI_PUNTO
            && moment(item.FECH_CHI, "DD/MM/YYYY HH:mm:ss").format("HH") === exp.PERIODO_HORA //ELIMINAR LOS INTERVALOS PERTENECE A TODOS LOS PERIODOS HORARIOS
        );
      return {
        DNI1: exp.DNI1,
        DNI2: exp.DNI2,
        UNI: "UN04",
        PERI_MES: exp.PERIODO,
        INDICADOR: null,
        CODI_SERVI: exp.ID_SERVI,
        NOM_SERV: exp.NOMBRE_SERVI,
        CODI_SENTI: exp.CODI_SENTI,
        PERI_DIA: moment(exp.FECH_CHI, "DD/MM/YYYY HH:mm:ss").format("DD/MM/YYYY"),
        PERI_HORA: moment(exp.FECH_CHI, "DD/MM/YYYY HH:mm:ss").format("HH"),
        POSI_BUS: null,
        POSI_PUNTO: exp.POSI_PUNTO,
        PASA_ACT: exp.PASO_HORA_CHL,
        PASA_ANT: movilAnterior ? movilAnterior.PASO_HORA_CHL : null,
        INT_OBS: CALCULAR_INTERVALO_OBSERVADO(movilAnterior, pasadaExp),
        INT_EXI: null,
        INCUM: null,
        PPU_ACT: exp.PATENTE,
        PPU_ANT: movilAnterior ? movilAnterior.PATENTE : "",
        CODI_EXPED: exp.CODI_EXPE,
        TIPO_DIA: calcularTipoDia(exp.PASO_HORA_CHL),
        TIPO_ESTACIONALIDAD: "0",
      };
    })
    .map((item) => ({ ...item, INT_EXI: getExi(exigidos, item) }))
    .filter((item) => item.INT_EXI)
    .map((item) => ({
      ...item,
      INCUM: CALCULAR_IMCUMPLIMIENTO(item),
    }))
    .map((item) => ({
      ...item,
      INDICADOR: item.PASA_ANT ? calcularIndicador(item) : 0,
      HORA_PASADA_CHL: item.PASA_ANT
        ? item.HORA_PASADA_CHL
        : null,
    }));
};

const getExi = (exigidos, item) => {
  const finded = exigidos.find((obj) =>
    obj.SENTIDO == item.CODI_SENTI &&
    obj.NOMB_SERVI == item.NOM_SERV &&
    obj.PERIODO == parseInt(item.PERI_HORA) &&
    obj.TIPO_DIA == item.TIPO_DIA
  );

  if (finded) {
    return Math.round((60 / parseFloat(finded.EXIJIDO)) * 100) / 100;
  }
  return null;
};

const calcularIndicador = (item) => {
  let { INCUM, INT_EXI } = item;
  // let { INCUM, INT_EXI, PASA_ANT, PASA_ACT, INT_OBS } = item;
  let VALOR_INDICADOR = 0;

  if (INCUM >= INT_EXI) VALOR_INDICADOR = 0;
  if (INCUM <= (1/4) * INT_EXI) VALOR_INDICADOR = 1;
    else if (INCUM > (3 / 4) * INT_EXI && INCUM < INT_EXI)
      VALOR_INDICADOR = 0.25;
    else if (INCUM >= (1 / 2) * INT_EXI && INCUM <= (3 / 4) * INT_EXI)
      VALOR_INDICADOR = 0.5;
    else if (INCUM > (1 / 4) * INT_EXI && INCUM <= (1 / 2) * INT_EXI)
      VALOR_INDICADOR = 0.75;
  // }
  // let DATA_X = {ANTE: PASA_ANT, ACTU: PASA_ACT, OBSE: INT_OBS, EXIG: INT_EXI, INCUM:INCUM, INDI: VALOR_INDICADOR};
  // console.table(DATA_X);
  return VALOR_INDICADOR;
};

const CALCULAR_INTERVALO_OBSERVADO = (movilAnterior, pasadaExp) => {
  let INT_OBS = movilAnterior
  ? Math.round( pasadaExp.diff( moment(movilAnterior.PASO_HORA_CHL, "DD/MM/YYYY HH:mm:ss"), "minutes", true ) * 100) / 100
  : "0"
  return INT_OBS;
}

const CALCULAR_IMCUMPLIMIENTO = ({ INT_OBS, INT_EXI }) => {
  //RETORNA DIFERENCIA ENTRE IntOBS y IntEXI
  //INCUMPLIMIENTO = IntOBS - IntExi
  let DIFERENCIA;
  DIFERENCIA = Math.round( (parseFloat(INT_OBS) - parseFloat(INT_EXI)) * 100) / 100;
  return DIFERENCIA;
};

const filtrarExpediciones = (list) => {
  let expedicionesAnalizadas = list;
  let indiceRegistros = [];
  list.forEach((exp) => {
    const finded = indiceRegistros.findIndex(
      (item) =>
        item.dia == exp.PERI_DIA &&
        item.sentido == exp.CODI_SENTI &&
        item.service == exp.NOM_SERV &&
        item.periodo == exp.PERI_HORA &&
        item.pos == exp.POSI_PUNTO
    );

    if (finded != -1) {
      indiceRegistros[finded] = {
        ...indiceRegistros[finded],
        indiceRegistros: [...indiceRegistros[finded].indiceRegistros, exp],
      };
    } else {
      indiceRegistros.push({
        dia: exp.PERI_DIA,
        sentido: exp.CODI_SENTI,
        service: exp.NOM_SERV,
        periodo: exp.PERI_HORA,
        pos: exp.POSI_PUNTO,
        indiceRegistros: [exp],
      });
    }
  });
  
  expedicionesAnalizadas = indiceRegistros
    .map((ind) => ({
      ...ind,
      indiceRegistros: ORDENAR_LISTADO(ind.indiceRegistros)
        .map((item, i) => ({
          ...item,
          POSI_BUS: i + 1,
        })),
    }))
    .map((item) => item.indiceRegistros)
    .flat();

  return expedicionesAnalizadas;
};

const ORDENAR_LISTADO = (LISTADO_DESORDENADO) => {
  // let LISTADO_ORDENADO = LISTADO_DESORDENADO.sort((a, b) => 
  //   moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss")) ? 1
  //   : moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").isBefore(moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss")) ? -1
  //   : 0
  // );
  let LISTADO_ORDENADO = LISTADO_DESORDENADO.slice().sort((a, b) => 
    moment(b.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").format("YYYY/MM/DD HH:mm:ss") - 
    moment(a.HORA_PASADA_CHL, "DD/MM/YYYY HH:mm:ss").format("YYYY/MM/DD HH:mm:ss")
  );
  return LISTADO_ORDENADO;
}

start(URL_EXPEDICIONES);