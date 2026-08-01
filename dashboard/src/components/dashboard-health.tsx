"use client";

import {
  Activity,
  Bot,
  CheckCircle2,
  Database,
  Headphones,
  Loader2,
  RefreshCw,
  TriangleAlert,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ServiceResult = {
  status: "online" | "degraded";
  latencyMs: number;
  detail: string;
};

type HealthPayload = {
  status: "online" | "degraded";
  checkedAt: string;
  dashboardUptimeSeconds: number;
  services: {
    discord: ServiceResult;
    database: ServiceResult;
    lavalink: ServiceResult;
  };
};

const serviceMeta = {
  discord: { label: "Discord", icon: Bot },
  database: { label: "Supabase", icon: Database },
  lavalink: { label: "Lavalink", icon: Headphones }
} as const;

function formatUptime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function DashboardHealth({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Health check failed");
      setPayload((await response.json()) as HealthPayload);
    } catch {
      setError("Could not inspect the services right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadHealth();
    const interval = window.setInterval(loadHealth, 30_000);
    return () => window.clearInterval(interval);
  }, [loadHealth, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="health-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="health-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Service status"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="minimal-eyebrow">Live diagnostics</span>
            <h2>System status</h2>
          </div>
          <button type="button" aria-label="Close service status" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className={`health-summary ${payload?.status ?? "checking"}`}>
          {loading && !payload ? (
            <Loader2 size={18} className="spin" />
          ) : payload?.status === "online" ? (
            <CheckCircle2 size={18} />
          ) : (
            <TriangleAlert size={18} />
          )}
          <span>
            <strong>
              {payload?.status === "online"
                ? "All systems operational"
                : payload
                  ? "A service needs attention"
                  : "Checking every service"}
            </strong>
            <small>Fresh checks run every 30 seconds.</small>
          </span>
        </div>

        {error ? <p className="health-error">{error}</p> : null}

        <div className="health-service-list">
          {payload
            ? (Object.keys(serviceMeta) as Array<keyof typeof serviceMeta>).map((key) => {
                const service = payload.services[key];
                const meta = serviceMeta[key];
                const Icon = meta.icon;
                return (
                  <div className="health-service" key={key}>
                    <Icon size={18} />
                    <span>
                      <strong>{meta.label}</strong>
                      <small>{service.detail}</small>
                    </span>
                    <div>
                      <span className={`health-dot ${service.status}`} />
                      <code>{service.latencyMs}ms</code>
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        <footer>
          <span>
            <Activity size={15} />
            Panel uptime {payload ? formatUptime(payload.dashboardUptimeSeconds) : "checking"}
          </span>
          <button type="button" onClick={loadHealth} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Check now
          </button>
        </footer>
      </aside>
    </div>
  );
}
