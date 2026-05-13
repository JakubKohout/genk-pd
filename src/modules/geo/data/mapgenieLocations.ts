import rawData from '../../../../docs/mapgenie-data/filtered.json';

export interface MapGenieLocation {
  id: number;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  category_id: number;
  category_title: string | null;
  group_title: string | null;
}

export const MG_LOCATIONS: readonly MapGenieLocation[] =
  rawData as MapGenieLocation[];

export const MG_LOCATION_BY_ID: ReadonlyMap<number, MapGenieLocation> = new Map(
  MG_LOCATIONS.map((l) => [l.id, l]),
);
