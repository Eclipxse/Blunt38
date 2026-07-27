"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Layers3,
  Loader2,
  Lock,
  Maximize2,
  MousePointer2,
  Redo2,
  Save,
  Shapes,
  Trash2,
  Type,
  Undo2,
  Unlock
} from "lucide-react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createAvatarElement,
  createDefaultVisualDocument,
  createImageElement,
  createShapeElement,
  createTextElement,
  fontOptions,
  getVisualPresets,
  getVisualStudioDefinition,
  previewText,
  variableOptions,
  type VisualDocument,
  type VisualElement,
  type VisualStudioType,
  type VisualTemplateEnvelope
} from "@/lib/visual-document";

type Version = {
  version: number;
  createdBy: string | null;
  createdAt: string;
};

type StudioResponse = {
  template: VisualTemplateEnvelope;
  versions: Version[];
};

type VisualAsset = {
  id: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
};

type PointerSession = {
  mode: "move" | "resize";
  elementId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origin: VisualElement;
};

const snapDistance = 7;
const maxUploadBytes = 1_500_000;

function cloneDocument(document: VisualDocument): VisualDocument {
  return structuredClone(document);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function elementStyle(element: VisualElement): CSSProperties {
  return {
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`
  };
}

function backgroundStyle(document: VisualDocument): CSSProperties {
  const background = document.background;
  if (background.type === "image") {
    return {
      backgroundColor: "#0d0812",
      backgroundImage: `url("${background.value.replaceAll('"', '\\"')}")`,
      backgroundPosition: "center",
      backgroundSize: "cover"
    };
  }

  return { background: background.value };
}

function labelForType(element: VisualElement) {
  if (element.type === "text") return <Type size={14} />;
  if (element.type === "avatar") return <CircleUserRound size={14} />;
  if (element.type === "image") return <ImagePlus size={14} />;
  return <Shapes size={14} />;
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file."));
      return;
    }

    if (file.size > maxUploadBytes) {
      reject(new Error("Keep editor uploads under 1.5 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function VisualStudio({
  guildId,
  guildName,
  studioType
}: {
  guildId: string;
  guildName: string;
  studioType: VisualStudioType;
}) {
  const studio = getVisualStudioDefinition(studioType);
  const presets = useMemo(() => getVisualPresets(studioType), [studioType]);
  const [document, setDocument] = useState<VisualDocument>(() =>
    createDefaultVisualDocument(studioType)
  );
  const [history, setHistory] = useState<VisualDocument[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [persistedVersion, setPersistedVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [zoom, setZoom] = useState(0.72);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointerSession = useRef<PointerSession | null>(null);
  const documentRef = useRef(document);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const selected = useMemo(
    () => document.elements.find((element) => element.id === selectedId) ?? null,
    [document.elements, selectedId]
  );

  const resetHistory = useCallback((next: VisualDocument) => {
    const snapshot = cloneDocument(next);
    setDocument(snapshot);
    setHistory([snapshot]);
    setHistoryIndex(0);
    setSelectedId(snapshot.elements.at(-1)?.id ?? null);
    setDirty(false);
  }, []);

  const loadStudio = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/guilds/${guildId}/studios/${studioType}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Could not load ${studio.label} Studio.`);
      const payload = (await response.json()) as StudioResponse;
      resetHistory(payload.template.document);
      setVersions(payload.versions);
      setPersistedVersion(payload.template.version);

      const assetResponse = await fetch(`/api/guilds/${guildId}/assets`, {
        cache: "no-store"
      });
      if (assetResponse.ok) {
        const assetPayload = (await assetResponse.json()) as { assets: VisualAsset[] };
        setAssets(assetPayload.assets);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not load ${studio.label} Studio.`);
      resetHistory(createDefaultVisualDocument(studioType));
    } finally {
      setLoading(false);
    }
  }, [guildId, resetHistory, studio.label, studioType]);

  useEffect(() => {
    void loadStudio();
  }, [loadStudio]);

  const commit = useCallback(
    (next: VisualDocument | ((current: VisualDocument) => VisualDocument)) => {
      setDocument((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        const snapshot = cloneDocument(resolved);
        const nextHistory = [...history.slice(0, historyIndex + 1), snapshot].slice(-80);
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        setDirty(true);
        return snapshot;
      });
    },
    [history, historyIndex]
  );

  const updateElement = useCallback(
    (elementId: string, patch: Partial<VisualElement>) => {
      commit((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          element.id === elementId
            ? ({ ...element, ...patch, type: element.type } as VisualElement)
            : element
        )
      }));
    },
    [commit]
  );

  function addElement(element: VisualElement) {
    commit((current) => ({
      ...current,
      elements: [...current.elements, element]
    }));
    setSelectedId(element.id);
  }

  function deleteSelected() {
    if (!selected) return;
    commit((current) => ({
      ...current,
      elements: current.elements.filter((element) => element.id !== selected.id)
    }));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = cloneDocument({
      ...document,
      elements: [selected]
    }).elements[0];
    copy.id = `${copy.type}-${crypto.randomUUID()}`;
    copy.name = `${copy.name} copy`;
    copy.x += 18;
    copy.y += 18;
    addElement(copy);
  }

  function moveLayer(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= document.elements.length) return;
    commit((current) => {
      const elements = [...current.elements];
      [elements[index], elements[target]] = [elements[target], elements[index]];
      return { ...current, elements };
    });
  }

  function undo() {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setDocument(cloneDocument(history[nextIndex]));
    setDirty(true);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setDocument(cloneDocument(history[nextIndex]));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/guilds/${guildId}/studios/${studioType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document })
      });
      if (!response.ok) throw new Error("Save failed. Apply the Studio migration in Supabase.");
      const payload = (await response.json()) as StudioResponse;
      resetHistory(payload.template.document);
      setVersions(payload.versions);
      setPersistedVersion(payload.template.version);
      setMessage(`Version ${payload.template.version} is live.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function pointerDown(
    event: ReactPointerEvent<HTMLElement>,
    element: VisualElement,
    mode: PointerSession["mode"]
  ) {
    if (element.locked) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(element.id);
    pointerSession.current = {
      mode,
      elementId: element.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: cloneDocument({ ...document, elements: [element] }).elements[0]
    };
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const session = pointerSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const scale = canvasRef.current
      ? canvasRef.current.getBoundingClientRect().width / document.canvas.width
      : zoom;
    const deltaX = (event.clientX - session.startClientX) / scale;
    const deltaY = (event.clientY - session.startClientY) / scale;
    const origin = session.origin;
    let nextX = origin.x;
    let nextY = origin.y;
    let nextWidth = origin.width;
    let nextHeight = origin.height;

    if (session.mode === "move") {
      nextX = clamp(origin.x + deltaX, -origin.width + 20, document.canvas.width - 20);
      nextY = clamp(origin.y + deltaY, -origin.height + 20, document.canvas.height - 20);

      const centerX = nextX + origin.width / 2;
      const centerY = nextY + origin.height / 2;
      const canvasCenterX = document.canvas.width / 2;
      const canvasCenterY = document.canvas.height / 2;
      const nextGuides: { x?: number; y?: number } = {};

      if (Math.abs(centerX - canvasCenterX) <= snapDistance) {
        nextX = canvasCenterX - origin.width / 2;
        nextGuides.x = canvasCenterX;
      }
      if (Math.abs(centerY - canvasCenterY) <= snapDistance) {
        nextY = canvasCenterY - origin.height / 2;
        nextGuides.y = canvasCenterY;
      }
      setGuides(nextGuides);
    } else {
      nextWidth = clamp(origin.width + deltaX, 24, document.canvas.width * 1.5);
      nextHeight = clamp(origin.height + deltaY, 24, document.canvas.height * 1.5);
    }

    setDocument((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === session.elementId
          ? {
              ...element,
              x: Math.round(nextX),
              y: Math.round(nextY),
              width: Math.round(nextWidth),
              height: Math.round(nextHeight)
            }
          : element
      )
    }));
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const session = pointerSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    pointerSession.current = null;
    setGuides({});
    const snapshot = cloneDocument(documentRef.current);
    const nextHistory = [...history.slice(0, historyIndex + 1), snapshot].slice(-80);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setDirty(true);
  }

  async function uploadBackground(file: File | undefined) {
    if (!file) return;
    try {
      const value = await storeOrEmbed(file);
      commit((current) => ({
        ...current,
        background: { ...current.background, type: "image", value }
      }));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function uploadElement(file: File | undefined) {
    if (!file) return;
    try {
      const src = await storeOrEmbed(file);
      addElement(createImageElement(src, 350, 100));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function storeOrEmbed(file: File) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/guilds/${guildId}/assets`, {
      method: "POST",
      body: form
    });

    if (response.ok) {
      const payload = (await response.json()) as { asset: VisualAsset };
      setAssets((current) => [payload.asset, ...current.filter((item) => item.id !== payload.asset.id)]);
      return payload.asset.publicUrl;
    }

    if (response.status === 503 || response.status === 404) {
      return readImage(file);
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Upload failed.");
  }

  function applyPreset(preset: VisualDocument) {
    const next = cloneDocument(preset);
    commit(next);
    setSelectedId(next.elements.at(-1)?.id ?? null);
  }

  if (loading) {
    return (
      <section className="studio-loading">
        <Loader2 className="spin" size={22} />
        <span>Opening {studio.label} Studio</span>
      </section>
    );
  }

  return (
    <section className="visual-studio">
      <header className="studio-header">
        <div className="studio-title">
          <span className="studio-kicker">{studio.eyebrow}</span>
          <div>
            <h3>{document.name}</h3>
            <span>
              {guildName} / {studio.label} / {persistedVersion ? `v${persistedVersion}` : "draft"}
            </span>
          </div>
        </div>

        <div className="studio-actions">
          <IconButton label="Undo" disabled={historyIndex <= 0} onClick={undo}>
            <Undo2 size={17} />
          </IconButton>
          <IconButton
            label="Redo"
            disabled={historyIndex >= history.length - 1}
            onClick={redo}
          >
            <Redo2 size={17} />
          </IconButton>
          <label className="zoom-control">
            <Maximize2 size={15} />
            <input
              aria-label="Canvas zoom"
              type="range"
              min="0.42"
              max="1"
              step="0.02"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <span>{Math.round(zoom * 100)}%</span>
          </label>
          <button
            className="studio-save"
            type="button"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
            {dirty ? "Publish" : "Live"}
          </button>
        </div>
      </header>

      <div className="studio-preset-bar">
        <span>Presets</span>
        {presets.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => applyPreset(preset.document)}
          >
            <i style={backgroundStyle(preset.document)} />
            {preset.name}
          </button>
        ))}
        <span className="studio-save-state">
          {message ?? (dirty ? "Draft has unpublished changes" : "Saved to Studio")}
        </span>
      </div>

      {assets.length ? (
        <div className="studio-asset-strip">
          <span>Asset library</span>
          {assets.slice(0, 12).map((asset) => (
            <button
              key={asset.id}
              type="button"
              title={`Add ${asset.fileName}`}
              onClick={() => addElement(createImageElement(asset.publicUrl, 350, 100))}
            >
              <img src={asset.publicUrl} alt="" />
            </button>
          ))}
          <small>{assets.length} saved</small>
        </div>
      ) : null}

      <div className="studio-workspace">
        <aside className="studio-tools" aria-label="Add elements">
          <ToolButton
            label="Select"
            active={!selected}
            icon={<MousePointer2 size={18} />}
            onClick={() => setSelectedId(null)}
          />
          <ToolButton
            label="Text"
            icon={<Type size={18} />}
            onClick={() => addElement(createTextElement())}
          />
          <ToolButton
            label="Avatar"
            icon={<CircleUserRound size={18} />}
            onClick={() => addElement(createAvatarElement(360, 96))}
          />
          <ToolButton
            label="Shape"
            icon={<Shapes size={18} />}
            onClick={() => addElement(createShapeElement(260, 80))}
          />
          <label className="studio-tool-button" title="Upload image">
            <ImagePlus size={18} />
            <span>Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void uploadElement(event.target.files?.[0])}
            />
          </label>
        </aside>

        <section className="studio-layers">
          <div className="studio-pane-heading">
            <Layers3 size={16} />
            <strong>Layers</strong>
            <span>{document.elements.length}</span>
          </div>
          <div className="layers-list">
            {[...document.elements].reverse().map((element, reverseIndex) => {
              const index = document.elements.length - reverseIndex - 1;
              return (
                <button
                  className={`layer-row ${selectedId === element.id ? "selected" : ""}`}
                  key={element.id}
                  type="button"
                  onClick={() => setSelectedId(element.id)}
                >
                  <span className="layer-icon">{labelForType(element)}</span>
                  <span className="layer-name">{element.name}</span>
                  <span className="layer-actions">
                    <i
                      role="button"
                      tabIndex={0}
                      title={element.hidden ? "Show layer" : "Hide layer"}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateElement(element.id, { hidden: !element.hidden });
                      }}
                    >
                      {element.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </i>
                    <i
                      role="button"
                      tabIndex={0}
                      title={element.locked ? "Unlock layer" : "Lock layer"}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateElement(element.id, { locked: !element.locked });
                      }}
                    >
                      {element.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </i>
                    <i
                      role="button"
                      tabIndex={0}
                      title="Move layer up"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveLayer(index, 1);
                      }}
                    >
                      <ChevronUp size={13} />
                    </i>
                    <i
                      role="button"
                      tabIndex={0}
                      title="Move layer down"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveLayer(index, -1);
                      }}
                    >
                      <ChevronDown size={13} />
                    </i>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <main className="studio-canvas-viewport">
          <div
            className="studio-canvas-scaler"
            style={{
              width: document.canvas.width * zoom,
              height: document.canvas.height * zoom
            }}
          >
            <div
              ref={canvasRef}
              className="studio-canvas"
              style={{
                ...backgroundStyle(document),
                width: document.canvas.width,
                height: document.canvas.height,
                transform: `scale(${zoom})`
              }}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              onPointerDown={() => setSelectedId(null)}
            >
              <div
                className="studio-background-overlay"
                style={{
                  background: document.background.overlay,
                  opacity: document.background.overlayOpacity,
                  backdropFilter: `blur(${document.background.blur}px)`
                }}
              />
              <div
                className="studio-noise"
                style={{ opacity: document.background.noise }}
              />
              {guides.x !== undefined ? (
                <span className="alignment-guide vertical" style={{ left: guides.x }} />
              ) : null}
              {guides.y !== undefined ? (
                <span className="alignment-guide horizontal" style={{ top: guides.y }} />
              ) : null}

              {document.elements.map((element) =>
                element.hidden ? null : (
                  <div
                    className={`canvas-element ${selectedId === element.id ? "selected" : ""} ${
                      element.locked ? "locked" : ""
                    }`}
                    key={element.id}
                    style={elementStyle(element)}
                    onPointerDown={(event) => pointerDown(event, element, "move")}
                  >
                    <ElementContent element={element} />
                    {selectedId === element.id && !element.locked ? (
                      <>
                        <span className="selection-label">{element.name}</span>
                        <span
                          className="resize-handle"
                          onPointerDown={(event) => pointerDown(event, element, "resize")}
                        />
                      </>
                    ) : null}
                  </div>
                )
              )}
            </div>
          </div>
        </main>

        <aside className="studio-inspector">
          {selected ? (
            <ElementInspector
              element={selected}
              variables={studio.variables}
              onUpdate={(patch) => updateElement(selected.id, patch)}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
            />
          ) : (
            <CanvasInspector
              document={document}
              onUpdate={(patch) =>
                commit((current) => ({
                  ...current,
                  ...patch
                }))
              }
              onUpload={uploadBackground}
            />
          )}

          <div className="studio-version-foot">
            <span>Version history</span>
            <strong>
              {versions.length > 0
                ? `${versions.length} saved ${versions.length === 1 ? "version" : "versions"}`
                : "First publish creates v1"}
            </strong>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ElementContent({ element }: { element: VisualElement }) {
  if (element.type === "text") {
    return (
      <div
        className="canvas-text"
        style={{
          color: element.color,
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          textAlign: element.align,
          letterSpacing: element.letterSpacing,
          lineHeight: element.lineHeight,
          textShadow:
            element.shadowBlur > 0
              ? `0 4px ${element.shadowBlur}px ${element.shadowColor}`
              : "none"
        }}
      >
        {previewText(element.text)}
      </div>
    );
  }

  if (element.type === "avatar") {
    const radius =
      element.shape === "circle" ? "50%" : element.shape === "rounded" ? "22%" : "0";
    return (
      <div
        className="canvas-avatar"
        style={{
          borderRadius: radius,
          borderColor: element.borderColor,
          borderWidth: element.borderWidth,
          boxShadow:
            element.glowBlur > 0 ? `0 0 ${element.glowBlur}px ${element.glowColor}` : "none"
        }}
      >
        <span>R</span>
      </div>
    );
  }

  if (element.type === "shape") {
    return (
      <div
        className="canvas-shape"
        style={{
          background: element.fill,
          borderColor: element.borderColor,
          borderWidth: element.borderWidth,
          borderRadius: element.radius
        }}
      />
    );
  }

  return (
    <img
      className="canvas-image"
      src={element.src}
      alt=""
      style={{ objectFit: element.fit, borderRadius: element.radius }}
    />
  );
}

function CanvasInspector({
  document,
  onUpdate,
  onUpload
}: {
  document: VisualDocument;
  onUpdate: (patch: Partial<VisualDocument>) => void;
  onUpload: (file: File | undefined) => void;
}) {
  const background = document.background;
  return (
    <>
      <div className="studio-pane-heading">
        <Maximize2 size={16} />
        <strong>Canvas</strong>
      </div>
      <InspectorGroup title="Document">
        <Control label="Name">
          <input
            value={document.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
          />
        </Control>
        <div className="control-grid">
          <Control label="Width">
            <input value={document.canvas.width} disabled />
          </Control>
          <Control label="Height">
            <input value={document.canvas.height} disabled />
          </Control>
        </div>
      </InspectorGroup>

      <InspectorGroup title="Background">
        <div className="segmented compact">
          {(["color", "gradient", "image"] as const).map((type) => (
            <button
              className={background.type === type ? "active" : ""}
              key={type}
              type="button"
              onClick={() =>
                onUpdate({
                  background: {
                    ...background,
                    type,
                    value:
                      type === "color"
                        ? "#160d21"
                        : type === "gradient"
                          ? "linear-gradient(135deg, #110a19, #3b1a51)"
                          : background.value
                  }
                })
              }
            >
              {type}
            </button>
          ))}
        </div>
        {background.type === "color" ? (
          <Control label="Color">
            <input
              type="color"
              value={background.value.startsWith("#") ? background.value : "#160d21"}
              onChange={(event) =>
                onUpdate({ background: { ...background, value: event.target.value } })
              }
            />
          </Control>
        ) : null}
        {background.type === "gradient" ? (
          <Control label="CSS gradient">
            <textarea
              rows={3}
              value={background.value}
              onChange={(event) =>
                onUpdate({ background: { ...background, value: event.target.value } })
              }
            />
          </Control>
        ) : null}
        {background.type === "image" ? (
          <>
            <Control label="Image URL">
              <input
                value={background.value.startsWith("data:") ? "Uploaded image" : background.value}
                disabled={background.value.startsWith("data:")}
                onChange={(event) =>
                  onUpdate({ background: { ...background, value: event.target.value } })
                }
              />
            </Control>
            <label className="upload-button">
              <ImagePlus size={15} />
              Upload background
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void onUpload(event.target.files?.[0])}
              />
            </label>
          </>
        ) : null}
      </InspectorGroup>

      <InspectorGroup title="Atmosphere">
        <RangeControl
          label="Overlay"
          value={background.overlayOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) =>
            onUpdate({ background: { ...background, overlayOpacity: value } })
          }
        />
        <RangeControl
          label="Blur"
          value={background.blur}
          min={0}
          max={20}
          step={1}
          suffix="px"
          onChange={(value) => onUpdate({ background: { ...background, blur: value } })}
        />
        <RangeControl
          label="Noise"
          value={background.noise}
          min={0}
          max={0.45}
          step={0.01}
          onChange={(value) => onUpdate({ background: { ...background, noise: value } })}
        />
      </InspectorGroup>
    </>
  );
}

function ElementInspector({
  element,
  onUpdate,
  onDuplicate,
  onDelete,
  variables
}: {
  element: VisualElement;
  onUpdate: (patch: Partial<VisualElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  variables: readonly string[];
}) {
  return (
    <>
      <div className="studio-pane-heading">
        {labelForType(element)}
        <strong>{element.name}</strong>
        <span>{element.type}</span>
      </div>
      <InspectorGroup title="Layer">
        <Control label="Name">
          <input value={element.name} onChange={(event) => onUpdate({ name: event.target.value })} />
        </Control>
        <div className="control-grid">
          <NumberControl label="X" value={element.x} onChange={(x) => onUpdate({ x })} />
          <NumberControl label="Y" value={element.y} onChange={(y) => onUpdate({ y })} />
          <NumberControl
            label="W"
            value={element.width}
            min={16}
            onChange={(width) => onUpdate({ width })}
          />
          <NumberControl
            label="H"
            value={element.height}
            min={16}
            onChange={(height) => onUpdate({ height })}
          />
        </div>
        <RangeControl
          label="Opacity"
          value={element.opacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(opacity) => onUpdate({ opacity })}
        />
        <RangeControl
          label="Rotation"
          value={element.rotation}
          min={-180}
          max={180}
          step={1}
          suffix="°"
          onChange={(rotation) => onUpdate({ rotation })}
        />
      </InspectorGroup>

      {element.type === "text" ? (
        <InspectorGroup title="Typography">
          <Control label="Content">
            <textarea
              rows={4}
              value={element.text}
              onChange={(event) => onUpdate({ text: event.target.value })}
            />
          </Control>
          <div className="variable-row">
            {variableOptions.filter((variable) => variables.includes(variable)).map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => onUpdate({ text: `${element.text}${element.text ? " " : ""}${variable}` })}
              >
                {variable}
              </button>
            ))}
          </div>
          <Control label="Font">
            <select
              value={element.fontFamily}
              onChange={(event) => onUpdate({ fontFamily: event.target.value })}
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </Control>
          <div className="control-grid">
            <NumberControl
              label="Size"
              value={element.fontSize}
              min={8}
              max={240}
              onChange={(fontSize) => onUpdate({ fontSize })}
            />
            <NumberControl
              label="Weight"
              value={element.fontWeight}
              min={100}
              max={900}
              step={100}
              onChange={(fontWeight) => onUpdate({ fontWeight })}
            />
          </div>
          <div className="inspector-inline">
            <input
              aria-label="Text color"
              type="color"
              value={element.color}
              onChange={(event) => onUpdate({ color: event.target.value })}
            />
            <div className="icon-segment">
              <button
                className={element.align === "left" ? "active" : ""}
                type="button"
                title="Align left"
                onClick={() => onUpdate({ align: "left" })}
              >
                <AlignLeft size={15} />
              </button>
              <button
                className={element.align === "center" ? "active" : ""}
                type="button"
                title="Align center"
                onClick={() => onUpdate({ align: "center" })}
              >
                <AlignCenter size={15} />
              </button>
              <button
                className={element.align === "right" ? "active" : ""}
                type="button"
                title="Align right"
                onClick={() => onUpdate({ align: "right" })}
              >
                <AlignRight size={15} />
              </button>
            </div>
          </div>
          <RangeControl
            label="Glow"
            value={element.shadowBlur}
            min={0}
            max={60}
            step={1}
            suffix="px"
            onChange={(shadowBlur) => onUpdate({ shadowBlur })}
          />
        </InspectorGroup>
      ) : null}

      {element.type === "avatar" ? (
        <InspectorGroup title="Avatar">
          <div className="segmented compact">
            {(["circle", "rounded", "square"] as const).map((shape) => (
              <button
                className={element.shape === shape ? "active" : ""}
                key={shape}
                type="button"
                onClick={() => onUpdate({ shape })}
              >
                {shape}
              </button>
            ))}
          </div>
          <RangeControl
            label="Border"
            value={element.borderWidth}
            min={0}
            max={16}
            step={1}
            suffix="px"
            onChange={(borderWidth) => onUpdate({ borderWidth })}
          />
          <RangeControl
            label="Glow"
            value={element.glowBlur}
            min={0}
            max={60}
            step={1}
            suffix="px"
            onChange={(glowBlur) => onUpdate({ glowBlur })}
          />
        </InspectorGroup>
      ) : null}

      {element.type === "shape" ? (
        <InspectorGroup title="Shape">
          <Control label="Fill">
            <input value={element.fill} onChange={(event) => onUpdate({ fill: event.target.value })} />
          </Control>
          <RangeControl
            label="Radius"
            value={element.radius}
            min={0}
            max={100}
            step={1}
            suffix="px"
            onChange={(radius) => onUpdate({ radius })}
          />
          <RangeControl
            label="Border"
            value={element.borderWidth}
            min={0}
            max={16}
            step={1}
            suffix="px"
            onChange={(borderWidth) => onUpdate({ borderWidth })}
          />
        </InspectorGroup>
      ) : null}

      {element.type === "image" ? (
        <InspectorGroup title="Image">
          <div className="segmented compact">
            {(["cover", "contain"] as const).map((fit) => (
              <button
                className={element.fit === fit ? "active" : ""}
                key={fit}
                type="button"
                onClick={() => onUpdate({ fit })}
              >
                {fit}
              </button>
            ))}
          </div>
          <RangeControl
            label="Radius"
            value={element.radius}
            min={0}
            max={100}
            step={1}
            suffix="px"
            onChange={(radius) => onUpdate({ radius })}
          />
        </InspectorGroup>
      ) : null}

      <div className="inspector-actions">
        <button type="button" onClick={onDuplicate}>
          <Copy size={15} />
          Duplicate
        </button>
        <button className="danger" type="button" onClick={onDelete}>
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </>
  );
}

function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inspector-group">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="inspector-control">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Control label={label}>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Control>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span>
        {label}
        <b>
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className="studio-icon-button"
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolButton({
  label,
  icon,
  active,
  onClick
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`studio-tool-button ${active ? "active" : ""}`}
      type="button"
      title={label}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
