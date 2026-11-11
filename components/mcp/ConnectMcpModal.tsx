"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { 
  Copy, 
  Check, 
  X, 
  KeyRound, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FolderCode,
  Globe,
  Terminal
} from "lucide-react";

interface ConnectMcpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SupportedAiClient = "claude" | "antigravity" | "codex" | "devin" | "cursor" | "windsurf";

interface ClientMeta {
  id: SupportedAiClient;
  name: string;
  image: string;
  configPath: string;
}

const CLIENTS: ClientMeta[] = [
  {
    id: "claude",
    name: "Claude",
    image: "/icons/mcp/claude.png",
    configPath: "%APPDATA%\\Claude\\claude_desktop_config.json",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    image: "/icons/mcp/antigravity.png",
    configPath: "~/.gemini/antigravity/mcp/nexushr.json",
  },
  {
    id: "codex",
    name: "Codex",
    image: "/icons/mcp/codex.svg",
    configPath: "codex.mcp.json",
  },
  {
    id: "devin",
    name: "Devin",
    image: "/icons/mcp/devin.svg",
    configPath: "devin.json",
  },
  {
    id: "cursor",
    name: "Cursor",
    image: "/icons/mcp/cursor.svg",
    configPath: ".cursor/mcp.json",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    image: "/icons/mcp/windsurf.png",
    configPath: "~/.codeium/windsurf/mcp_config.json",
  },
];

type PermissionType = "read" | "write" | "delete";

const AVAILABLE_MODULES = [
  { id: "tasks", label: "Tasks" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leaves" },
  { id: "notices", label: "Notices" },
  { id: "employees", label: "Directory" },
];

export function ConnectMcpModal({ isOpen, onClose }: ConnectMcpModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeClient, setActiveClient] = useState<SupportedAiClient>("claude");
  const [copied, setCopied] = useState(false);
  
  // Granular Scopes & Token State
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>(["read", "write"]);
  const [selectedModules, setSelectedModules] = useState<string[]>(["tasks", "attendance", "leave", "notices", "employees"]);
  const [token, setToken] = useState<string>("");
  const [showPermissionsPanel, setShowPermissionsPanel] = useState<boolean>(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);

  const [transportMode, setTransportMode] = useState<"remote" | "local">("remote");
  const [origin, setOrigin] = useState("https://nexus-hr-udh9.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const endpointUrl = `${origin}/api/mcp`;
  const serverPath = process.env.NEXT_PUBLIC_MCP_SERVER_PATH || "nexushr-mcp";

  // Fetch or regenerate token when permissions/modules change
  const fetchToken = useCallback(async (perms: PermissionType[], mods: string[]) => {
    try {
      setIsGeneratingToken(true);
      const res = await fetch("/api/mcp/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms, modules: mods }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
        }
      }
    } catch (e) {
      console.error("Failed to generate token", e);
    } finally {
      setIsGeneratingToken(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      fetchToken(selectedPermissions, selectedModules);
    }
  }, [isOpen, user]);

  const togglePermission = (perm: PermissionType) => {
    let next: PermissionType[];
    if (selectedPermissions.includes(perm)) {
      if (selectedPermissions.length === 1) {
        addToast({ type: "error", title: "At least one permission required" });
        return;
      }
      next = selectedPermissions.filter((p) => p !== perm);
    } else {
      next = [...selectedPermissions, perm];
    }
    setSelectedPermissions(next);
    fetchToken(next, selectedModules);
  };

  const toggleModule = (modId: string) => {
    let next: string[];
    if (selectedModules.includes(modId)) {
      if (selectedModules.length === 1) {
        addToast({ type: "error", title: "At least one function module required" });
        return;
      }
      next = selectedModules.filter((m) => m !== modId);
    } else {
      next = [...selectedModules, modId];
    }
    setSelectedModules(next);
    fetchToken(selectedPermissions, next);
  };

  if (!isOpen || !user) return null;

  const currentToken = token || `nx_mcp_live_${user.id ? user.id.slice(0, 16) : "auth_token"}`;

  const getClientRawJson = () => {
    if (transportMode === "remote") {
      if (activeClient === "devin") {
        return JSON.stringify(
          {
            mcp_servers: [
              {
                name: "nexushr",
                url: endpointUrl,
                headers: {
                  Authorization: `Bearer ${currentToken}`,
                },
              },
            ],
          },
          null,
          2
        );
      }

      if (activeClient === "windsurf") {
        return JSON.stringify(
          {
            mcpServers: {
              nexushr: {
                serverUrl: endpointUrl,
                headers: {
                  Authorization: `Bearer ${currentToken}`,
                },
              },
            },
          },
          null,
          2
        );
      }

      return JSON.stringify(
        {
          mcpServers: {
            nexushr: {
              url: endpointUrl,
              headers: {
                Authorization: `Bearer ${currentToken}`,
              },
            },
          },
        },
        null,
        2
      );
    }

    // Local CLI transport
    const envObj = {
      NEXUS_AUTH_TOKEN: currentToken,
      NEXUS_USER_EMAIL: user.email,
      NEXUS_PERMISSIONS: selectedPermissions.join(","),
      NEXUS_MODULES: selectedModules.join(","),
    };

    if (activeClient === "devin") {
      return JSON.stringify(
        {
          mcp_servers: [
            {
              name: "nexushr",
              command: `npx -y ${serverPath}`,
              env: envObj,
            },
          ],
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        mcpServers: {
          nexushr: {
            command: "npx",
            args: ["-y", serverPath],
            env: envObj,
          },
        },
      },
      null,
      2
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getClientRawJson());
    setCopied(true);
    addToast({
      type: "success",
      title: "Copied!",
      description: `Configuration with custom permissions copied.`,
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const currentClient = CLIENTS.find((c) => c.id === activeClient) || CLIENTS[0];

  return (
    <ModalPortal>
      {/* Import Caveat cursive font for handwritten accents */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');
        .font-cursive {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Main Glassmorphic Card */}
        <div 
          className="relative w-full max-w-[530px] rounded-[24px] sm:rounded-[32px] border border-white/40 dark:border-white/10 bg-gradient-to-b from-white/95 via-white/90 to-white/80 dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-950/85 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-x-hidden overflow-y-auto scrollbar-hide flex flex-col p-4 sm:p-7 max-h-[95vh] sm:max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient blurred primary reflections */}
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-primary/25 rounded-full blur-[75px] pointer-events-none" />
          <div className="absolute top-1/3 -left-12 w-44 h-44 bg-primary/20 rounded-full blur-[65px] pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-primary/15 rounded-full blur-[70px] pointer-events-none" />

          {/* Header Row */}
          <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              {/* Nexi MCP Mascot Avatar with 3D Popout */}
              <div className="relative group shrink-0 w-11 h-11 sm:w-13 sm:h-13 flex items-end justify-center select-none" aria-hidden="true">
                <div className="absolute inset-0 rounded-full bg-primary/25 blur-md opacity-80 pointer-events-none" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/25 via-indigo-600/20 to-violet-600/30 border border-primary/35 shadow-xs pointer-events-none" />
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                  <img
                    src="/images/mascot/nexi_mcp_avatar.png"
                    alt="Nexi MCP"
                    className="absolute inset-0 w-full h-full object-cover object-top scale-125 -translate-y-1 drop-shadow-xs select-none pointer-events-none transition-transform duration-200 group-hover:scale-130 group-hover:-translate-y-1.5"
                  />
                </div>
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{ clipPath: 'polygon(-50% -100%, 150% -100%, 150% 50%, -50% 50%)' }}
                >
                  <img
                    src="/images/mascot/nexi_mcp_avatar.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-top scale-125 -translate-y-1 drop-shadow-sm select-none pointer-events-none transition-transform duration-200 group-hover:scale-130 group-hover:-translate-y-1.5"
                  />
                </div>
              </div>
              <div className="min-w-0 leading-tight">
                <h2 className="text-base sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Connect <span className="font-cursive text-xl sm:text-2xl font-bold text-primary tracking-normal inline-block">intelligently</span> via MCP
                </h2>
                <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Plug your workspace <span className="font-cursive text-xs sm:text-sm font-bold text-primary inline-block">seamlessly</span> into your AI.
                </p>
              </div>
            </div>

            {/* Circular Close Button */}
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-300/60 transition-all flex items-center justify-center cursor-pointer shrink-0 mt-0.5"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Role & Email Context Pill with Responsive Layout */}
          <div className="relative z-10 mt-3.5 sm:mt-5 flex flex-wrap items-center justify-between gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full bg-primary/[0.08] border border-primary/25 text-xs">
            <span className="text-neutral-600 dark:text-neutral-300">
              Role: <strong className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">{user.role}</strong>
            </span>
            <span className="font-mono font-semibold text-primary text-[11px] sm:text-xs truncate max-w-full sm:max-w-[240px]">
              {user.email}
            </span>
          </div>

          {/* Granular Permission & Functions Controls (Collapsible) */}
          <div className="relative z-10 mt-3 rounded-2xl bg-white/70 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 p-3 shadow-2xs">
            <div 
              className="flex items-center justify-between gap-2 cursor-pointer select-none"
              onClick={() => setShowPermissionsPanel(!showPermissionsPanel)}
            >
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 min-w-0">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Token Scopes: <span className="font-cursive text-primary text-sm sm:text-base font-bold normal-case">custom permissions</span></span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {selectedPermissions.join(" • ")}
                </span>
              </div>
              <button 
                type="button" 
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 shrink-0"
                aria-label="Toggle Permissions"
              >
                {showPermissionsPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Expanded Controls Panel */}
            {showPermissionsPanel && (
              <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/50 space-y-3 animate-in fade-in duration-150">
                {/* Read / Write / Delete Permission Checkboxes */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                    Action Permissions
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["read", "write", "delete"] as PermissionType[]).map((perm) => {
                      const isSelected = selectedPermissions.includes(perm);
                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => togglePermission(perm)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-white shadow-xs"
                              : "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                            isSelected ? "bg-white/20 text-white" : "border border-neutral-400"
                          }`}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span className="capitalize">{perm}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Function Modules Multi-Selection */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                    Authorized Functions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isSelected = selectedModules.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                              : "bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 dark:text-neutral-400 border border-transparent hover:border-neutral-300"
                          }`}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {mod.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Authorization Token Preview */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-700/60 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                    <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-neutral-500 font-mono text-[10px] shrink-0">AUTH_TOKEN:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold truncate text-[10px] sm:text-xs">
                      {currentToken.slice(0, 24)}...
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentToken);
                      addToast({ type: "success", title: "Auth Token Copied!" });
                    }}
                    className="self-end sm:self-auto px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-neutral-700 dark:text-neutral-200 hover:text-primary transition-colors cursor-pointer shrink-0"
                  >
                    Copy Token
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* "SELECT assistant" Row with No Collisions */}
          <div className="relative z-10 mt-3.5 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
              SELECT <span className="font-cursive lowercase text-primary text-base font-bold tracking-normal">assistant</span>
            </div>
            <div className="font-mono text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-full sm:max-w-[270px] bg-neutral-100/70 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md flex items-center gap-1 self-start sm:self-auto">
              <FolderCode className="h-3 w-3 shrink-0 text-primary/70" />
              <span className="truncate">{currentClient.configPath}</span>
            </div>
          </div>

          {/* Responsive Assistant Selection Grid (3 cols on mobile, 6 on sm+) */}
          <div className="relative z-10 mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CLIENTS.map((client) => {
              const isActive = activeClient === client.id;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setActiveClient(client.id)}
                  className={`relative flex flex-col items-center justify-center py-2 sm:py-2.5 px-1.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary/[0.12] border-2 border-primary/45 shadow-sm"
                      : "bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/70 hover:bg-white dark:hover:bg-neutral-800 shadow-2xs hover:shadow-xs"
                  }`}
                >
                  {/* Top indicator dot on active button matching screenshot */}
                  {isActive && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-900 shadow-xs" />
                  )}

                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center p-0.5">
                    <img 
                      src={client.image} 
                      alt={client.name} 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate max-w-full text-center">
                    {client.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Transport Mode Switcher */}
          <div className="relative z-10 mt-3.5 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <span>TRANSPORT</span> <span className="font-cursive lowercase text-primary text-base font-bold tracking-normal">protocol</span>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-200/70 dark:bg-neutral-800/80 border border-neutral-300/60 dark:border-neutral-700/60 text-[10px]">
              <button
                type="button"
                onClick={() => setTransportMode("remote")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  transportMode === "remote"
                    ? "bg-primary text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Cloud Remote (SSE)</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTransportMode("local")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  transportMode === "local"
                    ? "bg-primary text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Terminal className="h-3 w-3" />
                <span>Local CLI (npx)</span>
              </button>
            </div>
          </div>

          {/* Dark Syntax Highlighted Code Box */}
          <div className="relative z-10 mt-2.5 rounded-2xl bg-[#36363c] dark:bg-[#25252a] p-3 sm:p-4 text-xs font-mono shadow-inner border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/10 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
                <span className="text-white font-medium text-xs truncate">
                  {currentClient.name} · {transportMode === "remote" ? "Remote HTTPS/SSE (Zero Local Paths)" : "Local CLI Transport"}
                </span>
              </div>

              {/* Copy button in Primary Coral Color */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-primary hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Syntax-highlighted code (no inner scrollbar; expands to fit the snippet) */}
            <div className="pt-2.5 sm:pt-3 overflow-x-auto scrollbar-hide text-[10px] sm:text-xs leading-relaxed text-zinc-300 font-mono">
              <pre className="font-mono text-zinc-200 whitespace-pre selection:bg-primary/30">
                {getClientRawJson()}
              </pre>
            </div>
          </div>

          {/* Footer Row matching screenshot */}
          <div className="relative z-10 mt-4 sm:mt-5 flex items-center justify-between gap-3">
            <span className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">
              Active with <span className="font-cursive text-sm font-bold text-primary">{selectedPermissions.length === 3 ? "full" : selectedPermissions.join("+")}</span> permission scope
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-6 sm:px-7 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
