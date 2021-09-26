import {
  point,
  Vector,
  circle,
  Line,
  Ray,
  segment,
  Arc,
  Box,
  Polygon,
  Matrix,
  PlanarSet,
} from "@flatten-js/core";
import projector from "ecef-projector";

const interceptar = ({
  pos,
  circunferencia: { latC, lngC, r },
  recta: { lat1, lng1, lat2, lng2 },
}) => {
  var pt1 = projector.project(lat1, lng1, 0.0);
  var pt2 = projector.project(lat2, lng2, 0.0);
  var centro = projector.project(latC, lngC, 0.0);

  const DATOS = {
    circunferencia: {
      x: centro[0],
      y: centro[1],
      r,
    },
    recta: {
      x1: pt1[0],
      y1: pt1[1],
      x2: pt2[0],
      y2: pt2[1],
    },
  };

  let recta = segment(
    DATOS.recta.x1,
    DATOS.recta.y1,
    DATOS.recta.x2,
    DATOS.recta.y2
  );
  let circunferencia = circle(
    point(DATOS.circunferencia.x, DATOS.circunferencia.y),
    DATOS.circunferencia.r
  );
  // if (pos == "18") console.log(DATOS);

  let ip = recta.intersect(circunferencia);
  return ip;
};
// // LAT is Y
// // LNG is X
// import LatLon from "geodesy/latlon-nvector-spherical.js";
// const interceptar = ({ p1, p2, pc }) => {
//   const point1 = new LatLon(p1.lat, p1.lng);
//   const point2 = new LatLon(p2.lat, p2.lng);
//   let result = new LatLon(pc.lat, pc.lng).isWithinExtent(point1, point2);

//   return result;
// };

export { interceptar };
