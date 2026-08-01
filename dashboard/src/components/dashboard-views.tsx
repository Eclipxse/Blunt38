"use client";

import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Crown,
  DoorOpen,
  Eye,
  Headphones,
  ListChecks,
  MessageSquareText,
  Mic2,
  Palette,
  ScrollText,
  Sparkles,
  Ticket,
  Users,
  X
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { GuildConfig } from "@/lib/guild-config";

import {
  categoryChannels,
  colorOptions,
  displayChannel,
  displayRole,
  hexColor,
  personaOptions,
  textChannels,
  type AutomationKey,
  type Channel,
  type PrimaryView,
  type Role,
  voiceChannels
} from "@/components/dashboard-types";

export type ConfigUpdater = <K extends keyof GuildConfig>(
  key: K,
  value: GuildConfig[K]
) => void;

type BaseViewProps = {
  config: GuildConfig;
  channels: Channel[];
  roles: Role[];
  updateConfig: ConfigUpdater;
};

const automationMeta: Array<{
  key: AutomationKey;
  label: string;
  description: string;
  icon: typeof Bot;
}> = [
  {
    key: "ai",
    label: "AI reply",
    description: "Channel and personality",
    icon: Bot
  },
  {
    key: "welcome",
    label: "Welcome",
    description: "Greeting and birthdays",
    icon: Sparkles
  },
  {
    key: "goodbye",
    label: "Goodbye",
    description: "Departure channel and message",
    icon: DoorOpen
  },
  {
    key: "roles",
    label: "Member roles",
    description: "Autorole and verification",
    icon: Users
  },
  {
    key: "tickets",
    label: "Tickets",
    description: "Private support routing",
    icon: Ticket
  },
  {
    key: "levels",
    label: "Levels",
    description: "XP and announcements",
    icon: Crown
  },
  {
    key: "voice",
    label: "Temporary voice",
    description: "Join-to-create channels",
    icon: Mic2
  },
  {
    key: "logs",
    label: "Server logs",
    description: "Moderation events",
    icon: ScrollText
  }
];

export function HomeView({
  config,
  channels,
  roles,
  onOpenAutomation,
  onNavigate
}: Omit<BaseViewProps, "updateConfig"> & {
  onOpenAutomation: (key: AutomationKey) => void;
  onNavigate: (view: PrimaryView) => void;
}) {
  const systems = [
    {
      key: "ai" as const,
      label: "AI reply",
      enabled: config.aiResponderEnabled && Boolean(config.aiResponderChannelId),
      detail: config.aiResponderEnabled
        ? displayChannel(channels, config.aiResponderChannelId)
        : "Disabled"
    },
    {
      key: "welcome" as const,
      label: "Welcome messages",
      enabled: Boolean(config.welcomeChannelId),
      detail: displayChannel(channels, config.welcomeChannelId)
    },
    {
      key: "goodbye" as const,
      label: "Goodbye messages",
      enabled: Boolean(config.goodbyeChannelId),
      detail: displayChannel(channels, config.goodbyeChannelId)
    },
    {
      key: "tickets" as const,
      label: "Ticket desk",
      enabled: Boolean(config.ticketCategoryId && config.supportRoleId),
      detail: config.ticketCategoryId
        ? displayRole(roles, config.supportRoleId)
        : "Category not configured"
    },
    {
      key: "levels" as const,
      label: "Leveling",
      enabled: config.levelingEnabled,
      detail: config.levelingEnabled
        ? displayChannel(channels, config.levelUpChannelId)
        : "Disabled"
    },
    {
      key: "voice" as const,
      label: "Temporary voice",
      enabled: Boolean(config.tempVoiceJoinChannelId),
      detail: displayChannel(channels, config.tempVoiceJoinChannelId)
    }
  ];

  const attention = systems.filter((system) => !system.enabled);
  const active = systems.filter((system) => system.enabled);

  return (
    <div className="minimal-page">
      <PageHeading
        eyebrow="Home"
        title="Server control"
        description="Only the settings that need your attention."
      />

      {attention.length > 0 ? (
        <section className="minimal-section">
          <SectionHeading
            title="Needs attention"
            meta={`${attention.length} remaining`}
          />
          <div className="status-list">
            {attention.map((system) => (
              <button
                className="status-row"
                key={system.key}
                type="button"
                onClick={() => onOpenAutomation(system.key)}
              >
                <AlertCircle size={17} />
                <span>
                  <strong>{system.label}</strong>
                  <small>{system.detail}</small>
                </span>
                <span className="status-action">Configure</span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="minimal-complete">
          <Check size={18} />
          Everything important is configured.
        </section>
      )}

      <section className="minimal-section">
        <SectionHeading title="Active" meta={`${active.length} systems`} />
        <div className="status-list">
          {active.map((system) => (
            <button
              className="status-row active"
              key={system.key}
              type="button"
              onClick={() => onOpenAutomation(system.key)}
            >
              <span className="live-dot" />
              <span>
                <strong>{system.label}</strong>
                <small>{system.detail}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
          {active.length === 0 ? (
            <p className="empty-copy">No automations are active yet.</p>
          ) : null}
        </div>
      </section>

      <section className="minimal-section quick-section">
        <SectionHeading title="Quick actions" />
        <div className="quick-actions">
          <button type="button" onClick={() => onOpenAutomation("ai")}>
            <Bot size={17} />
            Configure AI
          </button>
          <button type="button" onClick={() => onOpenAutomation("welcome")}>
            <MessageSquareText size={17} />
            Edit welcome
          </button>
          <button type="button" onClick={() => onNavigate("studio")}>
            <Palette size={17} />
            Open Studio
          </button>
        </div>
      </section>
    </div>
  );
}

export function AutomationsView({
  selected,
  onSelect,
  onPreview,
  ...props
}: BaseViewProps & {
  selected: AutomationKey | null;
  onSelect: (key: AutomationKey | null) => void;
  onPreview: () => void;
}) {
  return (
    <div className="minimal-page automations-page">
      <PageHeading
        eyebrow="Automations"
        title={selected ? automationMeta.find((item) => item.key === selected)?.label ?? "Automation" : "Choose a system"}
        description={
          selected
            ? "Configure one workflow without the rest of the dashboard getting in the way."
            : "Select the part of your server you want blunt38 to handle."
        }
      />

      <div className={`automation-layout ${selected ? "has-selection" : ""}`}>
        <aside className="automation-list">
          {automationMeta.map((automation) => {
            const Icon = automation.icon;
            return (
              <button
                className={selected === automation.key ? "active" : ""}
                key={automation.key}
                type="button"
                onClick={() => onSelect(automation.key)}
              >
                <Icon size={17} />
                <span>
                  <strong>{automation.label}</strong>
                  <small>{automation.description}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </aside>

        <section className="automation-editor">
          {selected ? (
            <>
              <div className="mobile-editor-bar">
                <button type="button" onClick={() => onSelect(null)}>
                  <ArrowLeft size={17} />
                  Automations
                </button>
              </div>
              <AutomationEditor
                automation={selected}
                onPreview={onPreview}
                {...props}
              />
            </>
          ) : (
            <div className="editor-empty">
              <ListChecks size={24} />
              <strong>Select an automation</strong>
              <p>Its focused settings will open here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AutomationEditor({
  automation,
  config,
  channels,
  roles,
  updateConfig,
  onPreview
}: BaseViewProps & {
  automation: AutomationKey;
  onPreview: () => void;
}) {
  if (automation === "ai") {
    return (
      <EditorSurface
        title="AI reply"
        description="Reply automatically in one selected channel."
        action={
          <Toggle
            checked={config.aiResponderEnabled}
            label="Toggle AI reply"
            onChange={(value) => updateConfig("aiResponderEnabled", value)}
          />
        }
        preview={onPreview}
      >
        <SelectField
          label="Reply channel"
          value={config.aiResponderChannelId}
          options={textChannels(channels)}
          placeholder="Choose a channel"
          onChange={(value) => updateConfig("aiResponderChannelId", value)}
        />
        <div className="minimal-field">
          <span>Personality</span>
          <div className="minimal-segmented">
            {personaOptions.map((persona) => (
              <button
                className={
                  config.aiResponderPersona === persona.key ? "active" : ""
                }
                key={persona.key}
                type="button"
                onClick={() =>
                  updateConfig("aiResponderPersona", persona.key)
                }
              >
                {persona.label}
              </button>
            ))}
          </div>
        </div>
        <details className="advanced-settings">
          <summary>Advanced behavior</summary>
          <label className="minimal-field">
            <span>Custom instructions</span>
            <textarea
              value={config.aiResponderPrompt ?? ""}
              onChange={(event) =>
                updateConfig("aiResponderPrompt", event.target.value)
              }
            />
          </label>
        </details>
      </EditorSurface>
    );
  }

  if (automation === "welcome") {
    return (
      <EditorSurface
        title="Welcome"
        description="Greet new members and route birthday messages."
        preview={onPreview}
      >
        <SelectField
          label="Welcome channel"
          value={config.welcomeChannelId}
          options={textChannels(channels)}
          placeholder="Choose a channel"
          onChange={(value) => updateConfig("welcomeChannelId", value)}
        />
        <label className="minimal-field">
          <span>Welcome message</span>
          <textarea
            value={config.welcomeMessage ?? ""}
            onChange={(event) =>
              updateConfig("welcomeMessage", event.target.value)
            }
          />
          <small>Variables: {"{user}"} {"{server}"} {"{count}"}</small>
        </label>
        <details className="advanced-settings">
          <summary>Birthday messages</summary>
          <SelectField
            label="Birthday channel"
            value={config.birthdayChannelId}
            options={textChannels(channels)}
            placeholder="No birthday channel"
            onChange={(value) => updateConfig("birthdayChannelId", value)}
          />
        </details>
      </EditorSurface>
    );
  }

  if (automation === "goodbye") {
    return (
      <EditorSurface
        title="Goodbye"
        description="Send a final message when somebody leaves the server."
        preview={onPreview}
      >
        <SelectField
          label="Goodbye channel"
          value={config.goodbyeChannelId}
          options={textChannels(channels)}
          placeholder="Disabled"
          onChange={(value) => updateConfig("goodbyeChannelId", value)}
        />
        <label className="minimal-field">
          <span>Goodbye message</span>
          <textarea
            value={config.goodbyeMessage ?? ""}
            onChange={(event) =>
              updateConfig("goodbyeMessage", event.target.value)
            }
          />
          <small>
            Variables: {"{user}"} {"{username}"} {"{server}"} {"{count}"}
          </small>
        </label>
        <div className="minimal-note">
          <Palette size={18} />
          <span>
            Publishing a Goodbye design in Studio adds its card automatically.
            Text still sends if the card is unavailable.
          </span>
        </div>
      </EditorSurface>
    );
  }

  if (automation === "roles") {
    return (
      <EditorSurface
        title="Member roles"
        description="Assign roles when members join or verify."
        preview={onPreview}
      >
        <SelectField
          label="Autorole"
          value={config.autoRoleId}
          options={roles}
          placeholder="No autorole"
          onChange={(value) => updateConfig("autoRoleId", value)}
        />
        <SelectField
          label="Verified role"
          value={config.verifiedRoleId}
          options={roles}
          placeholder="No verified role"
          onChange={(value) => updateConfig("verifiedRoleId", value)}
        />
        <div className="minimal-field">
          <span>Embed accent</span>
          <div className="minimal-color-row">
            {colorOptions.map((color) => (
              <button
                className={
                  config.accentColor === color.value ? "active" : ""
                }
                key={color.value}
                type="button"
                aria-label={color.label}
                title={color.label}
                onClick={() => updateConfig("accentColor", color.value)}
              >
                <span style={{ background: hexColor(color.value) }} />
              </button>
            ))}
          </div>
        </div>
      </EditorSurface>
    );
  }

  if (automation === "tickets") {
    return (
      <EditorSurface
        title="Tickets"
        description="Create private support channels for members."
      >
        <SelectField
          label="Ticket category"
          value={config.ticketCategoryId}
          options={categoryChannels(channels)}
          placeholder="Choose a category"
          onChange={(value) => updateConfig("ticketCategoryId", value)}
        />
        <SelectField
          label="Support role"
          value={config.supportRoleId}
          options={roles}
          placeholder="Choose a staff role"
          onChange={(value) => updateConfig("supportRoleId", value)}
        />
      </EditorSurface>
    );
  }

  if (automation === "levels") {
    return (
      <EditorSurface
        title="Levels"
        description="Track activity and announce member progress."
        action={
          <Toggle
            checked={config.levelingEnabled}
            label="Toggle leveling"
            onChange={(value) => updateConfig("levelingEnabled", value)}
          />
        }
      >
        <SelectField
          label="Level-up channel"
          value={config.levelUpChannelId}
          options={textChannels(channels)}
          placeholder="Reply where the member spoke"
          onChange={(value) => updateConfig("levelUpChannelId", value)}
        />
        <SelectField
          label="Reward role anchor"
          value={config.verifiedRoleId}
          options={roles}
          placeholder="No reward role"
          onChange={(value) => updateConfig("verifiedRoleId", value)}
        />
      </EditorSurface>
    );
  }

  if (automation === "voice") {
    return (
      <EditorSurface
        title="Temporary voice"
        description="Create a private voice channel when somebody joins."
      >
        <SelectField
          label="Join-to-create channel"
          value={config.tempVoiceJoinChannelId}
          options={voiceChannels(channels)}
          placeholder="Choose a voice channel"
          onChange={(value) =>
            updateConfig("tempVoiceJoinChannelId", value)
          }
        />
        <SelectField
          label="New channel category"
          value={config.tempVoiceCategoryId}
          options={categoryChannels(channels)}
          placeholder="Choose a category"
          onChange={(value) => updateConfig("tempVoiceCategoryId", value)}
        />
      </EditorSurface>
    );
  }

  return (
    <EditorSurface
      title="Server logs"
      description="Send moderation and staff events to one channel."
    >
      <SelectField
        label="Log channel"
        value={config.logChannelId}
        options={textChannels(channels)}
        placeholder="Choose a channel"
        onChange={(value) => updateConfig("logChannelId", value)}
      />
    </EditorSurface>
  );
}

export function MusicView({
  config,
  channels: _channels,
  roles,
  updateConfig
}: BaseViewProps) {
  const commands = [
    ["/music play", "Search or paste a link"],
    ["/music search", "Choose the exact result"],
    ["/music queue", "See what plays next"],
    ["/music loop", "Repeat a track or queue"],
    ["/music seek", "Jump to a timestamp"],
    ["/music filters", "Shape the current sound"],
    ["/music autoplay", "Keep related tracks coming"],
    ["/music previous", "Return to the last track"],
    ["/music move", "Reorder the queue"],
    ["/music clear", "Clear upcoming tracks"],
    ["/music skip", "Move to the next track"]
  ];

  return (
    <div className="minimal-page">
      <PageHeading
        eyebrow="Music"
        title="Voice controls"
        description="Playback stays inside Discord. This is the command map."
      />

      <EditorSurface
        title="Player defaults"
        description="These settings apply whenever a fresh voice player starts."
        action={
          <Toggle
            checked={config.musicAutoplayEnabled}
            label="Toggle autoplay default"
            onChange={(value) => updateConfig("musicAutoplayEnabled", value)}
          />
        }
      >
        <SelectField
          label="DJ control role"
          value={config.musicDjRoleId}
          options={roles}
          placeholder="Everyone in the voice channel"
          onChange={(value) => updateConfig("musicDjRoleId", value)}
        />
        <label className="minimal-field">
          <span>Default volume</span>
          <input
            type="number"
            min={1}
            max={100}
            value={config.musicDefaultVolume}
            onChange={(event) => {
              const value = Number(event.target.value);
              updateConfig("musicDefaultVolume", Math.max(1, Math.min(100, value || 1)));
            }}
          />
          <small>Members can request tracks. The DJ role gates playback and queue controls.</small>
        </label>
      </EditorSurface>

      <section className="minimal-section music-settings">
        <SectionHeading title="Available in Discord" meta={`${commands.length} essentials`} />
        <div className="music-command-list">
          {commands.map(([command, description]) => (
            <div key={command}>
              <code>{command}</code>
              <span>{description}</span>
            </div>
          ))}
        </div>
        <div className="minimal-note music-note">
          <Headphones size={18} />
          <span>
            Music permissions still follow Discord channel and command
            permissions.
          </span>
        </div>
      </section>
    </div>
  );
}

export function PreviewDrawer({
  open,
  config,
  channels,
  roles,
  guildName,
  automation,
  onClose
}: {
  open: boolean;
  config: GuildConfig;
  channels: Channel[];
  roles: Role[];
  guildName: string;
  automation: AutomationKey | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const welcome = (config.welcomeMessage ?? "")
    .replaceAll("{user}", "@Raven")
    .replaceAll("{server}", guildName)
    .replaceAll("{count}", "247");
  const goodbye = (config.goodbyeMessage ?? "")
    .replaceAll("{user}", "Raven")
    .replaceAll("{username}", "raven")
    .replaceAll("{server}", guildName)
    .replaceAll("{count}", "246");
  const isGoodbye = automation === "goodbye";

  return (
    <div className="preview-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="minimal-preview-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Discord preview"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="minimal-eyebrow">Preview</span>
            <h2>{isGoodbye ? "Goodbye message" : "Discord message"}</h2>
          </div>
          <button type="button" aria-label="Close preview" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <div
          className="minimal-discord-preview"
          style={
            {
              "--preview-accent": hexColor(config.accentColor)
            } as CSSProperties
          }
        >
          <img src="/brand/blunt38-logo.jpg" alt="" />
          <div>
            <strong>blunt38 <span>APP</span></strong>
            <p>
              {isGoodbye
                ? goodbye || "Raven left the server. 246 members remain."
                : welcome || "Welcome @Raven to the server."}
            </p>
          </div>
        </div>

        <dl className="preview-routes">
          <div>
            <dt>AI reply</dt>
            <dd>
              {config.aiResponderEnabled
                ? displayChannel(channels, config.aiResponderChannelId)
                : "Off"}
            </dd>
          </div>
          <div>
            <dt>Welcome</dt>
            <dd>{displayChannel(channels, config.welcomeChannelId)}</dd>
          </div>
          <div>
            <dt>Goodbye</dt>
            <dd>{displayChannel(channels, config.goodbyeChannelId)}</dd>
          </div>
          <div>
            <dt>Staff</dt>
            <dd>{displayRole(roles, config.supportRoleId)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function EditorSurface({
  title,
  description,
  action,
  preview,
  children
}: {
  title: string;
  description: string;
  action?: ReactNode;
  preview?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="editor-surface">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="editor-actions">
          {preview ? (
            <button type="button" onClick={preview}>
              <Eye size={16} />
              Preview
            </button>
          ) : null}
          {action}
        </div>
      </header>
      <div className="editor-fields">{children}</div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="minimal-page-heading">
      <span className="minimal-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <header className="minimal-section-heading">
      <h2>{title}</h2>
      {meta ? <span>{meta}</span> : null}
    </header>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange
}: {
  label: string;
  value: string | null;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="minimal-field">
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className={`minimal-toggle ${checked ? "on" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
