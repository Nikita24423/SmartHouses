"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import { DESIGN_STYLES, NO_STYLE_ID } from "@/lib/styles";
import { useTheme } from "@/components/theme-provider";
import { useLocale } from "@/components/locale-provider";
import { LogoWithText } from "@/components/logo";
import {
  ArrowUpIcon,
  BlueprintIcon,
  CloseIcon,
  HistoryIcon,
  LockIcon,
  MenuIcon,
  MoonIcon,
  PaletteIcon,
  PaperclipIcon,
  PlusIcon,
  SettingsIcon,
  SunIcon,
} from "@/components/ui-icons";
import {
  loadSessionsAsync,
  saveSessions,
  createSession,
  sessionTitleFromPrompt,
  sessionTitleFromTechPassport,
  type ChatSession,
  type ChatMessage,
  type GenerationContext,
} from "@/lib/chat-storage";
import { ROOM_TYPES, getRoomTypeLabel } from "@/lib/techpassport/room-types";
import type { TechPassportAnalysis, RoomUserOverrides } from "@/lib/techpassport/types";
import { applyPlanOverrides } from "@/lib/techpassport/types";
import type { ImageModelOption } from "@/lib/models";
import {
  buildDefaultHouse,
  buildHouseFromPlan,
} from "@/lib/house3d/build-house-geometry";
import { autoFurnishHouse } from "@/lib/house3d/auto-furnish";
import type { HouseModel } from "@/lib/house3d/types";
import { HouseViewerLazy } from "@/components/house-3d/HouseViewerLazy";
import {
  TechPassportMediaGallery,
  groupMessagesForRender,
  findPlanImageForGallery,
  findPlanRoomsForGallery,
} from "@/components/tech-passport-media-gallery";
import { BuyCreditsModal } from "@/components/buy-credits-modal";
import {
  canAccessMode,
  getPlanById,
  isSubscriptionActive,
  type AppMode as PaidAppMode,
} from "@/lib/payments/packages";

type AppMode = PaidAppMode;
type LoadingStage = "analyzing" | "analyzing-plan" | "generating" | null;

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MODEL_STORAGE_KEY = "designvision-image-model";

function UserAvatar({ src, name }: { src?: string | null; name?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = (name?.trim()?.[0] ?? "?").toUpperCase();

  if (!src || failed) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  );
}

export function ChatApp() {
  const { data: session, update } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { tr, locale, setLocale } = useLocale();
  const email = session?.user?.email ?? "";

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [description, setDescription] = useState("");
  const [styleId, setStyleId] = useState(NO_STYLE_ID);
  const [files, setFiles] = useState<{ name: string; preview: string; dataUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [loadingRoom, setLoadingRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("standard");
  const [planImage, setPlanImage] = useState<{ name: string; preview: string; dataUrl: string } | null>(null);
  const [planAnalysis, setPlanAnalysis] = useState<TechPassportAnalysis | null>(null);
  const [roomTypes, setRoomTypes] = useState<Record<string, string>>({});
  const [roomOverrides, setRoomOverrides] = useState<
    Record<string, { windows: string; doors: string }>
  >({});
  const [ceilingHeightM, setCeilingHeightM] = useState("2.7");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [planPanelCollapsed, setPlanPanelCollapsed] = useState(false);
  const [imageModel, setImageModel] = useState("");
  const [availableModels, setAvailableModels] = useState<ImageModelOption[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [regenerateTarget, setRegenerateTarget] = useState<ChatMessage | null>(null);

  const planInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = useMemo(
    () => activeSession?.messages ?? [],
    [activeSession?.messages]
  );
  const renderItems = useMemo(
    () => groupMessagesForRender(messages),
    [messages]
  );
  const lastUserTpIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user" && messages[i].mode === "techpassport") {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const lastGalleryKey = useMemo(() => {
    for (let i = renderItems.length - 1; i >= 0; i--) {
      const item = renderItems[i];
      if (item.kind !== "tp-gallery") continue;
      const startIdx = messages.findIndex((m) => m.id === item.messages[0].id);
      if (startIdx > lastUserTpIndex) return item.key;
    }
    return null;
  }, [renderItems, messages, lastUserTpIndex]);

  const batchPendingRooms = useMemo(() => {
    if (!loading || !loadingRoom) return [] as string[];
    const gallery = renderItems.find(
      (item) => item.kind === "tp-gallery" && item.key === lastGalleryKey
    );
    const ready = new Set(
      gallery && gallery.kind === "tp-gallery"
        ? gallery.messages
            .map((m) => m.roomNumber)
            .filter((n): n is string => Boolean(n))
        : []
    );
    return selectedRooms.filter((n) => !ready.has(n));
  }, [loading, loadingRoom, renderItems, lastGalleryKey, selectedRooms]);

  const showPendingOnlyGallery =
    loading &&
    !!loadingRoom &&
    batchPendingRooms.length > 0 &&
    !lastGalleryKey;
  const remaining = session?.user?.generationsRemaining ?? 0;
  const hasInput = description.trim().length > 0 || files.length > 0;
  const canGenerateStandard = remaining > 0 && hasInput && !loading;
  const canAnalyzePlan = !!planImage && !loading;
  const parsedCeilingHeight = parseFloat(
    ceilingHeightM.replace(",", ".").replace(/[^\d.]/g, "")
  );
  const isCeilingHeightValid =
    Number.isFinite(parsedCeilingHeight) &&
    parsedCeilingHeight >= 2 &&
    parsedCeilingHeight <= 5;
  const canGenerateTechPassport =
    remaining > 0 &&
    !!planAnalysis &&
    selectedRooms.length > 0 &&
    isCeilingHeightValid &&
    !loading &&
    selectedRooms.length <= remaining;
  const canBuildHouse3dDefault = !loading && isCeilingHeightValid;
  /** Enabled when plan file exists (will auto-analyze) or analysis is ready. */
  const canBuildHouse3dFromPlan =
    !loading && isCeilingHeightValid && (!!planAnalysis || !!planImage);
  const canGenerate =
    appMode === "standard"
      ? canGenerateStandard
      : appMode === "techpassport"
        ? canGenerateTechPassport
        : canBuildHouse3dDefault;
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      const desktop = mq.matches;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    void (async () => {
      const stored = await loadSessionsAsync(email);
      if (cancelled) return;
      setSessions(stored);
      if (stored.length > 0) setActiveId(stored[0].id);
      else {
        const fresh = createSession();
        setSessions([fresh]);
        setActiveId(fresh.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setAvailableModels(data.models ?? []);
        const stored = localStorage.getItem(MODEL_STORAGE_KEY);
        const valid = data.models?.some((m: ImageModelOption) => m.id === stored);
        setImageModel(valid ? stored! : data.defaultModel ?? "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function styleNameFromId(id: string) {
    return id === NO_STYLE_ID
      ? tr("app.styleAuto")
      : DESIGN_STYLES.find((s) => s.id === id)?.name ?? tr("app.styleAuto");
  }

  function handleModelChange(id: string) {
    setImageModel(id);
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  }

  function selectStyle(id: string) {
    setStyleId(id);
    setShowStylePicker(false);
    if (regenerateTarget) {
      void handleRegenerate(regenerateTarget, id);
      setRegenerateTarget(null);
    }
  }

  const persistSessions = useCallback(
    (next: ChatSession[]) => {
      setSessions(next);
      if (email) saveSessions(email, next);
    },
    [email]
  );

  function resetTechPassportState() {
    setPlanImage(null);
    setPlanAnalysis(null);
    setRoomTypes({});
    setRoomOverrides({});
    setCeilingHeightM("2.7");
    setSelectedRooms([]);
    setPlanPanelCollapsed(false);
    if (planInputRef.current) planInputRef.current.value = "";
  }

  function resetInputState() {
    setDescription("");
    setFiles([]);
    setError(null);
    setShowStylePicker(false);
    resetTechPassportState();
  }

  function handleNewChat() {
    const fresh = createSession();
    persistSessions([fresh, ...sessions]);
    setActiveId(fresh.id);
    resetInputState();
  }

  function selectSession(id: string) {
    setActiveId(id);
    resetInputState();
    if (!isDesktop) setSidebarOpen(false);
  }

  function switchMode(mode: AppMode) {
    const planId = session?.user?.subscriptionPlan;
    const expires = session?.user?.subscriptionExpiresAt;
    if (!canAccessMode(mode, planId, expires)) {
      setError(tr("payment.modeLocked"));
      setShowBuyCredits(true);
      return;
    }
    setAppMode(mode);
    setError(null);
    if (mode === "standard") {
      resetTechPassportState();
    } else if (mode === "techpassport" || mode === "house3d") {
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function pushHouse3dMessage(
    model: HouseModel,
    userLabel: string,
    analysis?: TechPassportAnalysis | null
  ) {
    if (!activeId) return;
    const title = description.trim() || model.title;
    const finalModel: HouseModel = { ...model, title };
    const analysisUsed = analysis ?? planAnalysis;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userLabel,
      createdAt: new Date().toISOString(),
      mode: "house3d",
      attachments: planImage ? [planImage.preview] : undefined,
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: tr("app.house3dResult", { title: finalModel.title }),
      houseModel: finalModel,
      mode: "house3d",
      generationContext: {
        mode: "house3d",
        styleId,
        ceilingHeightM: parsedCeilingHeight,
        planAnalysis: analysisUsed ?? undefined,
      },
      createdAt: new Date().toISOString(),
    };

    persistSessions(
      sessions.map((s) =>
        s.id === activeId
          ? {
              ...s,
              title:
                s.messages.length === 0
                  ? finalModel.title.slice(0, 42)
                  : s.title,
              messages: [...s.messages, userMsg, assistantMsg],
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
    setDescription("");
    setShowStylePicker(false);
    setPlanPanelCollapsed(true);
  }

  function buildModelFromAnalysis(
    analysis: TechPassportAnalysis,
    opts?: {
      roomNumbers?: string[];
      labels?: Record<string, string>;
      overrides?: Record<string, { windows: string; doors: string }>;
      roomTypes?: Record<string, string>;
    }
  ): HouseModel {
    const rooms =
      opts?.roomNumbers ??
      (selectedRooms.length > 0
        ? selectedRooms
        : analysis.rooms.map((r) => r.number));
    const labels: Record<string, string> = { ...(opts?.labels ?? {}) };
    const types: Record<string, string> = {};
    for (const room of analysis.rooms) {
      const typeId =
        opts?.roomTypes?.[room.number] ??
        roomTypes[room.number] ??
        room.suggestedType;
      types[room.number] = typeId;
      if (!labels[room.number]) {
        labels[room.number] = `№${room.number} · ${getRoomTypeLabel(typeId)}`;
      }
    }
    const merged = applyPlanOverrides(analysis, opts?.overrides ?? roomOverrides);
    const raw = buildHouseFromPlan(merged, {
      ceilingHeightM: parsedCeilingHeight,
      roomNumbers: rooms,
      labels,
      roomTypes: types,
    });
    return autoFurnishHouse(raw, styleId);
  }

  function handleBuildDefaultHouse() {
    if (!activeId) return;
    if (!isCeilingHeightValid) {
      setError(tr("app.ceilingHeightInvalid"));
      return;
    }
    if (loading) return;
    const model = autoFurnishHouse(
      buildDefaultHouse(parsedCeilingHeight),
      styleId
    );
    pushHouse3dMessage(model, tr("app.buildDefaultHouse"));
  }

  async function handleBuildHouseFromPlan() {
    if (!activeId) return;
    if (!isCeilingHeightValid) {
      setError(tr("app.ceilingHeightInvalid"));
      return;
    }
    if (loading) return;

    if (!planAnalysis && !planImage) {
      setError(tr("app.house3dNeedPlan"));
      return;
    }

    try {
      let analysis = planAnalysis;
      let freshTypes: Record<string, string> | undefined;
      let freshOverrides: Record<string, { windows: string; doors: string }> | undefined;
      let freshRooms: string[] | undefined;

      if (!analysis && planImage) {
        setLoading(true);
        setLoadingStage("analyzing-plan");
        setError(null);

        const response = await fetch("/api/analyze-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: planImage.dataUrl,
            notes: description.trim() || undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Ошибка анализа плана");

        analysis = data.analysis as TechPassportAnalysis;
        setPlanAnalysis(analysis);

        freshTypes = {};
        freshOverrides = {};
        for (const room of analysis.rooms) {
          freshTypes[room.number] = room.suggestedType;
          freshOverrides[room.number] = {
            windows: room.windows ?? "",
            doors: room.doors ?? "",
          };
        }
        freshRooms = analysis.rooms.map((r) => r.number);
        setRoomTypes(freshTypes);
        setRoomOverrides(freshOverrides);
        setSelectedRooms(freshRooms);
      }

      if (!analysis) {
        setError(tr("app.house3dNeedPlan"));
        return;
      }

      const labels: Record<string, string> = {};
      for (const room of analysis.rooms) {
        const typeId =
          freshTypes?.[room.number] ??
          roomTypes[room.number] ??
          room.suggestedType;
        labels[room.number] = `№${room.number} · ${getRoomTypeLabel(typeId)}`;
      }

      const model = buildModelFromAnalysis(analysis, {
        roomNumbers: freshRooms,
        labels,
        overrides: freshOverrides,
        roomTypes: freshTypes,
      });
      pushHouse3dMessage(model, tr("app.buildHouseFromPlan"), analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }

  async function handlePlanFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(tr("app.uploadPlan"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(tr("app.maxFileSize"));
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setPlanImage({ name: file.name, preview: dataUrl, dataUrl });
    setPlanAnalysis(null);
    setRoomTypes({});
    setRoomOverrides({});
    setSelectedRooms([]);
    setPlanPanelCollapsed(false);
    setError(null);
    if (planInputRef.current) planInputRef.current.value = "";
  }

  async function handleAnalyzePlan() {
    if (!canAnalyzePlan || !planImage) return;

    setLoading(true);
    setLoadingStage("analyzing-plan");
    setError(null);

    try {
      const response = await fetch("/api/analyze-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: planImage.dataUrl,
          notes: description.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ошибка анализа плана");

      const analysis = data.analysis as TechPassportAnalysis;
      setPlanAnalysis(analysis);

      const types: Record<string, string> = {};
      const overrides: Record<string, { windows: string; doors: string }> = {};
      for (const room of analysis.rooms) {
        types[room.number] = room.suggestedType;
        overrides[room.number] = {
          windows: room.windows ?? "",
          doors: room.doors ?? "",
        };
      }
      setRoomTypes(types);
      setRoomOverrides(overrides);
      setSelectedRooms(analysis.rooms.map((r) => r.number));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }

  function toggleRoomSelection(number: string) {
    setSelectedRooms((prev) =>
      prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
    );
  }

  function updateRoomType(number: string, typeId: string) {
    setRoomTypes((prev) => ({ ...prev, [number]: typeId }));
  }

  function updateRoomOverride(
    number: string,
    field: "windows" | "doors",
    value: string
  ) {
    setRoomOverrides((prev) => ({
      ...prev,
      [number]: {
        windows: field === "windows" ? value : (prev[number]?.windows ?? ""),
        doors: field === "doors" ? value : (prev[number]?.doors ?? ""),
      },
    }));
  }

  function buildRoomOverridesPayload(): Record<string, RoomUserOverrides> {
    const payload: Record<string, RoomUserOverrides> = {};
    for (const [number, values] of Object.entries(roomOverrides)) {
      const windows = values.windows.trim();
      const doors = values.doors.trim();
      if (windows || doors) {
        payload[number] = { windows: windows || undefined, doors: doors || undefined };
      }
    }
    return payload;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (files.length + selected.length > MAX_FILES) {
      setError(tr("app.maxFiles", { max: MAX_FILES }));
      return;
    }
    const newFiles: typeof files = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_SIZE) {
        setError(tr("app.maxFileSize"));
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      newFiles.push({ name: file.name, preview: dataUrl, dataUrl });
    }
    setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES));
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canGenerate || !activeId) return;

    const mode: AppMode = canAccessMode(
      appMode,
      session?.user?.subscriptionPlan ?? null,
      session?.user?.subscriptionExpiresAt ?? null
    )
      ? appMode
      : "standard";

    if (mode === "techpassport") {
      await handleTechPassportGenerate();
      return;
    }

    if (mode === "house3d") {
      if (planAnalysis || planImage) await handleBuildHouseFromPlan();
      else handleBuildDefaultHouse();
      return;
    }

    const prompt = description.trim();
    const styleName = styleNameFromId(styleId);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt || tr("app.generateByRefs"),
      attachments: files.map((f) => f.preview),
      style: styleName,
      styleId,
      createdAt: new Date().toISOString(),
    };

    setLoading(true);
    setLoadingStage(files.length > 0 ? "analyzing" : "generating");
    setError(null);
    setDescription("");
    const sentFiles = [...files];
    setFiles([]);
    setShowStylePicker(false);

    const updatedWithUser = sessions.map((s) =>
      s.id === activeId
        ? {
            ...s,
            title: s.messages.length === 0 ? sessionTitleFromPrompt(prompt) : s.title,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    persistSessions(updatedWithUser);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: prompt || undefined,
          styleId,
          referenceImages: sentFiles.map((f) => f.dataUrl),
          imageModel: imageModel || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ошибка генерации");

      const genContext: GenerationContext = {
        mode: "standard",
        generationId: data.generationId,
        styleId,
        description: prompt || undefined,
        imageModel: data.imageModel ?? imageModel,
        referenceImages: sentFiles.map((f) => f.dataUrl),
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: tr("app.styleResult", { style: data.style }),
        image: data.image,
        style: data.style,
        styleId,
        imageModel: data.imageModel,
        mode: "standard",
        generationContext: genContext,
        createdAt: new Date().toISOString(),
      };

      persistSessions(
        updatedWithUser.map((s) =>
          s.id === activeId
            ? { ...s, messages: [...s.messages, assistantMsg], updatedAt: new Date().toISOString() }
            : s
        )
      );

      await update({
        ...session,
        user: {
          ...session?.user,
          generationsRemaining: data.remaining,
          generationsUsed: (session?.user?.generationsLimit ?? 5) - data.remaining,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      persistSessions(
        updatedWithUser.map((s) =>
          s.id === activeId
            ? { ...s, messages: s.messages.filter((m) => m.id !== userMsg.id) }
            : s
        )
      );
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }

  async function handleTechPassportGenerate() {
    if (!planAnalysis || !planImage || !activeId || selectedRooms.length === 0) return;

    const prompt = description.trim();
    const styleName = styleNameFromId(styleId);

    const roomLabels = Object.entries(roomTypes).map(([number, typeId]) => ({
      number,
      typeId,
    }));
    const overridesPayload = buildRoomOverridesPayload();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content:
        prompt ||
        tr("app.generateRooms", { rooms: selectedRooms.join(", ") }),
      attachments: [planImage.preview],
      style: styleName,
      styleId,
      mode: "techpassport",
      createdAt: new Date().toISOString(),
    };

    setLoading(true);
    setLoadingStage("generating");
    setError(null);
    const notes = prompt;
    setDescription("");
    setShowStylePicker(false);

    let updatedSessions = sessions.map((s) =>
      s.id === activeId
        ? {
            ...s,
            title:
              s.messages.length === 0
                ? sessionTitleFromTechPassport(selectedRooms)
                : s.title,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    persistSessions(updatedSessions);

    let remainingCount = remaining;

    try {
      for (const roomNumber of selectedRooms) {
        setLoadingRoom(roomNumber);

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "techpassport",
            description: notes || undefined,
            styleId,
            planAnalysis,
            roomLabels,
            roomOverrides: overridesPayload,
            ceilingHeightM: parsedCeilingHeight,
            roomNumber,
            techPassportImage: planImage.dataUrl,
            imageModel: imageModel || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Ошибка генерации");

        const genContext: GenerationContext = {
          mode: "techpassport",
          generationId: data.generationId,
          styleId,
          description: notes || undefined,
          imageModel: data.imageModel ?? imageModel,
          planAnalysis,
          roomLabels,
          roomOverrides: overridesPayload,
          ceilingHeightM: parsedCeilingHeight,
          techPassportImage: planImage.dataUrl,
          roomNumber: data.roomNumber,
        };

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: tr("app.roomResult", {
            number: data.roomNumber,
            type: getRoomTypeLabel(data.roomType),
            style: data.style,
          }),
          image: data.image,
          roomNumber: data.roomNumber,
          roomType: data.roomType,
          mode: "techpassport",
          styleId,
          imageModel: data.imageModel,
          generationContext: genContext,
          createdAt: new Date().toISOString(),
        };

        remainingCount = data.remaining;

        updatedSessions = updatedSessions.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: [...s.messages, assistantMsg],
                updatedAt: new Date().toISOString(),
              }
            : s
        );
        persistSessions(updatedSessions);
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          generationsRemaining: remainingCount,
          generationsUsed: (session?.user?.generationsLimit ?? 5) - remainingCount,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      persistSessions(
        updatedSessions.map((s) =>
          s.id === activeId
            ? { ...s, messages: s.messages.filter((m) => m.id !== userMsg.id) }
            : s
        )
      );
    } finally {
      setLoading(false);
      setLoadingStage(null);
      setLoadingRoom(null);
    }
  }

  async function runRegeneration(
    msg: ChatMessage,
    options?: { newStyleId?: string; extraNotes?: string }
  ) {
    const ctx = msg.generationContext;
    if (!ctx || !activeId || remaining <= 0 || loading) return;

    const effectiveStyleId = options?.newStyleId ?? ctx.styleId;
    const effectiveModel = ctx.imageModel ?? imageModel;
    const mergedDescription = options?.extraNotes
      ? ctx.description
        ? `${ctx.description}\n\n${options.extraNotes}`
        : options.extraNotes
      : ctx.description;

    setLoading(true);
    setLoadingStage("generating");
    if (ctx.roomNumber) setLoadingRoom(ctx.roomNumber);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        mode: ctx.mode,
        previousGenerationId: ctx.generationId,
        styleId: effectiveStyleId,
        description: mergedDescription,
        imageModel: effectiveModel || undefined,
        regenerate: true,
      };

      if (!ctx.generationId) {
        if (!msg.image?.startsWith("data:image/")) {
          throw new Error("Эту старую версию нельзя продолжить. Создайте новый вариант комнаты.");
        }
        body.referenceImages = [msg.image];
      }

      if (ctx.mode === "techpassport") {
        body.planAnalysis = ctx.planAnalysis;
        body.roomLabels = ctx.roomLabels;
        body.roomOverrides = ctx.roomOverrides;
        body.ceilingHeightM = ctx.ceilingHeightM ?? 2.7;
        body.roomNumber = ctx.roomNumber;
        body.techPassportImage = ctx.techPassportImage;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ошибка генерации");

      const updatedContext: GenerationContext = {
        ...ctx,
        generationId: data.generationId,
        styleId: effectiveStyleId,
        imageModel: data.imageModel ?? effectiveModel,
        description: mergedDescription,
      };

      const newContent =
        ctx.mode === "techpassport"
          ? tr("app.roomResult", {
              number: data.roomNumber ?? ctx.roomNumber ?? "",
              type: getRoomTypeLabel(data.roomType ?? msg.roomType ?? ""),
              style: data.style,
            })
          : tr("app.styleResult", { style: data.style });

      persistSessions(
        sessions.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === msg.id
                    ? {
                        ...m,
                        content: newContent,
                        image: data.image,
                        style: data.style,
                        styleId: effectiveStyleId,
                        imageModel: data.imageModel,
                        generationContext: updatedContext,
                      }
                    : m
                ),
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );

      await update({
        ...session,
        user: {
          ...session?.user,
          generationsRemaining: data.remaining,
          generationsUsed: (session?.user?.generationsLimit ?? 5) - data.remaining,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
      setLoadingStage(null);
      setLoadingRoom(null);
    }
  }

  async function handleRegenerate(msg: ChatMessage, newStyleId?: string) {
    await runRegeneration(msg, { newStyleId });
  }

  async function handleRefine(msg: ChatMessage) {
    const notes = description.trim();
    if (!notes) {
      setError(tr("app.refineNeedsNotes"));
      return;
    }
    setDescription("");
    await runRegeneration(msg, { extraNotes: notes });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const styleLabel = styleNameFromId(styleId);
  const subPlanId = session?.user?.subscriptionPlan ?? null;
  const subExpires = session?.user?.subscriptionExpiresAt ?? null;
  const subActive = isSubscriptionActive(subPlanId, subExpires);
  const currentPlan = subActive && subPlanId ? getPlanById(subPlanId) : null;
  const canTech = canAccessMode("techpassport", subPlanId, subExpires);
  const canHouse3d = canAccessMode("house3d", subPlanId, subExpires);

  const activeMode: AppMode =
    appMode !== "standard" && !canAccessMode(appMode, subPlanId, subExpires)
      ? "standard"
      : appMode;

  const hasGeneratedImages = messages.some(
    (m) => m.role === "assistant" && !!m.image && m.generationContext
  );
  const inputPlaceholder =
    hasGeneratedImages && activeMode !== "house3d"
      ? tr("app.placeholderRefine")
      : activeMode === "techpassport"
        ? tr("app.placeholderTechPassport")
        : activeMode === "house3d"
          ? tr("app.placeholderHouse3d")
          : tr("app.placeholder");

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && !isDesktop && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Закрыть меню"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`safe-top safe-bottom fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] shrink-0 flex-col bg-sidebar pt-[var(--safe-top)] pb-[var(--safe-bottom)] transition-[transform,width] duration-200 lg:relative lg:z-auto lg:max-w-none lg:overflow-hidden lg:pt-0 lg:pb-0 ${
          sidebarOpen
            ? "translate-x-0 border-r border-border lg:w-64"
            : "-translate-x-full border-r border-border lg:w-0 lg:translate-x-0 lg:border-0"
        }`}
      >
        <div className="flex h-full w-[min(18rem,88vw)] flex-col lg:w-64">
          <div className="flex items-center justify-between px-4 py-3 sm:py-4">
            <LogoWithText size="sm" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="touch-target rounded-lg p-2 text-muted hover:bg-surface-hover"
              aria-label="Скрыть меню"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 pb-2">
            <button
              onClick={handleNewChat}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium transition hover:bg-surface-hover"
            >
              <PlusIcon className="h-4 w-4" />
              {tr("app.newChat")}
            </button>
          </div>

          <div className="chat-scroll flex-1 overflow-y-auto px-3 py-2">
            <p className="mb-2 px-2 text-xs font-medium text-muted">{tr("app.history")}</p>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`mb-0.5 flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                  s.id === activeId
                    ? "bg-surface-hover text-foreground"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <HistoryIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <span className="line-clamp-2">{s.title}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <UserAvatar src={session?.user?.image} name={session?.user?.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                <p className="truncate text-xs text-muted">{session?.user?.email}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1.5 px-2 text-xs text-muted">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {tr("app.generations")}:{" "}
                  <span className="font-medium text-accent">{remaining}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowBuyCredits(true)}
                  className="shrink-0 font-medium text-accent hover:underline"
                >
                  {tr("app.buyCreditsShort")}
                </button>
              </div>
              <p className="truncate">
                {currentPlan
                  ? `${tr(currentPlan.nameKey)} · ${new Date(subExpires!).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU")}`
                  : tr("payment.freePlan")}
              </p>
            </div>
            <div className="mt-1 flex justify-end px-2 text-xs text-muted">
              <button
                onClick={() => signOut({ redirectTo: "/" })}
                className="hover:text-foreground"
              >
                {tr("app.logout")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="safe-top safe-x flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-border bg-background/90 py-2 backdrop-blur-xl sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="touch-target shrink-0 rounded-lg border border-border p-2 text-muted hover:bg-surface-hover"
                aria-label="Открыть меню"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            )}
            <div className="flex shrink-0 rounded-lg border border-border bg-surface p-0.5 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => switchMode("standard")}
                className={`touch-target rounded-md px-2 py-1.5 transition sm:px-3 ${
                  activeMode === "standard"
                    ? "bg-accent text-[#10120d] shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span className="sm:hidden">{tr("app.modeStandardShort")}</span>
                <span className="hidden sm:inline">{tr("app.modeStandard")}</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode("techpassport")}
                className={`touch-target rounded-md px-2 py-1.5 transition sm:px-3 ${
                  activeMode === "techpassport"
                    ? "bg-accent text-[#10120d] shadow-sm"
                    : canTech
                      ? "text-muted hover:text-foreground"
                      : "text-muted/50"
                }`}
                title={canTech ? undefined : tr("payment.modeLocked")}
              >
                <span className="inline-flex items-center gap-1 sm:hidden">
                  {tr("app.modeTechPassportShort")}
                  {!canTech ? <LockIcon className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  {tr("app.modeTechPassport")}
                  {!canTech ? <LockIcon className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchMode("house3d")}
                className={`touch-target rounded-md px-2 py-1.5 transition sm:px-3 ${
                  activeMode === "house3d"
                    ? "bg-accent text-[#10120d] shadow-sm"
                    : canHouse3d
                      ? "text-muted hover:text-foreground"
                      : "text-muted/50"
                }`}
                title={canHouse3d ? undefined : tr("payment.modeLocked")}
              >
                <span className="inline-flex items-center gap-1 sm:hidden">
                  {tr("app.modeHouse3dShort")}
                  {!canHouse3d ? <LockIcon className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  {tr("app.modeHouse3d")}
                  {!canHouse3d ? <LockIcon className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            </div>
            <select
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
              className="hidden max-w-[12rem] truncate rounded-lg border border-border bg-surface px-3 py-1.5 text-sm lg:block xl:max-w-none"
            >
              <option value={NO_STYLE_ID}>{tr("app.styleLabel")}: {tr("app.styleAuto")}</option>
              {DESIGN_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
              className="touch-target rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-hover"
            >
              {locale === "ru" ? "EN" : "RU"}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className={`touch-target rounded-lg border border-border px-2.5 py-1.5 text-sm transition hover:bg-surface-hover hover:text-foreground ${showSettings ? "bg-surface-hover text-foreground" : "text-muted"}`}
              aria-label={tr("app.settings")}
              aria-expanded={showSettings}
            >
              <SettingsIcon className="h-[1.1rem] w-[1.1rem]" />
            </button>
            <button
              onClick={toggleTheme}
              className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface-hover hover:text-foreground"
              aria-label={theme === "dark" ? tr("app.themeLight") : tr("app.themeDark")}
            >
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              <span className="hidden lg:inline">{theme === "dark" ? tr("app.themeLight") : tr("app.themeDark")}</span>
            </button>
          </div>
        </header>

        {showSettings && (
          <div className="safe-x border-b border-border bg-surface px-3 py-3 sm:px-4">
            <p className="mb-2 text-xs font-medium text-muted">{tr("app.model")}</p>
            <select
              value={imageModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm sm:max-w-md"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.recommended ? " ★" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Messages */}
        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isEmpty && !loading ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 pb-24 sm:pb-32">
              <h1 className="responsive-heading text-center font-serif font-normal tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {activeMode === "techpassport"
                  ? tr("app.emptyTechPassport")
                  : activeMode === "house3d"
                    ? tr("app.emptyHouse3d")
                    : tr("app.emptyStandard")}
              </h1>
              {activeMode === "techpassport" && (
                <p className="mt-4 max-w-md text-center text-sm text-muted">
                  {tr("app.emptyTechPassportHint")}
                </p>
              )}
              {activeMode === "house3d" && (
                <p className="mt-4 max-w-md text-center text-sm text-muted">
                  {tr("app.emptyHouse3dHint")}
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-8">
              {renderItems.map((item) => {
                if (item.kind === "tp-gallery") {
                  const galleryPlan =
                    findPlanImageForGallery(item.messages, messages) ??
                    planImage?.preview;
                  const galleryRooms = findPlanRoomsForGallery(
                    item.messages,
                    planAnalysis?.rooms
                  );
                  const isActiveBatch = item.key === lastGalleryKey && loading && !!loadingRoom;
                  return (
                    <div key={item.key} className="flex gap-3 justify-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm text-accent">
                        AI
                      </div>
                      <div className="min-w-0 flex-1">
                        <TechPassportMediaGallery
                          items={item.messages}
                          planImage={galleryPlan}
                          planRooms={galleryRooms}
                          canEdit={remaining > 0 && !loading}
                          pendingRooms={isActiveBatch ? batchPendingRooms : undefined}
                          loadingRoom={isActiveBatch ? loadingRoom : null}
                          labels={{
                            photoOf: tr("app.photoOf"),
                            floorPlan: tr("app.galleryFloorPlan"),
                            download: tr("app.download"),
                            refine: tr("app.refine"),
                            regenerate: tr("app.regenerate"),
                            changeStyle: tr("app.changeStyle"),
                            roomNumber: (number) =>
                              tr("app.roomNumber", { number }),
                            fullscreen: tr("app.house3dFullscreen"),
                            exitFullscreen: tr("app.house3dExitFullscreen"),
                            prev: tr("app.galleryPrev"),
                            next: tr("app.galleryNext"),
                            tapMarker: tr("app.galleryTapMarker"),
                            expandPlan: tr("app.expandPlan"),
                            collapsePlan: tr("app.collapsePlan"),
                            generatingRoom: (room) =>
                              tr("app.generatingRoom", { room }),
                            pendingRoom: tr("app.pendingRoom"),
                          }}
                          onRefine={handleRefine}
                          onRegenerate={handleRegenerate}
                          onChangeStyle={(msg) => {
                            setRegenerateTarget(msg);
                            setShowStylePicker(true);
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                const msg = item.message;
                return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm text-accent">
                      AI
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${
                      msg.houseModel
                        ? "max-w-[min(100%,36rem)] sm:max-w-[min(100%,40rem)]"
                        : "max-w-[min(100%,28rem)] sm:max-w-[85%]"
                    } ${
                      msg.role === "user"
                        ? "bg-bubble-user"
                        : "border border-border bg-bubble-assistant"
                    }`}
                  >
                    {msg.style && msg.role === "user" && (
                      <p className="mb-1 text-xs text-muted">{tr("app.styleLabel")}: {msg.style}</p>
                    )}
                    {msg.roomNumber && msg.role === "assistant" && (
                      <p className="mb-1 text-xs font-medium text-accent">
                        {tr("app.roomNumber", { number: msg.roomNumber })}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {msg.image && (
                      <div className="mt-3">
                        <img
                          src={msg.image}
                          alt="Сгенерированный интерьер"
                          className="max-h-[min(50vh,28rem)] w-full rounded-xl object-contain sm:max-h-[480px]"
                        />
                        <div className="mt-2 flex flex-wrap gap-3">
                          <a
                            href={msg.image}
                            download="dizajn-po-planu.jpg"
                            className="text-xs text-accent hover:underline"
                          >
                            {tr("app.download")}
                          </a>
                          {msg.generationContext && remaining > 0 && !loading && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRefine(msg)}
                                className="text-xs font-medium text-accent transition hover:underline"
                              >
                                {tr("app.refine")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerate(msg)}
                                className="text-xs text-muted transition hover:text-foreground"
                              >
                                {tr("app.regenerate")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRegenerateTarget(msg);
                                  setShowStylePicker(true);
                                }}
                                className="text-xs text-muted transition hover:text-foreground"
                              >
                                {tr("app.changeStyle")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {msg.houseModel && (
                      <div className="mt-3 w-full min-w-[min(100%,18rem)] sm:min-w-[22rem]">
                        <HouseViewerLazy
                          model={msg.houseModel}
                          className="h-[min(52vh,22rem)] w-full sm:h-[26rem]"
                          fullscreenLabel={tr("app.house3dFullscreen")}
                          exitFullscreenLabel={tr("app.house3dExitFullscreen")}
                          tourLabel={tr("app.house3dTour")}
                          dollhouseLabel={tr("app.house3dDollhouse")}
                          floorPlanLabel={tr("app.house3dFloorPlan")}
                          youAreHereLabel={tr("app.house3dYouAreHere")}
                          enterRoomHint={tr("app.house3dEnterRoomHint")}
                        />
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <UserAvatar src={session?.user?.image} name={session?.user?.name} />
                  )}
                </div>
                );
              })}

              {showPendingOnlyGallery && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm text-accent">
                    AI
                  </div>
                  <div className="min-w-0 flex-1">
                    <TechPassportMediaGallery
                      items={[]}
                      planImage={planImage?.preview}
                      planRooms={planAnalysis?.rooms}
                      canEdit={false}
                      pendingRooms={batchPendingRooms}
                      loadingRoom={loadingRoom}
                      labels={{
                        photoOf: tr("app.photoOf"),
                        floorPlan: tr("app.galleryFloorPlan"),
                        download: tr("app.download"),
                        refine: tr("app.refine"),
                        regenerate: tr("app.regenerate"),
                        changeStyle: tr("app.changeStyle"),
                        roomNumber: (number) =>
                          tr("app.roomNumber", { number }),
                        fullscreen: tr("app.house3dFullscreen"),
                        exitFullscreen: tr("app.house3dExitFullscreen"),
                        prev: tr("app.galleryPrev"),
                        next: tr("app.galleryNext"),
                        tapMarker: tr("app.galleryTapMarker"),
                        expandPlan: tr("app.expandPlan"),
                        collapsePlan: tr("app.collapsePlan"),
                        generatingRoom: (room) =>
                          tr("app.generatingRoom", { room }),
                        pendingRoom: tr("app.pendingRoom"),
                      }}
                      onRefine={() => {}}
                      onRegenerate={() => {}}
                      onChangeStyle={() => {}}
                    />
                  </div>
                </div>
              )}

              {loading && !(loadingRoom && (lastGalleryKey || showPendingOnlyGallery)) && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm text-accent">
                    AI
                  </div>
                  <div className="rounded-2xl border border-border bg-bubble-assistant px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
                      {loadingStage === "analyzing"
                        ? tr("app.analyzingImages")
                        : loadingStage === "analyzing-plan"
                          ? tr("app.analyzingPlan")
                          : loadingRoom
                            ? tr("app.generatingRoom", { room: loadingRoom })
                            : tr("app.generating")}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="safe-bottom safe-x shrink-0 border-t border-border bg-background px-3 py-3 sm:px-4 sm:py-4">
          <div className="mx-auto max-w-3xl">
            {error && (
              <p className="mb-2 text-center text-sm text-red-500">{error}</p>
            )}
            {remaining <= 0 && (
              <p className="mb-2 text-center text-sm text-accent">
                {tr("app.limitReached")}{" "}
                <button
                  type="button"
                  onClick={() => setShowBuyCredits(true)}
                  className="font-medium underline"
                >
                  {tr("app.buyCredits")}
                </button>
              </p>
            )}
            {activeMode === "techpassport" && selectedRooms.length > remaining && remaining > 0 && (
              <p className="mb-2 text-center text-sm text-red-500">
                {tr("app.roomsExceedLimit", { count: selectedRooms.length, remaining })}
              </p>
            )}

            {activeMode === "standard" && files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="group relative">
                    <img src={f.preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeMode === "techpassport" || activeMode === "house3d" ? (
              <div className="space-y-3">
                {activeMode === "house3d" && planPanelCollapsed && (planImage || planAnalysis) ? (
                  <button
                    type="button"
                    onClick={() => setPlanPanelCollapsed(false)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition hover:bg-surface-hover"
                  >
                    {planImage && (
                      <img
                        src={planImage.preview}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {planImage?.name ?? tr("app.modeHouse3d")}
                      </p>
                      <p className="text-xs text-muted">
                        {planAnalysis
                          ? tr("app.house3dPlanReady", { count: planAnalysis.rooms.length })
                          : tr("app.house3dPanelExpand")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-accent">
                      {tr("app.house3dPanelExpand")}
                    </span>
                  </button>
                ) : (
                  <>
                    {planImage && (
                      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-start">
                        <img
                          src={planImage.preview}
                          alt="Техпаспорт"
                          className="mx-auto h-28 w-full max-w-[10rem] shrink-0 rounded-lg object-cover sm:mx-0 sm:h-20 sm:w-20"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">{planImage.name}</p>
                            {activeMode === "house3d" && planAnalysis && (
                              <button
                                type="button"
                                onClick={() => setPlanPanelCollapsed(true)}
                                className="shrink-0 text-xs text-muted transition hover:text-foreground"
                              >
                                {tr("app.house3dPanelCollapse")}
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {planAnalysis
                              ? tr("app.roomsFound", { count: planAnalysis.rooms.length })
                              : tr("app.analyzeHint")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activeMode === "techpassport" && (
                              <button
                                type="button"
                                onClick={handleAnalyzePlan}
                                disabled={!canAnalyzePlan}
                                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                              >
                                {planAnalysis ? tr("app.reanalyzePlan") : tr("app.analyzePlan")}
                              </button>
                            )}
                            {activeMode === "house3d" && !planAnalysis && (
                              <button
                                type="button"
                                onClick={() => void handleBuildHouseFromPlan()}
                                disabled={!canBuildHouse3dFromPlan}
                                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                              >
                                {tr("app.buildHouseFromPlan")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setPlanImage(null);
                                setPlanAnalysis(null);
                                setRoomTypes({});
                                setSelectedRooms([]);
                                setPlanPanelCollapsed(false);
                              }}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:bg-surface-hover"
                            >
                              {tr("app.remove")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {(planAnalysis || activeMode === "house3d") && (
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <div className="mb-3 flex flex-wrap items-end gap-3">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted">
                              {tr("app.ceilingHeight")}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={2}
                                max={5}
                                step={0.1}
                                value={ceilingHeightM}
                                onChange={(e) => setCeilingHeightM(e.target.value)}
                                placeholder={tr("app.ceilingHeightPlaceholder")}
                                className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm sm:py-1.5"
                              />
                              <span className="text-xs text-muted">
                                {tr("app.ceilingHeightUnit")}
                              </span>
                              <span className="text-xs text-muted">
                                ({tr("app.ceilingHeightHint")})
                              </span>
                            </div>
                          </label>
                          {!isCeilingHeightValid && (
                            <p className="text-xs text-red-500">
                              {tr("app.ceilingHeightInvalid")}
                            </p>
                          )}
                        </div>

                        {activeMode === "house3d" && (
                          <div className="mb-1 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleBuildDefaultHouse}
                              disabled={loading || !isCeilingHeightValid}
                              className="rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                            >
                              {tr("app.buildDefaultHouse")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleBuildHouseFromPlan()}
                              disabled={loading || !isCeilingHeightValid || (!planImage && !planAnalysis)}
                              className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-surface-hover disabled:opacity-40"
                            >
                              {tr("app.buildHouseFromPlan")}
                            </button>
                          </div>
                        )}

                        {planAnalysis && (
                          <>
                            <p className="mb-2 mt-3 text-xs font-medium text-muted">
                              {activeMode === "house3d"
                                ? tr("app.house3dRoomsHint")
                                : tr("app.roomsTitle")}
                            </p>
                            <div className="max-h-[min(40vh,14rem)] space-y-2 overflow-y-auto chat-scroll sm:max-h-48">
                              {planAnalysis.rooms.map((room) => (
                                <div
                                  key={room.number}
                                  className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 rounded-lg border border-border bg-background px-2 py-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:px-3"
                                >
                                  <label className="col-span-1 flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedRooms.includes(room.number)}
                                      onChange={() => toggleRoomSelection(room.number)}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                    <span className="text-sm font-medium">№{room.number}</span>
                                  </label>
                                  <select
                                    value={roomTypes[room.number] ?? room.suggestedType}
                                    onChange={(e) => updateRoomType(room.number, e.target.value)}
                                    className="col-span-2 min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-sm sm:col-span-1 sm:flex-1 sm:py-1"
                                  >
                                    {ROOM_TYPES.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="col-span-2 text-xs text-muted sm:col-span-1 sm:shrink-0">
                                    {room.areaSqm ? `${room.areaSqm} м²` : room.dimensions ?? ""}
                                  </span>
                                  {activeMode === "techpassport" && (
                                    <div className="col-span-2 grid gap-2 sm:col-span-3 sm:grid-cols-2">
                                      <label className="flex flex-col gap-1">
                                        <span className="text-[11px] text-foreground/70">
                                          {tr("app.roomWindows")}
                                        </span>
                                        <input
                                          type="text"
                                          value={roomOverrides[room.number]?.windows ?? ""}
                                          onChange={(e) =>
                                            updateRoomOverride(room.number, "windows", e.target.value)
                                          }
                                          placeholder={tr("app.roomWindowsPlaceholder")}
                                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                                        />
                                      </label>
                                      <label className="flex flex-col gap-1">
                                        <span className="text-[11px] text-foreground/70">
                                          {tr("app.roomDoors")}
                                        </span>
                                        <input
                                          type="text"
                                          value={roomOverrides[room.number]?.doors ?? ""}
                                          onChange={(e) =>
                                            updateRoomOverride(room.number, "doors", e.target.value)
                                          }
                                          placeholder={tr("app.roomDoorsPlaceholder")}
                                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {planAnalysis.layoutSummary && (
                              <p className="mt-2 text-xs text-muted">{planAnalysis.layoutSummary}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-border bg-input-bg shadow-sm transition focus-within:border-foreground/25 focus-within:ring-2 focus-within:ring-accent/15"
                >
                  <textarea
                    ref={textareaRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    rows={2}
                    maxLength={2000}
                    disabled={loading}
                    className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm placeholder:text-muted focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-2 px-2 pb-2 sm:px-3 sm:pb-3">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => planInputRef.current?.click()}
                        className="flex min-h-10 items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted transition hover:bg-surface-hover hover:text-foreground sm:gap-1.5 sm:px-2.5 sm:py-1.5"
                      >
                        <BlueprintIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr("app.plan")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStylePicker((v) => !v)}
                        className="inline-flex min-h-10 items-center gap-1.5 truncate rounded-lg px-2 py-2 text-xs text-muted transition hover:bg-surface-hover hover:text-foreground sm:px-2.5 sm:py-1.5"
                      >
                        <PaletteIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{styleLabel}</span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={
                        activeMode === "house3d"
                          ? loading || !isCeilingHeightValid
                          : !canGenerateTechPassport
                      }
                      className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-[#10120d] shadow-sm transition hover:brightness-105 disabled:opacity-30"
                      aria-label={activeMode === "house3d" ? "Построить 3D" : "Сгенерировать комнаты"}
                    >
                      <ArrowUpIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <input
                    ref={planInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePlanFileChange}
                    className="hidden"
                  />
                </form>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border bg-input-bg shadow-sm transition focus-within:border-foreground/25 focus-within:ring-2 focus-within:ring-accent/15"
              >
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  rows={isEmpty ? 3 : 2}
                  maxLength={2000}
                  disabled={loading}
                  className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm placeholder:text-muted focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2 px-2 pb-2 sm:px-3 sm:pb-3">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-10 items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted transition hover:bg-surface-hover hover:text-foreground sm:gap-1.5 sm:px-2.5 sm:py-1.5"
                    >
                      <PaperclipIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tr("app.files")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStylePicker((v) => !v)}
                      className="inline-flex min-h-10 items-center gap-1.5 truncate rounded-lg px-2 py-2 text-xs text-muted transition hover:bg-surface-hover hover:text-foreground sm:px-2.5 sm:py-1.5"
                    >
                      <PaletteIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{styleLabel}</span>
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!canGenerateStandard}
                    className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-[#10120d] shadow-sm transition hover:brightness-105 disabled:opacity-30"
                    aria-label="Отправить"
                  >
                    <ArrowUpIcon className="h-5 w-5" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </form>
            )}

            {showStylePicker && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border bg-surface p-2 chat-scroll">
                <button
                  onClick={() => selectStyle(NO_STYLE_ID)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${styleId === NO_STYLE_ID ? "bg-surface-hover" : "hover:bg-surface-hover"}`}
                >
                  {tr("app.styleAuto")}
                </button>
                {DESIGN_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStyle(s.id)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${styleId === s.id ? "bg-surface-hover" : "hover:bg-surface-hover"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BuyCreditsModal
        open={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
        currency={process.env.NEXT_PUBLIC_BEPAID_CURRENCY ?? "USD"}
        locale={locale}
        currentPlanId={subActive ? subPlanId : null}
        tr={tr}
        labels={{
          title: tr("payment.title"),
          subtitle: tr("payment.subtitle"),
          buy: tr("payment.buy"),
          close: tr("payment.close"),
          loading: tr("payment.loading"),
          error: tr("payment.error"),
          perMonth: tr("payment.perMonth"),
          current: tr("payment.current"),
          modes: tr("payment.modes"),
          generationsIncluded: tr("payment.generationsIncluded"),
        }}
      />
    </div>
  );
}
