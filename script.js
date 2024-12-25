const F = 1 / 298.257223563;
const E = Math.sqrt(F * (2 - F));

const conformalLatitude = lat =>
   Math.asin(Math.tanh(
      Math.atanh(Math.sin(lat)) - E * Math.atanh(E * Math.sin(lat))
   ));

const projectToSphereCartesian = ([lng, lat]) => {
   const
      t = lng / 180 * Math.PI,
      u = conformalLatitude(lat / 180 * Math.PI);
   const
      a = Math.cos(t), b = Math.sin(t),
      c = Math.cos(u), d = Math.sin(u);
   return [a * c, b * c, d];
};

const rotation = (lng, lat, tilt) => {
   const
      t = lng / 180 * Math.PI,
      u = lat / 180 * Math.PI,
      v = -tilt / 180 * Math.PI;
   const
      a = Math.cos(t), b = Math.sin(t),
      c = Math.cos(u), d = Math.sin(u),
      e = Math.cos(v), f = Math.sin(v);
   return [
      [         a * c    ,         b * c    ,  d    ],
      [-b * e + a * d * f, a * e + b * d * f, -c * f],
      [-b * f - a * d * e, a * f - b * d * e,  c * e],
   ];
};

const MAP_BOUND_RECT = [-180, -180, 360, 360];
const OUT_OF_MAP = 185;

const projectToPlane = (mat, point) => {
   const [x, y, z] = [
      mat[0][0] * point[0] + mat[0][1] * point[1] + mat[0][2] * point[2],
      mat[1][0] * point[0] + mat[1][1] * point[1] + mat[1][2] * point[2],
      mat[2][0] * point[0] + mat[2][1] * point[1] + mat[2][2] * point[2],
   ];
   return [
      Math.atan2(y, x) / Math.PI * 180,
      Math.max(Math.min(Math.atanh(z) / Math.PI * 180, OUT_OF_MAP), -OUT_OF_MAP),
   ];
};

const MapData = class {
   constructor() {
      this.points3D = [];
      this.points2D = [];
      this.shapes = {};
   }

   async load(name, file) {
      const url = new URL(file, import.meta.url);
      const buffer = await (await fetch(url)).arrayBuffer();
      const lines = [];
      let offset = 100; // skip file header
      while (offset < buffer.byteLength) {
         offset += 8; // skip record header
         const view = new DataView(buffer, offset);
         const numParts = view.getInt32(36, true);
         const numPoints = view.getInt32(40, true);
         const partIndices = [];
         for (let i = 0; i < numParts; ++i) {
            partIndices.push(view.getInt32(44 + 4 * i, true));
         }
         partIndices.push(numPoints);
         const base = 44 + 4 * numParts;
         let index = 0;
         for (let i = 0; i < numParts; ++i) {
            const points = [];
            do {
               const lng = view.getFloat64(base + 16 * index, true);
               const lat = view.getFloat64(base + 16 * index + 8, true);
               points.push(this.points3D.length);
               this.points3D.push(projectToSphereCartesian([lng, lat]));
               ++index;
            } while (index < partIndices[i + 1]);
            lines.push(points);
         }
         offset += base + 16 * numPoints;
      }
      this.shapes[name] = lines;
   }

   projectWithRotation(lng, lat, tilt) {
      const mat = rotation(lng, lat, tilt);
      this.points2D = this.points3D.map(p => projectToPlane(mat, p));
   }

   getPath2D(name) {
      const lines = this.shapes[name];
      const path = new Path2D();
      for (const points of lines) {
         path.moveTo(...this.points2D[points[0]]);
         for (let i = 1; i < points.length; ++i) {
            const from = this.points2D[points[i - 1]];
            const to = this.points2D[points[i]];
            // split at 180° meridian
            if (to[0] < -90 && 90 < from[0]) {
               path.lineTo(360 + to[0], to[1]);
               path.moveTo(-360 + from[0], from[1]);
            } else if (from[0] < -90 && 90 < to[0]) {
               path.lineTo(-360 + to[0], to[1]);
               path.moveTo(360 + from[0], from[1]);
            }
            path.lineTo(...to);
         }
      }
      return path;
   }
};

{
   const canvas = document.getElementById("map");
   const inputs = [
      document.getElementById("lng"),
      document.getElementById("lat"),
      document.getElementById("tilt"),
   ];
   const text = document.getElementById("text");
   const randBtn = document.getElementById("rand");
   const copyTextBtn = document.getElementById("copy-text");
   const copyImgBtn = document.getElementById("copy-img");

   const context = canvas.getContext("2d");
   {
      const scale = 2;
      // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#scaling_for_high_resolution_displays
      const dpr = devicePixelRatio;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.scale(dpr * scale, dpr * -scale);
      context.translate(180, -180);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
   }

   const data = new MapData();
   {
      await data.load("coastline", "ne_110m_coastline.shp");
      await data.load("boundary", "ne_110m_admin_0_boundary_lines_land.shp");
      await data.load("lakes", "ne_110m_lakes.shp");
      await data.load("graticules", "ne_110m_graticules_30.shp");
   }

   const update = () => {
      for (const elem of inputs) {
         if (!elem.reportValidity()) return;
      }
      const params = [+inputs[0].value, +inputs[1].value, +inputs[2].value];
      data.projectWithRotation(...params);
      context.clearRect(...MAP_BOUND_RECT);
      context.fillStyle = "#ffffff";
      context.fillRect(...MAP_BOUND_RECT);
      context.lineWidth = 0.5;
      context.strokeStyle = "#000000";
      context.stroke(data.getPath2D("coastline"));
      context.stroke(data.getPath2D("boundary"));
      context.strokeStyle = "#222222";
      context.stroke(data.getPath2D("lakes"));
      context.strokeStyle = "#cccccccc";
      context.stroke(data.getPath2D("graticules"));
      context.strokeStyle = "#000000";
      context.strokeRect(...MAP_BOUND_RECT);
      text.innerText = `\
斜めのメルカトル図法、斜めルカトル図法
${params[1] < 0 ? `${(-params[1]).toFixed(1)}°S` : `${params[1].toFixed(1)}°N`},\
${params[0] < 0 ? `${(-params[0]).toFixed(1)}°W` : `${params[0].toFixed(1)}°E`},\
${params[2].toFixed(1)}°
${location.href}?p=${params.join("_")}\
`;
   };
   inputs.forEach(elem => elem.addEventListener("input", update));

   const random = () => {
      for (const elem of inputs) {
         elem.value = (Math.random() * (+elem.max - +elem.min) + +elem.min).toFixed(1);
      }
      update();
   };
   randBtn.addEventListener("click", random);

   const copyText = () => {
      navigator.clipboard.writeText(text.innerText);
   };
   copyTextBtn.addEventListener("click", copyText);

   const copyImg = () => {
      canvas.toBlob(img => {
         if (img === null) return;
         navigator.clipboard.write([new ClipboardItem({[img.type]: img})]);
      });
   };
   copyImgBtn.addEventListener("click", copyImg);

   {
      const url = new URL(location.href);
      if (url.searchParams.has("p")) {
         [inputs[0].value, inputs[1].value, inputs[2].value] =
            url.searchParams.get("p").split("_");
         url.searchParams.delete("p");
         history.replaceState(null, "", url);
         update();
      } else {
         random();
      }
   }
}
