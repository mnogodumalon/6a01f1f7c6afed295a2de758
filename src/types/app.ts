// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface AndroidProjekt {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    paketname?: string;
    app_name?: string;
    beschreibung?: string;
    version?: string;
    min_android_version?: LookupValue;
    programmiersprache?: LookupValue;
    kategorien?: LookupValue[];
    status?: LookupValue;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplantes_release?: string; // Format: YYYY-MM-DD oder ISO String
    entwickler_vorname?: string;
    entwickler_nachname?: string;
    entwickler_email?: string;
    repository_url?: string;
    play_store_url?: string;
    screenshot?: string;
    notizen?: string;
  };
}

export const APP_IDS = {
  ANDROID_PROJEKT: '6a01f1e2e4ac2b25939308e6',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'android_projekt': {
    min_android_version: [{ key: "android_8", label: "Android 8.0 (Oreo)" }, { key: "android_9", label: "Android 9.0 (Pie)" }, { key: "android_10", label: "Android 10" }, { key: "android_11", label: "Android 11" }, { key: "android_12", label: "Android 12" }, { key: "android_13", label: "Android 13" }, { key: "android_14", label: "Android 14" }],
    programmiersprache: [{ key: "kotlin", label: "Kotlin" }, { key: "java", label: "Java" }, { key: "flutter", label: "Flutter/Dart" }, { key: "react_native", label: "React Native" }, { key: "sonstige", label: "Sonstige" }],
    kategorien: [{ key: "soziale_netzwerke", label: "Soziale Netzwerke" }, { key: "produktivitaet", label: "Produktivität" }, { key: "unterhaltung", label: "Unterhaltung" }, { key: "spiele", label: "Spiele" }, { key: "gesundheit_fitness", label: "Gesundheit & Fitness" }, { key: "bildung", label: "Bildung" }, { key: "shopping", label: "Shopping" }, { key: "reisen", label: "Reisen" }, { key: "finanzen", label: "Finanzen" }, { key: "sonstige_kategorie", label: "Sonstige" }],
    status: [{ key: "planung", label: "Planung" }, { key: "in_entwicklung", label: "In Entwicklung" }, { key: "testing", label: "Testing" }, { key: "veroeffentlicht", label: "Veröffentlicht" }, { key: "abgeschlossen", label: "Abgeschlossen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'android_projekt': {
    'paketname': 'string/text',
    'app_name': 'string/text',
    'beschreibung': 'string/textarea',
    'version': 'string/text',
    'min_android_version': 'lookup/select',
    'programmiersprache': 'lookup/radio',
    'kategorien': 'multiplelookup/checkbox',
    'status': 'lookup/select',
    'startdatum': 'date/date',
    'geplantes_release': 'date/date',
    'entwickler_vorname': 'string/text',
    'entwickler_nachname': 'string/text',
    'entwickler_email': 'string/email',
    'repository_url': 'string/url',
    'play_store_url': 'string/url',
    'screenshot': 'file',
    'notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateAndroidProjekt = StripLookup<AndroidProjekt['fields']>;