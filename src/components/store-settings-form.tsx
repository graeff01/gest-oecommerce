"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Save, Sparkles, Store, Trash2 } from "lucide-react";
import { updateStoreSettingsAction } from "@/app/(app)/actions/settings";

type Props = {
  initialData: {
    storeName: string;
    storeTagline: string | null;
    loginImageUrl: string | null;
  };
};

export function StoreSettingsForm({ initialData }: Props) {
  const [storeName, setStoreName] = useState(initialData.storeName);
  const [storeTagline, setStoreTagline] = useState(initialData.storeTagline ?? "");
  const [loginImageUrl, setLoginImageUrl] = useState(initialData.loginImageUrl ?? "");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function buildFormData(overrides: Partial<Record<string, string>> = {}) {
    const data = new FormData();
    data.append("storeName", overrides.storeName ?? storeName);
    data.append("storeTagline", overrides.storeTagline ?? storeTagline);
    data.append("loginImageUrl", overrides.loginImageUrl ?? loginImageUrl);
    return data;
  }

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Falha ao enviar imagem.");
      setLoginImageUrl(data.url);
      await updateStoreSettingsAction(buildFormData({ loginImageUrl: data.url }));
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2400);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Falha ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    setLoginImageUrl("");
    await updateStoreSettingsAction(buildFormData({ loginImageUrl: "" }));
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 2400);
  }

  function submit() {
    startTransition(async () => {
      await updateStoreSettingsAction(buildFormData());
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2400);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.05fr]">
      {/* identidade */}
      <div className="surface-card grid gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
            <Store size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Identidade da loja</h2>
            <p className="text-[0.76rem] font-normal text-muted">Nome, slogan e imagem que aparecem no login.</p>
          </div>
        </div>

        <label className="label">
          Nome da loja
          <input
            className="field"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="Ex: Boutique Aurora"
            maxLength={60}
            required
          />
        </label>

        <label className="label">
          Slogan / tagline
          <input
            className="field"
            value={storeTagline}
            onChange={(event) => setStoreTagline(event.target.value)}
            placeholder="Ex: Moda atemporal feita à mão"
            maxLength={120}
          />
          <span className="text-[0.7rem] font-normal text-subtle">{storeTagline.length}/120</span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            {savedAt ? (
              <p className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-success">
                <Sparkles size={13} /> Configurações salvas
              </p>
            ) : (
              <p className="text-[0.78rem] font-normal text-muted">As alterações refletem imediatamente no login.</p>
            )}
          </div>
          <button type="button" onClick={submit} disabled={pending} className="button-primary shrink-0">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.2} />}
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* upload de imagem */}
      <div className="surface-card grid gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-fg">
            <ImagePlus size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Imagem do login</h2>
            <p className="text-[0.76rem] font-normal text-muted">JPG, PNG, WEBP ou AVIF · até 6 MB.</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />

        {/* preview */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
          }}
          className="group relative grid aspect-[3/2] cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-2/40 transition hover:border-primary/40 hover:bg-primary-soft/30"
        >
          {loginImageUrl ? (
            <>
              <img src={loginImageUrl} alt="Imagem do login" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-fg/60 via-fg/10 to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="relative z-10 inline-flex items-center gap-2 rounded-full bg-fg/90 px-3 py-1.5 text-[0.78rem] font-medium text-bg opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                <ImagePlus size={14} /> Trocar imagem
              </span>
            </>
          ) : uploading ? (
            <div className="grid place-items-center gap-3 text-center">
              <Loader2 size={26} className="animate-spin text-primary" />
              <p className="text-[0.86rem] font-medium text-muted">Enviando imagem...</p>
            </div>
          ) : (
            <div className="grid place-items-center gap-2 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <ImagePlus size={20} strokeWidth={2.1} />
              </span>
              <p className="text-[0.86rem] font-medium text-fg">Clique para escolher uma imagem</p>
              <p className="text-[0.74rem] font-normal text-muted">Recomendado 1600 × 1100 px ou maior</p>
            </div>
          )}

          {uploading && loginImageUrl ? (
            <div className="absolute inset-0 grid place-items-center bg-fg/40 backdrop-blur-sm">
              <Loader2 size={26} className="animate-spin text-bg" />
            </div>
          ) : null}
        </div>

        {uploadError ? (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[0.78rem] font-medium text-danger">
            {uploadError}
          </p>
        ) : null}

        {loginImageUrl ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-3 py-2">
            <span className="truncate text-[0.74rem] font-medium text-muted">{loginImageUrl}</span>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="inline-flex items-center gap-1.5 rounded-lg bg-danger-soft px-2.5 py-1 text-[0.74rem] font-semibold text-danger transition hover:bg-danger/15"
            >
              <Trash2 size={12} /> Remover
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
