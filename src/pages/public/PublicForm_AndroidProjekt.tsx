import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a01f1e2e4ac2b25939308e6';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormAndroidProjekt() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Android Projekt — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
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
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
