import moment from "moment";
import {
  obtenerDatos,
  crearArchivos,
  calcularTipoDia,
} from "../auxiliares/auxiliares.js";

// de ida 0.88
// de regreso 0.76
// CONSTANTES
const formatHora = "DD/MM/YYYY HH:mm:ss";

const headers = [
  { id: "DNI1", title: "DNI1" }, //👍
  { id: "DNI2", title: "DNI2" }, //👍
  { id: "UNID", title: "UNID" }, //👍
  { id: "PERI_MES", title: "PERI_MES" }, //👍
  { id: "INDICADOR", title: "INDICADOR" }, //👍
  { id: "ID_SERVI", title: "ID_SERVI" }, //👍
  { id: "NOM_SERV", title: "NOM_SERV" }, //👍
  { id: "CODI_SENTI", title: "CODI_SENTI" }, //👍
  { id: "PERIODO_DIA", title: "PERIODO_DIA" }, //👍
  { id: "PERIODO_HORA", title: "PERIODO_HORA" }, //👍
  { id: "EXI", title: "EXI" }, //👍
  { id: "OBS", title: "OBS" }, //👍
  { id: "DEMANDA", title: "DEMANDA" }, //👍
  { id: "TIPO_DIA", title: "TIPO_DIA" }, //👍
  { id: "TIPO_ESTACIONALIDAD", title: "TIPO_ESTACIONALIDAD" }, //👍
];

const crearArchivo3 = async () => {
  const exigidas = await obtenerDatos("auxiliares/exigidos.csv");
  const expediciones = await (
    await obtenerDatos("RESULTADOS/primero.csv")
  ).filter((item) => item.POSI_PUNTO == "1" && item.VALIDA == "0");

  let expedicionesUnicas = mapearObjeto(getExpedicionesUnicas(expediciones))
    .map((item, i) => {
      const datos = getExigidas(item, exigidas);
      return {
        ...item,
        ...datos,
        INDICADOR: Math.min(datos.EXI, item.OBS) / datos.EXI,
      };
    })
    .filter((item) => item.EXI);

  await crearArchivos({
    records: expedicionesUnicas,
    headers,
    pathResult: "RESULTADOS/frecuencia.csv",
  });
};

const getExigidas = (exp, exigidos) => {
  const exigido = exigidos.find(
    (item) =>
      item.NOMB_SERVI == exp.NOM_SERV &&
      item.SENTIDO == exp.CODI_SENTI &&
      parseInt(item.PERIODO) == parseInt(exp.PERIODO_HORA) &&
      item.TIPO_DIA == exp.TIPO_DIA
  );

  return {
    EXI: exigido ? exigido.EXIJIDO : null,
    DEMANDA: exigido ? exigido.DEMANDA : null,
  };
};

// obtener expedicionesUnicas
const getExpedicionesUnicas = (list) => {
  // NOMBRE_SERVI, CODI_SENTI, PERIODO_HORA,FECH_CHI (DIA)

  let newUniques = [];

  list.forEach((item) =>
    !newUniques.find(
      (item2) =>
        item2.NOMBRE_SERVI == item.NOMBRE_SERVI &&
        item2.CODI_SENTI == item.CODI_SENTI &&
        item2.PERIODO_HORA == item.PERIODO_HORA &&
        moment(item2.FECH_CHI, formatHora).isSame(
          moment(item.FECH_CHI, formatHora),
          "days"
        )
    )
      ? newUniques.push({
          NOMBRE_SERVI: item.NOMBRE_SERVI,
          ID_SERVI: item.ID_SERVI,
          CODI_SENTI: item.CODI_SENTI,
          PERIODO_HORA: item.PERIODO_HORA,
          FECH_CHI: item.FECH_CHI,
        })
      : null
  );

  return newUniques.map((exp) => {
    return {
      ...exp,
      expediciones: list.filter(
        (item) =>
          exp.NOMBRE_SERVI == item.NOMBRE_SERVI &&
          exp.CODI_SENTI == item.CODI_SENTI &&
          exp.PERIODO_HORA == item.PERIODO_HORA &&
          moment(exp.FECH_CHI, formatHora).isSame(
            moment(item.FECH_CHI, formatHora),
            "days"
          )
      ),
    };
  });
};

crearArchivo3();

const formatoFecha = "DD/MM/YYYY HH";
const mapearObjeto = (list) => {
  console.log(list[1]);

  return list
    .map((exp) => ({
      ...getDNI(exp),
      UNID: "UN04",
      PERI_MES: moment(exp.FECH_CHI, formatHora).format("YYYYMM"),
      INDICADOR: "",
      ID_SERVI: exp.ID_SERVI,
      NOM_SERV: exp.NOMBRE_SERVI,
      CODI_SENTI: exp.CODI_SENTI,
      PERIODO_DIA: moment(exp.FECH_CHI, formatHora).format("DD/MM/YYYY"),
      PERIODO_HORA: exp.PERIODO_HORA,
      TIPO_DIA: calcularTipoDia(exp.FECH_CHI),
      TIPO_ESTACIONALIDAD: "0",
      OBS: exp.expediciones.length,
    }))
    .sort((a, b) =>
      moment(`${a.PERIODO_DIA} ${a.PERIODO_HORA}`, formatoFecha).isAfter(
        moment(`${b.PERIODO_DIA} ${a.PERIODO_HORA}`, formatoFecha),
        "hour"
      )
        ? 1
        : moment(`${b.PERIODO_DIA} ${a.PERIODO_HORA}`, formatoFecha).isAfter(
            moment(`${a.PERIODO_DIA} ${a.PERIODO_HORA}`, formatoFecha),
            "hour"
          )
        ? -1
        : a.CODI_SENTI > b.CODI_SENTI
        ? 1
        : a.CODI_SENTI < b.CODI_SENTI
        ? -1
        : a.ID_SERVI - b.ID_SERVI
    );
};

const getDNI = (exp) => {
  const datos = exp.expediciones[0];

  if (datos) {
    return { DNI1: datos.DNI1, DNI2: datos.DNI2 };
  } else {
    return { DNI1: "", DNI2: "" };
  }
};
