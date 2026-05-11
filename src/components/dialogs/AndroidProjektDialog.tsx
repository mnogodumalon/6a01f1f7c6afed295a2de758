import { useState, useEffect, useRef, useCallback } from 'react';
import type { AndroidProjekt } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconArrowBigDownLinesFilled, IconCamera, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface AndroidProjektDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: AndroidProjekt['fields']) => Promise<void>;
  defaultValues?: AndroidProjekt['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function AndroidProjektDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: AndroidProjektDialogProps) {
  const [fields, setFields] = useState<Partial<AndroidProjekt['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'android_projekt');
      await onSubmit(clean as AndroidProjekt['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "paketname": string | null, // Paketname\n  "app_name": string | null, // App-Name\n  "beschreibung": string | null, // Beschreibung\n  "version": string | null, // Version\n  "min_android_version": LookupValue | null, // Minimale Android-Version (select one key: "android_8" | "android_9" | "android_10" | "android_11" | "android_12" | "android_13" | "android_14") mapping: android_8=Android 8.0 (Oreo), android_9=Android 9.0 (Pie), android_10=Android 10, android_11=Android 11, android_12=Android 12, android_13=Android 13, android_14=Android 14\n  "programmiersprache": LookupValue | null, // Programmiersprache (select one key: "kotlin" | "java" | "flutter" | "react_native" | "sonstige") mapping: kotlin=Kotlin, java=Java, flutter=Flutter/Dart, react_native=React Native, sonstige=Sonstige\n  "kategorien": LookupValue[] | null, // App-Kategorien (select one or more keys: "soziale_netzwerke" | "produktivitaet" | "unterhaltung" | "spiele" | "gesundheit_fitness" | "bildung" | "shopping" | "reisen" | "finanzen" | "sonstige_kategorie") mapping: soziale_netzwerke=Soziale Netzwerke, produktivitaet=Produktivität, unterhaltung=Unterhaltung, spiele=Spiele, gesundheit_fitness=Gesundheit & Fitness, bildung=Bildung, shopping=Shopping, reisen=Reisen, finanzen=Finanzen, sonstige_kategorie=Sonstige\n  "status": LookupValue | null, // Projektstatus (select one key: "planung" | "in_entwicklung" | "testing" | "veroeffentlicht" | "abgeschlossen") mapping: planung=Planung, in_entwicklung=In Entwicklung, testing=Testing, veroeffentlicht=Veröffentlicht, abgeschlossen=Abgeschlossen\n  "startdatum": string | null, // YYYY-MM-DD\n  "geplantes_release": string | null, // YYYY-MM-DD\n  "entwickler_vorname": string | null, // Entwickler Vorname\n  "entwickler_nachname": string | null, // Entwickler Nachname\n  "entwickler_email": string | null, // Entwickler E-Mail\n  "repository_url": string | null, // Repository-URL\n  "play_store_url": string | null, // Google Play Store URL\n  "notizen": string | null, // Notizen\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<AndroidProjekt['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, screenshot: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Android Projekt bearbeiten' : 'Android Projekt hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            <div className="flex justify-center pt-1">
              <IconArrowBigDownLinesFilled className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paketname">Paketname</Label>
            <Input
              id="paketname"
              value={fields.paketname ?? ''}
              onChange={e => setFields(f => ({ ...f, paketname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app_name">App-Name</Label>
            <Input
              id="app_name"
              value={fields.app_name ?? ''}
              onChange={e => setFields(f => ({ ...f, app_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={fields.version ?? ''}
              onChange={e => setFields(f => ({ ...f, version: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_android_version">Minimale Android-Version</Label>
            <Select
              value={lookupKey(fields.min_android_version) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, min_android_version: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="min_android_version"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="android_8">Android 8.0 (Oreo)</SelectItem>
                <SelectItem value="android_9">Android 9.0 (Pie)</SelectItem>
                <SelectItem value="android_10">Android 10</SelectItem>
                <SelectItem value="android_11">Android 11</SelectItem>
                <SelectItem value="android_12">Android 12</SelectItem>
                <SelectItem value="android_13">Android 13</SelectItem>
                <SelectItem value="android_14">Android 14</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="programmiersprache">Programmiersprache</Label>
            <Select
              value={lookupKey(fields.programmiersprache) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, programmiersprache: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="programmiersprache"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="kotlin">Kotlin</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="flutter">Flutter/Dart</SelectItem>
                <SelectItem value="react_native">React Native</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorien">App-Kategorien</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_soziale_netzwerke"
                  checked={lookupKeys(fields.kategorien).includes('soziale_netzwerke')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'soziale_netzwerke'] : current.filter(k => k !== 'soziale_netzwerke');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_soziale_netzwerke" className="font-normal">Soziale Netzwerke</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_produktivitaet"
                  checked={lookupKeys(fields.kategorien).includes('produktivitaet')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'produktivitaet'] : current.filter(k => k !== 'produktivitaet');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_produktivitaet" className="font-normal">Produktivität</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_unterhaltung"
                  checked={lookupKeys(fields.kategorien).includes('unterhaltung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'unterhaltung'] : current.filter(k => k !== 'unterhaltung');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_unterhaltung" className="font-normal">Unterhaltung</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_spiele"
                  checked={lookupKeys(fields.kategorien).includes('spiele')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'spiele'] : current.filter(k => k !== 'spiele');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_spiele" className="font-normal">Spiele</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_gesundheit_fitness"
                  checked={lookupKeys(fields.kategorien).includes('gesundheit_fitness')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'gesundheit_fitness'] : current.filter(k => k !== 'gesundheit_fitness');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_gesundheit_fitness" className="font-normal">Gesundheit & Fitness</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_bildung"
                  checked={lookupKeys(fields.kategorien).includes('bildung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'bildung'] : current.filter(k => k !== 'bildung');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_bildung" className="font-normal">Bildung</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_shopping"
                  checked={lookupKeys(fields.kategorien).includes('shopping')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'shopping'] : current.filter(k => k !== 'shopping');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_shopping" className="font-normal">Shopping</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_reisen"
                  checked={lookupKeys(fields.kategorien).includes('reisen')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'reisen'] : current.filter(k => k !== 'reisen');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_reisen" className="font-normal">Reisen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_finanzen"
                  checked={lookupKeys(fields.kategorien).includes('finanzen')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'finanzen'] : current.filter(k => k !== 'finanzen');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_finanzen" className="font-normal">Finanzen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kategorien_sonstige_kategorie"
                  checked={lookupKeys(fields.kategorien).includes('sonstige_kategorie')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.kategorien);
                      const next = checked ? [...current, 'sonstige_kategorie'] : current.filter(k => k !== 'sonstige_kategorie');
                      return { ...f, kategorien: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="kategorien_sonstige_kategorie" className="font-normal">Sonstige</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Projektstatus</Label>
            <Select
              value={lookupKey(fields.status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="planung">Planung</SelectItem>
                <SelectItem value="in_entwicklung">In Entwicklung</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="veroeffentlicht">Veröffentlicht</SelectItem>
                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startdatum">Startdatum</Label>
            <Input
              id="startdatum"
              type="date"
              value={fields.startdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, startdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geplantes_release">Geplantes Release-Datum</Label>
            <Input
              id="geplantes_release"
              type="date"
              value={fields.geplantes_release ?? ''}
              onChange={e => setFields(f => ({ ...f, geplantes_release: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entwickler_vorname">Entwickler Vorname</Label>
            <Input
              id="entwickler_vorname"
              value={fields.entwickler_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, entwickler_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entwickler_nachname">Entwickler Nachname</Label>
            <Input
              id="entwickler_nachname"
              value={fields.entwickler_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, entwickler_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entwickler_email">Entwickler E-Mail</Label>
            <Input
              id="entwickler_email"
              type="email"
              value={fields.entwickler_email ?? ''}
              onChange={e => setFields(f => ({ ...f, entwickler_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repository_url">Repository-URL</Label>
            <Input
              id="repository_url"
              value={fields.repository_url ?? ''}
              onChange={e => setFields(f => ({ ...f, repository_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="play_store_url">Google Play Store URL</Label>
            <Input
              id="play_store_url"
              value={fields.play_store_url ?? ''}
              onChange={e => setFields(f => ({ ...f, play_store_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="screenshot">Screenshot / Icon</Label>
            {fields.screenshot ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.screenshot}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.screenshot.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, screenshot: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, screenshot: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, screenshot: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}