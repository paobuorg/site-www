import geographiclib from 'geographiclib-geodesic';

const { Geodesic } = geographiclib;

export interface Coordinate {
  lon: number;
  lat: number;
  elevation?: number | null;
}

export interface SegmentResult {
  meters: number;
  points: number;
  suspiciousJumps: number;
}

const WGS84 = Geodesic.WGS84;
const EARTH_RADIUS_METERS = 6371008.8;

export function isValidCoordinate(lon: number, lat: number): boolean {
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  if (!isValidCoordinate(a.lon, a.lat) || !isValidCoordinate(b.lon, b.lat)) {
    throw new Error('Invalid coordinate');
  }
  const result = WGS84.Inverse(a.lat, a.lon, b.lat, b.lon);
  if (result.s12 === undefined) throw new Error('Geodesic inverse did not return a distance');
  return result.s12;
}

export function segmentStats(points: Coordinate[]): SegmentResult {
  let meters = 0;
  let suspiciousJumps = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const delta = distanceMeters(previous, current);
    meters += delta;
    if (delta > 10000) suspiciousJumps += 1;
  }
  return { meters, points: points.length, suspiciousJumps };
}

export function totalDistance(segments: Coordinate[][]): number {
  return segments.reduce((sum, segment) => sum + segmentStats(segment).meters, 0);
}

export function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (minutes === undefined || seconds === undefined || seconds >= 60) return null;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours === undefined || minutes === undefined || seconds === undefined || minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—';
  return formatDuration(secondsPerKm);
}

export function formatDistance(meters: number, locale: 'zh-CN' | 'en' = 'en'): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters >= 1000) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: meters % 1000 === 0 ? 0 : 3 }).format(meters / 1000) + ' km';
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(meters) + ' m';
}

export function formatElevation(meters: number | null, locale: 'zh-CN' | 'en' = 'en'): string {
  if (meters === null || !Number.isFinite(meters)) return locale === 'zh-CN' ? '未知' : 'Unknown';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(meters) + ' m';
}

export function evenSplits(totalMeters: number, totalSeconds: number, unitMeters: number): Array<{ index: number; distanceMeters: number; cumulativeSeconds: number; segmentSeconds: number }> {
  if (!Number.isFinite(totalMeters) || totalMeters <= 0 || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    throw new Error('Distance and duration must be positive');
  }
  if (!Number.isFinite(unitMeters) || unitMeters <= 0) throw new Error('Unit must be positive');
  const count = Math.ceil(totalMeters / unitMeters);
  const pace = totalSeconds / totalMeters;
  const rows: Array<{ index: number; distanceMeters: number; cumulativeSeconds: number; segmentSeconds: number }> = [];
  let previousCumulative = 0;
  for (let index = 1; index <= count; index += 1) {
    const covered = Math.min(index * unitMeters, totalMeters);
    const cumulative = index === count ? totalSeconds : covered * pace;
    rows.push({
      index,
      distanceMeters: covered - (index - 1) * unitMeters,
      cumulativeSeconds: cumulative,
      segmentSeconds: cumulative - previousCumulative,
    });
    previousCumulative = cumulative;
  }
  return rows;
}

function localProject(points: Coordinate[]): Array<{ x: number; y: number }> {
  const lat0 = points.reduce((sum, point) => sum + point.lat, 0) / Math.max(points.length, 1);
  const cos = Math.cos((lat0 * Math.PI) / 180);
  return points.map((point) => ({
    x: ((point.lon * Math.PI) / 180) * EARTH_RADIUS_METERS * cos,
    y: ((point.lat * Math.PI) / 180) * EARTH_RADIUS_METERS,
  }));
}

function perpendicularDistanceMeters(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function simplifySegment(points: Coordinate[], toleranceMeters: number): Coordinate[] {
  if (points.length <= 2) return points.slice();
  const projected = localProject(points);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let furthest = -1;
    let maxDistance = 0;
    for (let index = start + 1; index < end; index += 1) {
      const distance = perpendicularDistanceMeters(projected[index]!, projected[start]!, projected[end]!);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = index;
      }
    }
    if (furthest !== -1 && maxDistance > toleranceMeters) {
      keep[furthest] = 1;
      stack.push([start, furthest], [furthest, end]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

export function canSimplify(points: Coordinate[]): { ok: boolean; reason?: 'extent' | 'antimeridian' | 'latitude' } {
  let minLat = 90;
  let maxLat = -90;
  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }
  if (Math.abs(minLat) > 85 || Math.abs(maxLat) > 85) return { ok: false, reason: 'latitude' };
  let minLon = 180;
  let maxLon = -180;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
    const previous = points[index - 1];
    if (previous && Math.abs(point.lon - previous.lon) > 180) return { ok: false, reason: 'antimeridian' };
  }
  if (maxLon - minLon > 180) return { ok: false, reason: 'antimeridian' };
  const midLat = (minLat + maxLat) / 2;
  const width = ((maxLon - minLon) * Math.PI / 180) * EARTH_RADIUS_METERS * Math.cos((midLat * Math.PI) / 180);
  const height = ((maxLat - minLat) * Math.PI / 180) * EARTH_RADIUS_METERS;
  if (Math.hypot(width, height) > 500000) return { ok: false, reason: 'extent' };
  return { ok: true };
}

export function simplifyTrack(segments: Coordinate[][], toleranceMeters: number): Coordinate[][] {
  if (!Number.isFinite(toleranceMeters) || toleranceMeters < 1 || toleranceMeters > 100) {
    throw new Error('Tolerance must be between 1 and 100 metres');
  }
  return segments.map((segment) => simplifySegment(segment, toleranceMeters));
}
