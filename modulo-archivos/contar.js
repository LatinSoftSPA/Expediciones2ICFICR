const { obtenerDatos, crearArchivos } = require("../auxiliares/auxiliares.js");
const moment = require("moment");
const { v4: uuid } = require("uuid");
const { interpolarPuntos } = require("../auxiliares/interporlar.js");
const {
  getDistanceFromLatLonInKm,
  transFormValue,
} = require("../auxiliares/medir-distancia.js");

const main = async (archivos) => {
  let REGISTROS = [];

  for (const path of archivos) {
    const currentRegistros = await obtenerDatos(path);
    REGISTROS = [...REGISTROS, ...currentRegistros];
  }

  const validas = REGISTROS.filter(
    (item) => item.VALIDA == "0" && item.POSI_PUNTO == "1"
  );

  console.log(validas.length);
};

main([
  "RESULTADOS/primero.csv",
  // "RESULTADOS/segundo.csv",
  // "RESULTADOS/tercero.csv",
  // "RESULTADOS/cuarto.csv",
]);
