import {
  getDistanceFromLatLonInKm,
  transFormValue,
} from "./medir-distancia.js";
import moment from "moment";
import { interceptar } from "./interceptar.js";
const MIN_DISTANCE = 10;
const DISTANCIA_MINIMA = 500;
// CONDICION NO MAS DE 3000 metros entre los dos puntos a interpolar
// NO MAS DE 5 minutos entre los dos puntos a interpolar
// SI ALGUNA DE LAS DISTANCIA es 0 entonces no interpolar 🆗

const interpolarPuntos = ({ puntos = [], pt }) => {
  try {
    console.log("PUNTO DE CONTROL ", pt.pos);
    // DATOS GENERALES
    const master = puntos[0];

    // configurar la distancia hacia el punto de control en cada registro
    let distanciaPase = setearDistancia(puntos, pt);

    // ordenar los registros por tiempo
    distanciaPase = ordernarTiempo(distanciaPase);

    let listaIntercalada = [];

    for (let index = 0; index < distanciaPase.length; index++) {
      if (distanciaPase[index + 1]) {
        listaIntercalada.push({
          inicio: distanciaPase[index],
          fin: distanciaPase[index + 1],
        });
      }
    }

    const distanciaCorta = listaIntercalada
      .map((item) => [item.inicio.distancia, item.fin.distancia])
      .flat()
      .sort((a, b) => a - b)[0];

    // CUANDO LA DISTANCIA ES MENOR A LA MINIMA
    if (distanciaCorta <= MIN_DISTANCE) {
      const ptCercano = distanciaPase
        .filter((item) => item.distancia <= MIN_DISTANCE)
        .sort((a, b) => a.distancia - b.distancia)[0];

      return {
        uid: `${master.matricula}-${ptCercano.dateChile}`,
        dni: master.dni,
        dniSec: master.dniSec,
        periodo: master.periodo,
        idService: master.idService,
        nameService: master.nameService,
        codSentido: master.codSentido,
        imeiGps: master.imeiGps,
        matricula: master.matricula,
        dateChile: ptCercano.dateChile,
        dateUtc: ptCercano.dateUtc,
        anguloGps: master.anguloGps,
        lat: pt.lat,
        lng: pt.lng,
        speed: ptCercano.speed,
        extra2: master.extra2,
        extra3: master.extra3,
        extra4: master.extra4,
        extra5: master.extra5,
        valid: master.valid,
        extra6: master.extra6,
      };
    } else {
      const RESULTADOS = listaIntercalada

        .map((item) => {
          // PUNTOS
          const inicioLat = parseFloat(replaceComa(item.inicio.lat));
          const inicioLng = parseFloat(replaceComa(item.inicio.lng));
          const finLat = parseFloat(replaceComa(item.fin.lat));
          const finLng = parseFloat(replaceComa(item.fin.lng));
          const lat = parseFloat(replaceComa(pt.lat));
          const lng = parseFloat(replaceComa(pt.lng));

          return {
            inicio: `${inicioLat} ${inicioLng}`,
            inicio_distancia: item.inicio.distancia,
            inicio_fecha: item.inicio.dateChile,
            fin: `${finLat} ${finLng}`,

            fin_distancia: item.fin.distancia,
            fin_fecha: item.fin.dateChile,
            // angulo,
            inicioLat,
            inicioLng,
            finLat,
            finLng,
            lat,
            lng,
          };
        })
        .sort((a, b) =>
          a.inicio_distancia < b.inicio_distancia
            ? -1
            : a.inicio_distancia > b.inicio_distancia
            ? 1
            : a.fin_distancia < b.fin_distancia
            ? -1
            : a.fin_distancia > b.fin_distancia
            ? 1
            : 0
        )
        // .slice(0, 4)
        .map((exp) => ({
          ...exp,
          // interpolar: interceptar({
          //   p1: { lat: exp.inicioLat, lng: exp.inicioLng },
          //   p2: { lat: exp.finLat, lng: exp.finLng },
          //   pc: { lat: exp.lat, lng: exp.lng },
          // }),
          interpolar: [
            ...interceptar({
              pos: pt.pos,
              circunferencia: {
                latC: exp.lat,
                lngC: exp.lng,
                r: distanciaCorta * 0.29,
              },
              recta: {
                lat1: exp.inicioLat,
                lng1: exp.inicioLng,
                lat2: exp.finLat,
                lng2: exp.finLng,
              },
            }),
            ...interceptar({
              pos: pt.pos,
              circunferencia: {
                latC: exp.lat,
                lngC: exp.lng,
                r: distanciaCorta * 0.49,
              },
              recta: {
                lat1: exp.inicioLat,
                lng1: exp.inicioLng,
                lat2: exp.finLat,
                lng2: exp.finLng,
              },
            }),
            ...interceptar({
              pos: pt.pos,
              circunferencia: {
                latC: exp.lat,
                lngC: exp.lng,
                r: distanciaCorta * 0.8,
              },
              recta: {
                lat1: exp.inicioLat,
                lng1: exp.inicioLng,
                lat2: exp.finLat,
                lng2: exp.finLng,
              },
            }),
            ...interceptar({
              pos: pt.pos,
              circunferencia: {
                latC: exp.lat,
                lngC: exp.lng,
                r: distanciaCorta * 0.9,
              },
              recta: {
                lat1: exp.inicioLat,
                lng1: exp.inicioLng,
                lat2: exp.finLat,
                lng2: exp.finLng,
              },
            }),
          ],
        }))
        .filter((item) => item.interpolar.length);
      // if (pt.pos == "18") {
      //   console.table(RESULTADOS, [
      //     "inicio",
      //     "inicio_distancia",
      //     "inicio_fecha",
      //     "fin",
      //     "fin_distancia",
      //     "fin_fecha",
      //     "interpolar",
      //   ]);
      // }
      if (!RESULTADOS.length) {
        return null;
      } else {
        if (RESULTADOS.length == 1) {
          const interpolacion = RESULTADOS[0];

          const distanciaEntrePuntos =
            getDistanceFromLatLonInKm(
              transFormValue(interpolacion.inicioLat),
              transFormValue(interpolacion.inicioLng),
              transFormValue(interpolacion.finLat),
              transFormValue(interpolacion.finLng)
            ) / 1000;

          let initPoint = moment(
            interpolacion.inicio_fecha,
            "DD/MM/YYYY HH:mm:ss"
          );
          let finishPoint = moment(
            interpolacion.fin_fecha,
            "DD/MM/YYYY HH:mm:ss"
          );
          const tiempoEntrePuntos = initPoint.diff(finishPoint, "h", true);
          const tiempoEntrePuntosM = initPoint.diff(finishPoint, "m", true);
          // NO INTERPOLAR
          if (tiempoEntrePuntosM > 5) {
            return null;
          }

          const velocidad = Math.abs(
            Math.round(distanciaEntrePuntos / tiempoEntrePuntos)
          );

          while (initPoint.isSameOrBefore(finishPoint, "seconds")) {
            initPoint = initPoint.add(1, "second");
            finishPoint = finishPoint.subtract(1, "second");
          }

          const pasedTime = initPoint;

          if (velocidad > 72) {
            return null;
          }

          return {
            uid: `${master.matricula}-${pasedTime}`,
            dni: master.dni,
            dniSec: master.dniSec,
            periodo: master.periodo,
            idService: master.idService,
            nameService: master.nameService,
            codSentido: master.codSentido,
            imeiGps: master.imeiGps,
            matricula: master.matricula,
            dateChile: pasedTime.format("DD/MM/YYYY HH:mm:ss"),
            dateUtc: pasedTime.utc().format("DD/MM/YYYY HH:mm:ss"),
            anguloGps: master.anguloGps,
            lat: pt.lat,
            lng: pt.lng,
            speed: velocidad,
            extra2: master.extra2,
            extra3: master.extra3,
            extra4: master.extra4,
            extra5: master.extra5,
            valid: master.valid,
            extra6: master.extra6,
          };
        } else {
          const interpolaciones = RESULTADOS.sort(
            (a, b) =>
              moment(a.inicio_fecha, "DD/MM/YYYY HH:mm:ss") -
              moment(b.inicio_fecha, "DD/MM/YYYY HH:mm:ss")
          );

          const interpolacion1 = interpolaciones[0];
          const interpolacion2 = interpolaciones[1];

          const distanciaEntrePuntos =
            getDistanceFromLatLonInKm(
              transFormValue(interpolacion1.inicioLat),
              transFormValue(interpolacion1.inicioLng),
              transFormValue(interpolacion2.finLat),
              transFormValue(interpolacion2.finLng)
            ) / 1000;

          let initPoint = moment(
            interpolacion1.inicio_fecha,
            "DD/MM/YYYY HH:mm:ss"
          );
          let finishPoint = moment(
            interpolacion2.fin_fecha,
            "DD/MM/YYYY HH:mm:ss"
          );
          const tiempoEntrePuntos = initPoint.diff(finishPoint, "h", true);
          const tiempoEntrePuntosM = initPoint.diff(finishPoint, "m", true);
          // NO INTERPOLAR
          if (tiempoEntrePuntosM > 5) {
            return null;
          }
          const velocidad = Math.abs(
            Math.round(distanciaEntrePuntos / tiempoEntrePuntos)
          );

          while (initPoint.isSameOrBefore(finishPoint, "seconds")) {
            initPoint = initPoint.add(1, "second");
            finishPoint = finishPoint.subtract(1, "second");
          }

          const pasedTime = initPoint;

          if (velocidad > 72) {
            return null;
          }

          return {
            uid: `${master.matricula}-${pasedTime}`,
            dni: master.dni,
            dniSec: master.dniSec,
            periodo: master.periodo,
            idService: master.idService,
            nameService: master.nameService,
            codSentido: master.codSentido,
            imeiGps: master.imeiGps,
            matricula: master.matricula,
            dateChile: pasedTime.format("DD/MM/YYYY HH:mm:ss"),
            dateUtc: pasedTime.utc().format("DD/MM/YYYY HH:mm:ss"),
            anguloGps: master.anguloGps,
            lat: pt.lat,
            lng: pt.lng,
            speed: velocidad,
            extra2: master.extra2,
            extra3: master.extra3,
            extra4: master.extra4,
            extra5: master.extra5,
            valid: master.valid,
            extra6: master.extra6,
          };
        }
      }
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};
export { interpolarPuntos };

const setearDistancia = (list, pt) =>
  list.map((item) => {
    return {
      ...item,
      distancia: getDistanceFromLatLonInKm(
        transFormValue(pt.lat),
        transFormValue(pt.lng),
        transFormValue(item.lat),
        transFormValue(item.lng)
      ),
    };
  });
// .filter((item) => item.speed <= "72")
// .sort((a, b) => a.distancia - b.distancia);

const ordernarTiempo = (list) =>
  list.sort((a, b) =>
    moment(b.dateChile, "DD/MM/YYYY HH:mm:ss").isBefore(
      moment(a.dateChile, "DD/MM/YYYY HH:mm:ss"),
      "second"
    )
      ? 1
      : moment(a.dateChile, "DD/MM/YYYY HH:mm:ss").isBefore(
          moment(b.dateChile, "DD/MM/YYYY HH:mm:ss"),
          "second"
        )
      ? -1
      : 0
  );

function find_angle(A, B, C) {
  var AB = Math.sqrt(Math.pow(B.lat - A.lat, 2) + Math.pow(B.lng - A.lng, 2));
  var BC = Math.sqrt(Math.pow(B.lat - C.lat, 2) + Math.pow(B.lng - C.lng, 2));
  var AC = Math.sqrt(Math.pow(C.lat - A.lat, 2) + Math.pow(C.lng - A.lng, 2));
  return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
}

// const replaceComa = (text) => text.replace(",", ".");
const replaceComa = (text) => text.replace(",", ".");
