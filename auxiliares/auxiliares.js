import { createObjectCsvWriter as createCsvWriter } from "csv-writer";
import CSVToJSON from "csvtojson";
// import feriados from "./feriados";
import moment from "moment";
moment.locale("es");
const feriados = [];

const crearArchivos = async ({ records, headers, pathResult }) => {
  const fileWrite = createCsvWriter({
    path: pathResult,
    encoding: "utf8",
    fieldDelimiter: ";",
    header: headers,
  });

  await fileWrite.writeRecords(records);
};

const obtenerDatos = async (path) => {
  const datos = await CSVToJSON({ delimiter: ";" }).fromFile(path);

  return datos;
};


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

export { obtenerDatos, crearArchivos, calcularTipoDia };
