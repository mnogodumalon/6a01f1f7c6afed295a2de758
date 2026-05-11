import { useDashboardData } from '@/hooks/useDashboardData';
import type { AndroidProjekt } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AndroidProjektDialog } from '@/components/dialogs/AndroidProjektDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconBrandAndroid,
  IconCode, IconRocket, IconFlask, IconPackage, IconCircleCheck,
  IconCalendar, IconExternalLink, IconUser,
} from '@tabler/icons-react';

const STATUS_COLS = LOOKUP_OPTIONS['android_projekt']['status'] as { key: string; label: string }[];

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  planung: {
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    icon: <IconCode size={15} className="text-violet-500 shrink-0" />,
  },
  in_entwicklung: {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <IconBrandAndroid size={15} className="text-blue-500 shrink-0" />,
  },
  testing: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <IconFlask size={15} className="text-amber-500 shrink-0" />,
  },
  veroeffentlicht: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <IconRocket size={15} className="text-emerald-500 shrink-0" />,
  },
  abgeschlossen: {
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: <IconCircleCheck size={15} className="text-slate-400 shrink-0" />,
  },
};

const LANG_CONFIG: Record<string, { color: string }> = {
  kotlin: { color: 'bg-purple-100 text-purple-700 border-purple-200' },
  java: { color: 'bg-orange-100 text-orange-700 border-orange-200' },
  flutter: { color: 'bg-sky-100 text-sky-700 border-sky-200' },
  react_native: { color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  sonstige: { color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function DashboardOverview() {
  const { androidProjekt, loading, error, fetchAll } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AndroidProjekt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AndroidProjekt | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = androidProjekt.length;
    const inDev = androidProjekt.filter(p => p.fields.status?.key === 'in_entwicklung').length;
    const published = androidProjekt.filter(p => p.fields.status?.key === 'veroeffentlicht').length;
    const testing = androidProjekt.filter(p => p.fields.status?.key === 'testing').length;
    return { total, inDev, published, testing };
  }, [androidProjekt]);

  const grouped = useMemo(() => {
    return STATUS_COLS.map(col => ({
      ...col,
      items: androidProjekt.filter(p =>
        statusFilter
          ? p.fields.status?.key === col.key && p.fields.status?.key === statusFilter
          : p.fields.status?.key === col.key
      ),
    }));
  }, [androidProjekt, statusFilter]);

  const handleCreate = async (fields: AndroidProjekt['fields']) => {
    await LivingAppsService.createAndroidProjektEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: AndroidProjekt['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateAndroidProjektEntry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteAndroidProjektEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  };

  const handleMoveStatus = async (project: AndroidProjekt, newStatusKey: string) => {
    await LivingAppsService.updateAndroidProjektEntry(project.record_id, { status: newStatusKey });
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projekt-Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{androidProjekt.length} Android-Projekte verwalten</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="gap-2 shrink-0">
          <IconPlus size={16} className="shrink-0" />
          <span>Neues Projekt</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.total)}
          description="Projekte"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="In Entwicklung"
          value={String(stats.inDev)}
          description="Aktive Projekte"
          icon={<IconBrandAndroid size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Testing"
          value={String(stats.testing)}
          description="Werden getestet"
          icon={<IconFlask size={18} className="text-amber-500" />}
        />
        <StatCard
          title="Veröffentlicht"
          value={String(stats.published)}
          description="Im Play Store"
          icon={<IconRocket size={18} className="text-emerald-500" />}
        />
      </div>

      {/* Status-Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Alle
        </button>
        {STATUS_COLS.map(col => {
          const cfg = STATUS_CONFIG[col.key];
          const count = androidProjekt.filter(p => p.fields.status?.key === col.key).length;
          return (
            <button
              key={col.key}
              onClick={() => setStatusFilter(statusFilter === col.key ? null : col.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                statusFilter === col.key
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              {cfg.icon}
              {col.label}
              {count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  statusFilter === col.key ? cfg.bg : 'bg-background/80'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[900px]">
          {grouped.map(col => {
            const cfg = STATUS_CONFIG[col.key];
            return (
              <div key={col.key} className="flex-1 min-w-[200px]">
                {/* Column Header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 border ${cfg.bg} ${cfg.border}`}>
                  {cfg.icon}
                  <span className={`text-sm font-semibold ${cfg.color}`}>{col.label}</span>
                  <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {col.items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {col.items.map(project => (
                    <ProjectCard
                      key={project.record_id}
                      project={project}
                      statusCols={STATUS_COLS}
                      onEdit={() => { setEditRecord(project); setDialogOpen(true); }}
                      onDelete={() => setDeleteTarget(project)}
                      onMove={handleMoveStatus}
                    />
                  ))}

                  {/* Add button at bottom of column */}
                  <button
                    onClick={() => { setEditRecord(null); setDialogOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <IconPlus size={14} className="shrink-0" />
                    Hinzufügen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {androidProjekt.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <IconBrandAndroid size={32} className="text-muted-foreground" stroke={1.5} />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground mb-1">Keine Projekte vorhanden</h3>
            <p className="text-sm text-muted-foreground">Erstelle dein erstes Android-Projekt.</p>
          </div>
          <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} size="sm" className="gap-2">
            <IconPlus size={14} />
            Erstes Projekt erstellen
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AndroidProjektDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['AndroidProjekt']}
        enablePhotoLocation={AI_PHOTO_LOCATION['AndroidProjekt']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Projekt löschen"
        description={`Soll "${deleteTarget?.fields.app_name ?? 'dieses Projekt'}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  statusCols,
  onEdit,
  onDelete,
  onMove,
}: {
  project: AndroidProjekt;
  statusCols: { key: string; label: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onMove: (project: AndroidProjekt, newKey: string) => void;
}) {
  const f = project.fields;
  const currentIdx = statusCols.findIndex(s => s.key === f.status?.key);
  const prevStatus = currentIdx > 0 ? statusCols[currentIdx - 1] : null;
  const nextStatus = currentIdx < statusCols.length - 1 ? statusCols[currentIdx + 1] : null;
  const langKey = f.programmiersprache?.key ?? '';
  const langCfg = LANG_CONFIG[langKey];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-3 space-y-2.5 overflow-hidden">
      {/* Top row: icon/screenshot + name */}
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {f.screenshot ? (
            <img src={f.screenshot} alt={f.app_name ?? ''} className="w-full h-full object-cover" />
          ) : (
            <IconBrandAndroid size={20} className="text-muted-foreground" stroke={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate leading-tight">
            {f.app_name ?? '—'}
          </p>
          {f.paketname && (
            <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">{f.paketname}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {f.beschreibung && (
        <p className="text-xs text-muted-foreground line-clamp-2">{f.beschreibung}</p>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        {f.version && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-xs text-muted-foreground font-mono border border-border">
            v{f.version}
          </span>
        )}
        {f.programmiersprache && langCfg && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium border ${langCfg.color}`}>
            {f.programmiersprache.label}
          </span>
        )}
        {f.min_android_version && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-xs text-muted-foreground border border-border">
            {f.min_android_version.label}
          </span>
        )}
      </div>

      {/* Categories */}
      {f.kategorien && f.kategorien.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {f.kategorien.slice(0, 2).map(k => (
            <Badge key={k.key} variant="secondary" className="text-xs px-1.5 py-0">{k.label}</Badge>
          ))}
          {f.kategorien.length > 2 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">+{f.kategorien.length - 2}</Badge>
          )}
        </div>
      )}

      {/* Developer */}
      {(f.entwickler_vorname || f.entwickler_nachname) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconUser size={12} className="shrink-0" />
          <span className="truncate">{[f.entwickler_vorname, f.entwickler_nachname].filter(Boolean).join(' ')}</span>
        </div>
      )}

      {/* Dates */}
      {(f.startdatum || f.geplantes_release) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {f.startdatum && (
            <span className="flex items-center gap-1">
              <IconCalendar size={11} className="shrink-0" />
              {formatDate(f.startdatum)}
            </span>
          )}
          {f.geplantes_release && (
            <span className="flex items-center gap-1 text-amber-600">
              <IconRocket size={11} className="shrink-0" />
              {formatDate(f.geplantes_release)}
            </span>
          )}
        </div>
      )}

      {/* Links */}
      {(f.repository_url || f.play_store_url) && (
        <div className="flex items-center gap-2 flex-wrap">
          {f.repository_url && (
            <a
              href={f.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={e => e.stopPropagation()}
            >
              <IconExternalLink size={11} className="shrink-0" />
              Repository
            </a>
          )}
          {f.play_store_url && (
            <a
              href={f.play_store_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              <IconExternalLink size={11} className="shrink-0" />
              Play Store
            </a>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/60">
        {/* Move left */}
        {prevStatus && (
          <button
            onClick={() => onMove(project, prevStatus.key)}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title={`Zurück: ${prevStatus.label}`}
          >
            ← <span className="hidden sm:inline truncate">{prevStatus.label}</span>
          </button>
        )}
        {!prevStatus && <div className="flex-1" />}

        {/* Edit */}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Bearbeiten"
        >
          <IconPencil size={14} />
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Löschen"
        >
          <IconTrash size={14} />
        </button>

        {/* Move right */}
        {nextStatus && (
          <button
            onClick={() => onMove(project, nextStatus.key)}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title={`Weiter: ${nextStatus.label}`}
          >
            <span className="hidden sm:inline truncate">{nextStatus.label}</span> →
          </button>
        )}
        {!nextStatus && <div className="flex-1" />}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-4 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 min-w-[200px] space-y-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error ─────────────────────────────────────────────────────────────────────

const APPGROUP_ID = '6a01f1f7c6afed295a2de758';
const REPAIR_ENDPOINT = '/claude/build/repair';

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
