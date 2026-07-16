import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

const iconRetinaUrl = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

export type LatLng = [number, number];
export type ZoneKind = "crop" | "tree";
export type Zone = { kind: ZoneKind; points: LatLng[]; label?: string };

export const ZONE_STYLE: Record<ZoneKind, { color: string; fill: string; emoji: string; label: string }> = {
  crop: { color: "#556B2F", fill: "#8b9d2c", emoji: "🌾", label: "أرض زراعية" },
  tree: { color: "#8B5A2B", fill: "#c07a3c", emoji: "🌳", label: "أشجار" },
};

export type FarmMapProps = {
  center: LatLng;
  zones?: Zone[];
  activeKind?: ZoneKind;
  sensorPoints?: LatLng[];
  height?: number;
  onZonesChange?: (zones: Zone[]) => void;
  editable?: boolean;
  showNDVI?: boolean;
};

export function FarmMap({
  center, zones = [], activeKind = "crop", sensorPoints = [],
  height = 380, onZonesChange, editable = true, showNDVI = false,
}: FarmMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  const sensorLayerRef = useRef<L.LayerGroup | null>(null);
  const ndviLayerRef = useRef<L.TileLayer | null>(null);
  const activeKindRef = useRef<ZoneKind>(activeKind);
  const onChangeRef = useRef(onZonesChange);
  useEffect(() => { onChangeRef.current = onZonesChange; }, [onZonesChange]);
  useEffect(() => { activeKindRef.current = activeKind; }, [activeKind]);

  // Init map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView(center, 15);
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri", maxZoom: 19,
    });
    L.control.layers({ "خريطة": osm, "أقمار": sat }, {}).addTo(map);

    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnRef.current = drawn;
    sensorLayerRef.current = L.layerGroup().addTo(map);

    if (editable) {
      const emit = () => {
        const layers = drawn.getLayers();
        const out: Zone[] = layers.map((layer) => {
          const poly = layer as L.Polygon & { _agripenKind?: ZoneKind };
          const kind = poly._agripenKind ?? "crop";
          const latlngs = poly.getLatLngs()[0] as L.LatLng[];
          return { kind, points: latlngs.map((p) => [p.lat, p.lng] as LatLng) };
        });
        onChangeRef.current?.(out);
      };

      const makeDrawControl = () => {
        const style = ZONE_STYLE[activeKindRef.current];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new (L as any).Control.Draw({
          position: "topright",
          edit: { featureGroup: drawn, remove: true },
          draw: {
            polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: style.color, weight: 3, fillColor: style.fill, fillOpacity: 0.35 } },
            polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
          },
        });
      };

      let drawControl = makeDrawControl();
      map.addControl(drawControl);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        const kind = activeKindRef.current;
        const style = ZONE_STYLE[kind];
        (e.layer as L.Polygon).setStyle({ color: style.color, fillColor: style.fill, fillOpacity: 0.35, weight: 3 });
        (e.layer as L.Polygon & { _agripenKind?: ZoneKind })._agripenKind = kind;
        e.layer.bindTooltip(`${style.emoji} ${style.label}`, { permanent: false, direction: "top" });
        drawn.addLayer(e.layer);
        emit();
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on((L as any).Draw.Event.EDITED, emit);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on((L as any).Draw.Event.DELETED, emit);

      // Refresh draw control style when active kind changes externally
      (map as unknown as { __refreshDraw?: () => void }).__refreshDraw = () => {
        map.removeControl(drawControl);
        drawControl = makeDrawControl();
        map.addControl(drawControl);
      };
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh draw control color when kind changes
  useEffect(() => {
    const map = mapRef.current as unknown as { __refreshDraw?: () => void } | null;
    map?.__refreshDraw?.();
  }, [activeKind]);

  // Sync zones prop -> map
  useEffect(() => {
    const drawn = drawnRef.current;
    if (!drawn) return;
    drawn.clearLayers();
    if (!zones.length) return;
    const bounds = L.latLngBounds([]);
    for (const z of zones) {
      if (z.points.length < 3) continue;
      const s = ZONE_STYLE[z.kind];
      const poly = L.polygon(z.points, { color: s.color, fillColor: s.fill, fillOpacity: 0.35, weight: 3 });
      (poly as L.Polygon & { _agripenKind?: ZoneKind })._agripenKind = z.kind;
      poly.bindTooltip(`${s.emoji} ${s.label}`, { permanent: false, direction: "top" });
      drawn.addLayer(poly);
      z.points.forEach((p) => bounds.extend(p));
    }
    if (bounds.isValid()) mapRef.current?.fitBounds(bounds, { padding: [20, 20] });
  }, [zones]);

  // NDVI overlay toggle (NASA GIBS - MODIS Terra NDVI, free & public)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showNDVI && !ndviLayerRef.current) {
      const layer = L.tileLayer(
        "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2024-01-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
        { attribution: "NDVI &copy; NASA GIBS / MODIS", opacity: 0.55, maxZoom: 9 },
      );
      layer.addTo(map);
      ndviLayerRef.current = layer;
    } else if (!showNDVI && ndviLayerRef.current) {
      map.removeLayer(ndviLayerRef.current);
      ndviLayerRef.current = null;
    }
  }, [showNDVI]);

  // Sync sensor points
  useEffect(() => {
    const layer = sensorLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    sensorPoints.forEach((p, i) => {
      L.circleMarker(p, { radius: 7, color: "#fff", weight: 2, fillColor: "#f59e0b", fillOpacity: 1 })
        .bindTooltip(`نقطة ${i + 1}`, { permanent: false }).addTo(layer);
    });
  }, [sensorPoints]);

  return <div ref={mapDivRef} style={{ height, borderRadius: 24, overflow: "hidden" }} className="shadow-lg" />;
}

// Ray-casting: is point inside polygon
export function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  const [y, x] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    const intersect = ((xi > x) !== (xj > x)) && (y < ((yj - yi) * (x - xi)) / (xj - xi) + yi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function suggestSensorPoints(polygon: LatLng[], targetCount = 6): LatLng[] {
  if (polygon.length < 3) return [];
  const lats = polygon.map((p) => p[0]);
  const lngs = polygon.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const cols = Math.max(2, Math.ceil(Math.sqrt(targetCount)));
  const rows = Math.max(2, Math.ceil(targetCount / cols));
  const dLat = (maxLat - minLat) / (rows + 1);
  const dLng = (maxLng - minLng) / (cols + 1);
  const pts: LatLng[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const p: LatLng = [minLat + dLat * r, minLng + dLng * c];
      if (pointInPolygon(p, polygon)) pts.push(p);
    }
  }
  return pts.slice(0, targetCount);
}

export function polygonAreaHectares(polygon: LatLng[]): number {
  if (polygon.length < 3) return 0;
  const R = 6378137;
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[(i + 1) % polygon.length];
    sum += ((lng2 - lng1) * Math.PI / 180) * (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  const areaM2 = Math.abs((sum * R * R) / 2);
  return areaM2 / 10000;
}

// ---- GeoJSON <-> Zone[] helpers ----
type GeoPolygon = { type: "Polygon"; coordinates: number[][][] };
type GeoFeature = { type: "Feature"; geometry: GeoPolygon; properties?: { kind?: ZoneKind; label?: string } };
type GeoFC = { type: "FeatureCollection"; features: GeoFeature[] };
type GeoBoundary = GeoPolygon | GeoFC | null | undefined;

export function boundaryToZones(g: GeoBoundary): Zone[] {
  if (!g) return [];
  if (g.type === "Polygon") {
    const ring = g.coordinates[0] ?? [];
    return [{ kind: "crop", points: ring.map((c) => [c[1], c[0]] as LatLng) }];
  }
  if (g.type === "FeatureCollection") {
    return g.features.map((f) => ({
      kind: (f.properties?.kind ?? "crop") as ZoneKind,
      label: f.properties?.label,
      points: (f.geometry.coordinates[0] ?? []).map((c) => [c[1], c[0]] as LatLng),
    })).filter((z) => z.points.length >= 3);
  }
  return [];
}

export function zonesToBoundary(zones: Zone[]): GeoFC | null {
  if (!zones.length) return null;
  return {
    type: "FeatureCollection",
    features: zones.filter((z) => z.points.length >= 3).map((z) => {
      const ring = [...z.points.map((p) => [p[1], p[0]]), [z.points[0][1], z.points[0][0]]];
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: { kind: z.kind, label: z.label },
      } as GeoFeature;
    }),
  };
}
