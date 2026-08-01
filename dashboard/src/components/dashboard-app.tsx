"use client";

import {
  Activity,
  Home,
  Loader2,
  LogOut,
  Music2,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Workflow
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuildConfig } from "@/lib/guild-config";

import { DashboardLogin } from "@/components/dashboard-login";
import { CommandPalette } from "@/components/command-palette";
import { DashboardHealth } from "@/components/dashboard-health";
import { DashboardSignalBackdrop } from "@/components/signal-effects";
import { StudioHub } from "@/components/studio-hub";
import {
  signal38,
  type WatcherMode
} from "@/components/watcher-38";
import {
  HomeView,
  AutomationsView,
  MusicView,
  PreviewDrawer,
  type ConfigUpdater
} from "@/components/dashboard-views";
import {
  initials,
  type AutomationKey,
  type GuildPayload,
  type MeResponse,
  type PrimaryView
} from "@/components/dashboard-types";

const navigation: Array<{
  key: PrimaryView;
  label: string;
  icon: typeof Home;
}> = [
  { key: "home", label: "Home", icon: Home },
  { key: "automations", label: "Automations", icon: Workflow },
  { key: "music", label: "Music", icon: Music2 },
  { key: "studio", label: "Studio", icon: Palette }
];

const primaryViews = new Set<PrimaryView>([
  "home",
  "automations",
  "music",
  "studio"
]);

const automationKeys = new Set<AutomationKey>([
  "ai",
  "welcome",
  "goodbye",
  "roles",
  "tickets",
  "levels",
  "voice",
  "logs"
]);

function routeFromLocation() {
  if (typeof window === "undefined") {
    return {
      view: "home" as PrimaryView,
      automation: null as AutomationKey | null
    };
  }

  const params = new URLSearchParams(window.location.search);
  const rawView = params.get("view") as PrimaryView | null;
  const rawAutomation = params.get("automation") as AutomationKey | null;

  return {
    view: rawView && primaryViews.has(rawView) ? rawView : "home",
    automation:
      rawAutomation && automationKeys.has(rawAutomation)
        ? rawAutomation
        : null
  };
}

export function DashboardApp() {
  const initialRoute = useMemo(routeFromLocation, []);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [payload, setPayload] = useState<GuildPayload | null>(null);
  const [savedConfig, setSavedConfig] = useState<GuildConfig | null>(null);
  const [view, setView] = useState<PrimaryView>(initialRoute.view);
  const [automation, setAutomation] = useState<AutomationKey | null>(
    initialRoute.automation
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [studioFocused, setStudioFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedGuild = useMemo(
    () => me?.guilds.find((guild) => guild.id === selectedGuildId) ?? null,
    [me?.guilds, selectedGuildId]
  );

  const config = payload?.config ?? null;
  const channels = payload?.channels ?? [];
  const roles = payload?.roles ?? [];

  const updateRoute = useCallback(
    (
      nextView: PrimaryView,
      nextAutomation: AutomationKey | null,
      mode: "push" | "replace" = "push"
    ) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      params.set("view", nextView);

      if (nextAutomation) {
        params.set("automation", nextAutomation);
      } else {
        params.delete("automation");
      }

      if (selectedGuildId) params.set("guild", selectedGuildId);
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history[mode === "push" ? "pushState" : "replaceState"](
        null,
        "",
        url
      );
    },
    [selectedGuildId]
  );

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (response.status === 401) {
        setMe(null);
        return;
      }

      if (!response.ok) {
        setMe(null);
        setError(
          "Dashboard environment is incomplete. Check Discord OAuth and bot credentials."
        );
        return;
      }

      const nextMe = (await response.json()) as MeResponse;
      const requestedGuild =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("guild")
          : null;
      const initialGuild =
        nextMe.guilds.find((guild) => guild.id === requestedGuild)?.id ??
        nextMe.guilds[0]?.id ??
        "";

      setMe(nextMe);
      setSelectedGuildId(initialGuild);
      signal38("return");
    } catch {
      setMe(null);
      setError(
        "Could not reach the dashboard API. Check the service and try again."
      );
      signal38("save-error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGuild = useCallback(async (guildId: string) => {
    if (!guildId) return;
    setConfigLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/guilds/${guildId}/config`, {
        cache: "no-store"
      });

      if (!response.ok) {
        setError(
          "Could not load this server. Check bot permissions and Discord access."
        );
        return;
      }

      const nextPayload = (await response.json()) as GuildPayload;
      setPayload(nextPayload);
      setSavedConfig(structuredClone(nextPayload.config));
      setDirty(false);
    } catch {
      setError("Could not reach the server configuration API. Try again.");
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (selectedGuildId) {
      void loadGuild(selectedGuildId);
      updateRoute(view, automation, "replace");
    }
  }, [selectedGuildId, loadGuild]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };

    const popState = () => {
      const route = routeFromLocation();
      setView(route.view);
      setAutomation(route.automation);
      setPreviewOpen(false);
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", popState);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", popState);
    };
  }, [dirty]);

  useEffect(() => {
    const openCommandPalette = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", openCommandPalette);
    return () => window.removeEventListener("keydown", openCommandPalette);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2_800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (view !== "studio") setStudioFocused(false);
  }, [view]);

  useEffect(() => {
    let mode: WatcherMode = "loading";

    if (!loading && !me) {
      mode = "login";
    } else if (me?.guilds.length === 0) {
      mode = "empty";
    } else if (studioFocused) {
      mode = "studio-focus";
    } else if (view === "home") {
      mode = "dashboard";
    } else {
      mode = view;
    }

    signal38("context", { mode, silent: true });
  }, [loading, me, studioFocused, view]);

  const updateConfig: ConfigUpdater = (key, value) => {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        config: {
          ...current.config,
          [key]: value
        }
      };
    });
    setDirty(true);
  };

  async function saveConfig() {
    if (!selectedGuildId || !config) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/guilds/${selectedGuildId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        setError("Save failed. Check Supabase and bot access.");
        signal38("save-error");
        return;
      }

      const result = (await response.json()) as { config: GuildConfig };
      setPayload((current) =>
        current ? { ...current, config: result.config } : current
      );
      setSavedConfig(structuredClone(result.config));
      setDirty(false);
      setNotice("Changes saved");
      signal38("save-success");
    } catch {
      setError("Save failed because the dashboard API could not be reached.");
      signal38("save-error");
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    if (!savedConfig) return;
    setPayload((current) =>
      current
        ? { ...current, config: structuredClone(savedConfig) }
        : current
    );
    setDirty(false);
    setNotice("Changes discarded");
    signal38("discard");
  }

  function confirmNavigation() {
    return (
      !dirty ||
      window.confirm("Discard your unsaved changes and continue?")
    );
  }

  function navigate(nextView: PrimaryView) {
    if (nextView === view || !confirmNavigation()) return;
    if (dirty) discardChanges();
    setView(nextView);
    setAutomation(null);
    setPreviewOpen(false);
    updateRoute(nextView, null);
    signal38("navigate", { subject: nextView });
  }

  function openAutomation(key: AutomationKey) {
    if (view !== "automations" && !confirmNavigation()) return;
    if (view !== "automations" && dirty) discardChanges();
    setView("automations");
    setAutomation(key);
    setPreviewOpen(false);
    updateRoute("automations", key);
    signal38("navigate", { subject: key });
  }

  function selectAutomation(key: AutomationKey | null) {
    if (key === automation || !confirmNavigation()) return;
    if (dirty) discardChanges();
    setAutomation(key);
    setPreviewOpen(false);
    updateRoute("automations", key);
    signal38("navigate", { subject: key ?? "automations" });
  }

  function changeGuild(guildId: string) {
    if (guildId === selectedGuildId || !confirmNavigation()) return;
    if (dirty) discardChanges();
    setSelectedGuildId(guildId);
    setPreviewOpen(false);
    signal38("guild-change");
  }

  async function logout() {
    if (!confirmNavigation()) return;
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="minimal-loading">
        <img src="/brand/blunt38-logo.jpg" alt="" />
        <Loader2 size={18} className="spin" />
        <span>Connecting</span>
      </main>
    );
  }

  if (!me) {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const authFailed = params.get("auth") === "failed";
    const authMissingEnv = params.get("auth") === "missing-env";
    return (
      <DashboardLogin
        error={
          authMissingEnv
            ? "Local Discord login is not configured. Add dashboard/.env.local or use panel.eclipxse.in."
            : authFailed
            ? "Discord login failed. Check the OAuth redirect URI."
            : error
        }
      />
    );
  }

  if (me.guilds.length === 0) {
    return (
      <main className="minimal-empty">
        <img src="/brand/blunt38-logo.jpg" alt="" />
        <h1>No manageable servers</h1>
        <p>Invite blunt38 and give your account Manage Server permission.</p>
        <button type="button" onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </main>
    );
  }

  return (
    <main className={`control-app ${studioFocused ? "studio-focus" : ""}`}>
      <DashboardSignalBackdrop />
      <aside className="control-rail">
        <button
          className="control-logo"
          type="button"
          aria-label="Open home"
          onClick={() => navigate("home")}
        >
          <img src="/brand/blunt38-logo.jpg" alt="" />
        </button>

        <nav className="control-navigation" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.key ? "active" : ""}
                key={item.key}
                type="button"
                aria-label={item.label}
                data-label={item.label}
                onClick={() => navigate(item.key)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="control-account">
          <button
            className="account-avatar"
            type="button"
            aria-label={`Logout ${me.user.username}`}
            data-label="Logout"
            onClick={logout}
          >
            {me.user.avatar ? (
              <img src={me.user.avatar} alt="" />
            ) : (
              <span>{initials(me.user.username)}</span>
            )}
          </button>
        </div>
      </aside>

      <section className="control-main">
        <header className="control-topbar">
          <div className="guild-control">
            {selectedGuild?.icon ? (
              <img src={selectedGuild.icon} alt="" />
            ) : (
              <span>{initials(selectedGuild?.name ?? "Server")}</span>
            )}
            <label>
              <span>Server</span>
              <select
                value={selectedGuildId}
                onChange={(event) => changeGuild(event.target.value)}
              >
                {me.guilds.map((guild) => (
                  <option key={guild.id} value={guild.id}>
                    {guild.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="topbar-status">
            <button
              className="topbar-command"
              type="button"
              aria-label="Open command palette"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={16} />
              <span>Find</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="topbar-health"
              type="button"
              aria-label="Open service status"
              onClick={() => setHealthOpen(true)}
            >
              <Activity size={15} />
              <span>Status</span>
            </button>
            <button
              type="button"
              aria-label="Refresh server configuration"
              onClick={() => loadGuild(selectedGuildId)}
              disabled={configLoading}
            >
              <RefreshCw size={17} className={configLoading ? "spin" : ""} />
            </button>
          </div>
        </header>

        {error ? <div className="minimal-notice">{error}</div> : null}

        <div
          className={`control-content ${
            view === "studio" ? "studio-content" : ""
          }`}
          key={`${view}-${automation ?? "index"}-${selectedGuildId}`}
        >
          {configLoading || !config ? (
            <div className="minimal-content-loading">
              <Loader2 size={20} className="spin" />
              Loading server settings
            </div>
          ) : view === "home" ? (
            <HomeView
              config={config}
              channels={channels}
              roles={roles}
              onOpenAutomation={openAutomation}
              onNavigate={navigate}
            />
          ) : view === "automations" ? (
            <AutomationsView
              selected={automation}
              onSelect={selectAutomation}
              onPreview={() => setPreviewOpen(true)}
              config={config}
              channels={channels}
              roles={roles}
              updateConfig={updateConfig}
            />
          ) : view === "music" ? (
            <MusicView
              config={config}
              channels={channels}
              roles={roles}
              updateConfig={updateConfig}
            />
          ) : (
            <StudioHub
              guildId={selectedGuildId}
              guildName={selectedGuild?.name ?? "your server"}
              onFocusChange={setStudioFocused}
            />
          )}
        </div>
      </section>

      {config ? (
        <PreviewDrawer
          open={previewOpen}
          config={config}
          channels={channels}
          roles={roles}
          guildName={selectedGuild?.name ?? "your server"}
          automation={view === "automations" ? automation : null}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <DashboardHealth open={healthOpen} onClose={() => setHealthOpen(false)} />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={navigate}
        onAutomation={openAutomation}
        onCopied={setNotice}
      />

      {dirty ? (
        <div className="unsaved-bar" role="status">
          <span>Unsaved changes</span>
          <button type="button" onClick={discardChanges}>
            <RotateCcw size={16} />
            Discard
          </button>
          <button type="button" onClick={saveConfig} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save changes
          </button>
        </div>
      ) : null}

      {notice ? <div className="dashboard-toast" role="status">{notice}</div> : null}
    </main>
  );
}
