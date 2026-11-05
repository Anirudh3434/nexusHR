"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { 
  Plug, 
  Copy, 
  Check, 
  KeyRound,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { SupportedAiClient } from "../mcp/ConnectMcpModal";

interface ClientOption {
  id: SupportedAiClient;
  name: string;
  image: string;
  path: string;
}

const SETTINGS_CLIENTS: ClientOption[] = [
  {
    id: "claude",
    name: "Claude",
    image: "/icons/mcp/claude.png",
    path: "%APPDATA%\\Claude\\claude_desktop_config.json",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    image: "/icons/mcp/antigravity.png",
    path: "~/.gemini/antigravity/mcp/nexushr.json",
  },
  {
    id: "codex",
    name: "Codex",
    image: "/icons/mcp/codex.svg",
    path: "codex.mcp.json",
  },
  {
    id: "devin",
    name: "Devin",
    image: "/icons/mcp/devin.svg",
    path: "devin.json",
  },
  {
    id: "cursor",
    name: "Cursor",
    image: "/icons/mcp/cursor.svg",
    path: ".cursor/mcp.json",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    image: "/icons/mcp/windsurf.png",
    path: "~/.codeium/windsurf/mcp_config.json",
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

export function McpSection() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeClient, setActiveClient] = useState<SupportedAiClient>("claude");
  const [copied, setCopied] = useState(false);
  
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>(["read", "write"]);
  const [selectedModules, setSelectedModules] = useState<string[]>(["tasks", "attendance", "leave", "notices", "employees"]);
  const [token, setToken] = useState<string>("");
  const [showPermissionsPanel, setShowPermissionsPanel] = useState<boolean>(false);

  const serverPath = "C:/Users/Anirudh Bhardwaj/Desktop/nexusHR/mcp-server/index.ts";

  const fetchToken = useCallback(async (perms: PermissionType[], mods: string[]) => {
    try {
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
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchToken(selectedPermissions, selectedModules);
    }
  }, [user]);

  const togglePermission = (perm: PermissionType) => {
    let next: PermissionType[];
    if (selectedPermissions.includes(perm)) {
      if (selectedPermissions.length === 1) return;
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
      if (selectedModules.length === 1) return;
      next = selectedModules.filter((m) => m !== modId);
    } else {
      next = [...selectedModules, modId];
    }
    setSelectedModules(next);
    fetchToken(selectedPermissions, next);
  };

  if (!user) return null;

  const currentToken = token || `nx_mcp_live_${user.id ? user.id.slice(0, 16) : "auth_token"}`;

  const getClientRawJson = () => {
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
              command: `npx -y tsx "${serverPath}"`,
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
            args: ["-y", "tsx", serverPath],
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
      description: "MCP configuration copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const current = SETTINGS_CLIENTS.find((c) => c.id === activeClient) || SETTINGS_CLIENTS[0];

  return (
    <div className="relative w-full max-w-2xl rounded-[32px] border border-white/40 dark:border-white/10 bg-gradient-to-b from-white/95 via-white/90 to-white/80 dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-950/85 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden p-6 sm:p-7">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');
        .font-cursive {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      {/* Ambient blurred primary reflections */}
      <div className="absolute -top-16 -left-16 w-60 h-60 bg-primary/25 rounded-full blur-[75px] pointer-events-none" />
      <div className="absolute top-1/3 -left-12 w-44 h-44 bg-primary/20 rounded-full blur-[65px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-primary/15 rounded-full blur-[70px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/25 shadow-xs">
            <Plug className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div className="leading-tight">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-1.5">
              Connect <span className="font-cursive text-2xl font-bold text-primary tracking-normal">intelligently</span> via MCP
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Plug your workspace <span className="font-cursive text-sm font-bold text-primary">seamlessly</span> into your AI.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 mt-0.5"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Role & Email Context Pill */}
      <div className="relative z-10 mt-5 flex items-center justify-between px-5 py-2.5 rounded-full bg-primary/[0.08] border border-primary/25 text-xs">
        <span className="text-neutral-600 dark:text-neutral-300">
          Role: <strong className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">{user.role}</strong>
        </span>
        <span className="font-mono font-semibold text-primary text-[11px] sm:text-xs truncate max-w-[240px]">
          {user.email}
        </span>
      </div>

      {/* Granular Permission & Functions Controls */}
      <div className="relative z-10 mt-3 rounded-2xl bg-white/70 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 p-3 shadow-2xs">
        <div 
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setShowPermissionsPanel(!showPermissionsPanel)}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Token Scopes: <span className="font-cursive text-primary text-base font-bold normal-case">custom permissions</span></span>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              {selectedPermissions.join(" • ")}
            </span>
          </div>
          <button type="button" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1">
            {showPermissionsPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showPermissionsPanel && (
          <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/50 space-y-3 animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                Action Permissions
              </label>
              <div className="flex items-center gap-2">
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

            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-700/60 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-neutral-500 font-mono text-[10px] shrink-0">AUTH_TOKEN:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold truncate">
                  {currentToken.slice(0, 24)}...
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentToken);
                  addToast({ type: "success", title: "Auth Token Copied!" });
                }}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-neutral-700 dark:text-neutral-200 hover:text-primary transition-colors cursor-pointer shrink-0"
              >
                Copy Token
              </button>
            </div>
          </div>
        )}
      </div>

      {/* "SELECT assistant" Row */}
      <div className="relative z-10 mt-4 flex items-center justify-between px-1">
        <div className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          SELECT <span className="font-cursive lowercase text-primary text-base font-bold tracking-normal">assistant</span>
        </div>
        <div className="font-mono text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate max-w-[260px]">
          {current.path}
        </div>
      </div>

      {/* Horizontal Assistant Selection Grid */}
      <div className="relative z-10 mt-2 grid grid-cols-6 gap-2">
        {SETTINGS_CLIENTS.map((client) => {
          const isActive = activeClient === client.id;
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => setActiveClient(client.id)}
              className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? "bg-primary/[0.12] border-2 border-primary/45 shadow-sm"
                  : "bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/70 hover:bg-white dark:hover:bg-neutral-800 shadow-2xs hover:shadow-xs"
              }`}
            >
              {isActive && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-900 shadow-xs" />
              )}

              <div className="w-7 h-7 rounded-lg flex items-center justify-center p-0.5">
                <img 
                  src={client.image} 
                  alt={client.name} 
                  className="w-full h-full object-contain" 
                />
              </div>
              <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate max-w-full">
                {client.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dark Syntax Highlighted Code Box */}
      <div className="relative z-10 mt-4 rounded-2xl bg-[#36363c] dark:bg-[#25252a] p-4 text-xs font-mono shadow-inner border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-white font-medium text-xs">
              {current.name} config
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <div className="pt-3 overflow-x-auto text-[11px] sm:text-xs leading-relaxed text-zinc-300 font-mono max-h-[160px] scrollbar-thin">
          {activeClient === "devin" ? (
            <pre>
              <span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;<span className="text-[#818cf8]">&quot;mcp_servers&quot;</span>: <span className="text-white">[</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;name&quot;</span>: <span className="text-[#34d399]">&quot;nexushr&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;command&quot;</span>: <span className="text-[#34d399]">&quot;npx -y tsx {serverPath}&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;env&quot;</span>: <span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_AUTH_TOKEN&quot;</span>: <span className="text-[#34d399]">&quot;{currentToken.slice(0, 20)}...&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_USER_EMAIL&quot;</span>: <span className="text-[#34d399]">&quot;{user.email}&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_PERMISSIONS&quot;</span>: <span className="text-[#34d399]">&quot;{selectedPermissions.join(",")}&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_MODULES&quot;</span>: <span className="text-[#34d399]">&quot;{selectedModules.join(",")}&quot;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">&#125;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">&#125;</span>
              <br />
              &nbsp;&nbsp;<span className="text-white">]</span>
              <br />
              <span className="text-white">&#125;</span>
            </pre>
          ) : (
            <pre>
              <span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;<span className="text-[#818cf8]">&quot;mcpServers&quot;</span>: <span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#fbbf24]">&quot;nexushr&quot;</span>: <span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;command&quot;</span>: <span className="text-[#34d399]">&quot;npx&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;args&quot;</span>: <span className="text-white">[</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#34d399]">&quot;-y&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#34d399]">&quot;tsx&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#34d399]">&quot;{serverPath}&quot;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">]</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;env&quot;</span>: <span className="text-white">&#123;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_AUTH_TOKEN&quot;</span>: <span className="text-[#34d399]">&quot;{currentToken.slice(0, 20)}...&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_USER_EMAIL&quot;</span>: <span className="text-[#34d399]">&quot;{user.email}&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_PERMISSIONS&quot;</span>: <span className="text-[#34d399]">&quot;{selectedPermissions.join(",")}&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#38bdf8]">&quot;NEXUS_MODULES&quot;</span>: <span className="text-[#34d399]">&quot;{selectedModules.join(",")}&quot;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">&#125;</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">&#125;</span>
              <br />
              &nbsp;&nbsp;<span className="text-white">&#125;</span>
              <br />
              <span className="text-white">&#125;</span>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
