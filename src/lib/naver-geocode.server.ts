import "server-only";

import { unstable_cache } from "next/cache";

const GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";

export type GeocodeVenueInput = {
  roadAddress?: string | null;
  jibunAddress?: string | null;
  locationName?: string | null;
  detailAddress?: string | null;
  location?: string | null;
};

export type NaverGeocodeCoords = { lat: number; lng: number };

/** geocode 시도 순서 — 도로명 단독 최우선 */
export function buildGeocodeQueries(input: GeocodeVenueInput): string[] {
  const name = input.locationName?.trim();
  const road = input.roadAddress?.trim();
  const jibun = input.jibunAddress?.trim();
  const detail = input.detailAddress?.trim();
  const loc = input.location?.trim();

  const queries: string[] = [];
  const push = (q: string | undefined) => {
    const t = q?.trim();
    if (t && !queries.includes(t)) queries.push(t);
  };

  push(road);
  if (road && detail) push(`${road} ${detail}`);
  push(jibun);
  if (name && road) push(`${name} ${road}`);
  push(name);
  push(loc);

  return queries;
}

type GeocodeApiResponse = {
  status?: string;
  addresses?: Array<{ x?: string; y?: string }>;
};

async function fetchGeocodeOnce(query: string): Promise<NaverGeocodeCoords | null> {
  const keyId = process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID?.trim();
  const keySecret = process.env.NAVER_MAP_NCP_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;

  try {
    const url = new URL(GEOCODE_URL);
    url.searchParams.set("query", query);

    const res = await fetch(url.toString(), {
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": keySecret,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn("[naver-geocode] request failed", res.status);
      return null;
    }

    const data = (await res.json()) as GeocodeApiResponse;
    if (data.status !== "OK") return null;

    const first = data.addresses?.[0];
    if (!first) return null;

    const lng = Number(first.x);
    const lat = Number(first.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    console.warn("[naver-geocode] fetch error");
    return null;
  }
}

async function geocodeVenueCoordinateUncached(
  input: GeocodeVenueInput,
): Promise<NaverGeocodeCoords | null> {
  const queries = buildGeocodeQueries(input);
  for (const query of queries) {
    const coords = await fetchGeocodeOnce(query);
    if (coords) return coords;
  }
  return null;
}

/**
 * 행사 장소 주소 → 좌표 (서버 Geocoding API).
 * key/secret 없거나 실패 시 null — public page는 fallback으로 처리.
 */
export async function geocodeVenueCoordinate(
  input: GeocodeVenueInput,
): Promise<NaverGeocodeCoords | null> {
  const queries = buildGeocodeQueries(input);
  if (queries.length === 0) return null;

  const cacheKey = queries.join("\0");

  return unstable_cache(
    () => geocodeVenueCoordinateUncached(input),
    ["naver-venue-geocode", cacheKey],
    { revalidate: 86_400 },
  )();
}
