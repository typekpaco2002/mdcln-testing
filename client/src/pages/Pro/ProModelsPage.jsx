import React, { useState } from "react";
import { User, Plus } from "lucide-react";
import { useCachedModels } from "../../hooks/useCachedModels";
import { getThumbnailUrl } from "../../utils/imageUtils";
import CreateModelModal from "../../components/CreateModelModal";
import toast from "react-hot-toast";

export default function ProModelsPage() {
  const { models, isLoading, refetch, invalidateModels } = useCachedModels();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="p-8 md:p-10">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1" data-pro-heading style={{ color: "var(--pro-text)" }}>
            Models
          </h1>
          <p className="text-sm" style={{ color: "var(--pro-text-muted)" }}>
            Create and manage your models.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-bg)] hover:opacity-90"
          style={{
            background: "var(--pro-accent)",
            color: "var(--pro-bg)",
          }}
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Add model
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--pro-text-muted)" }}>
          Loading models…
        </p>
      ) : models.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed p-12 md:p-16 text-center animate-fade-in"
          style={{
            borderColor: "var(--pro-border)",
            background: "var(--pro-surface)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--pro-surface-elevated)", border: "1px solid var(--pro-border)" }}
          >
            <User className="w-7 h-7" style={{ color: "var(--pro-text-muted)" }} aria-hidden />
          </div>
          <p className="font-medium mb-1" style={{ color: "var(--pro-text)" }}>
            No models yet
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--pro-text-muted)" }}>
            Create your first model to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-bg)]"
            style={{
              background: "var(--pro-accent)",
              color: "var(--pro-bg)",
            }}
          >
            <Plus className="w-4 h-4" aria-hidden />
            Create your first model
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {models.map((m) => (
            <div
              key={m.id}
              className="rounded-xl overflow-hidden border transition-all duration-200 hover:border-[var(--pro-border-strong)] focus-within:ring-2 focus-within:ring-[var(--pro-accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--pro-bg)]"
              style={{
                background: "var(--pro-surface)",
                borderColor: "var(--pro-border)",
              }}
            >
              <div className="aspect-[3/4] relative overflow-hidden" style={{ background: "var(--pro-surface-elevated)" }}>
                <img
                  src={getThumbnailUrl(m.photo1Url) || ""}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate" style={{ color: "var(--pro-text)" }}>
                  {m.name}
                </p>
                <p className="text-xs" style={{ color: "var(--pro-text-muted)" }}>
                  {m.status === "processing" ? "Processing…" : "Ready"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateModelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          invalidateModels();
          refetch();
          setShowCreateModal(false);
        }}
        onNeedCredits={() => toast.error("Not enough credits")}
      />
    </div>
  );
}
