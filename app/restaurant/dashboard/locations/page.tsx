"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentRestaurant } from '@/lib/storage';
import type { Restaurant } from '@/lib/types';

// ─────────────────────────────────────────────
//   THEME
// ─────────────────────────────────────────────
const T = {
  bg: "#F7F5F2",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.07)",
  input: "#F2F0ED",
  separator: "rgba(0,0,0,0.06)",
  text1: "#111111",
  text2: "#555555",
  text3: "#999999",
  red: "#E8161A",
  orange: "#F97316",
  success: "#16A34A",
  successBg: "#F0FDF4",
  errorBg: "#FEF2F2",
};

// ─────────────────────────────────────────────
//   TYPES
// ─────────────────────────────────────────────
interface Location {
  id: string;
  restaurant_uuid: string;
  restaurant_name: string;
  country: string;
  city: string;
  neighborhood: string;
  address: string | null;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

// ─────────────────────────────────────────────
//   CLEANING UTILS
// ─────────────────────────────────────────────
function cleanAddress(address: string | null): string {
  if (!address) return "";
  return address
    .replace(/CTR KOROFINA/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────
//   FIELD
// ─────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>
        {label}
        {required && <span style={{ color: T.red }}>*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: "100%", background: T.input, border: `1.5px solid transparent`,
            borderRadius: 12, padding: "11px 14px", fontSize: 14, color: T.text1,
            fontFamily: "inherit", resize: "vertical", outline: "none",
            transition: "border-color 0.15s", boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = T.red; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", background: T.input, border: `1.5px solid transparent`,
            borderRadius: 12, padding: "11px 14px", fontSize: 14, color: T.text1,
            fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = T.red; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//   FORM STATE
// ─────────────────────────────────────────────
type FormMode = "create" | "edit";

interface FormState {
  restaurantName: string;
  country: string;
  city: string;
  neighborhood: string;
  address: string;
  openTime: string;
  closeTime: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: FormState = {
  restaurantName: "",
  country: "",
  city: "",
  neighborhood: "",
  address: "",
  openTime: "09:00",
  closeTime: "23:00",
  latitude: "",
  longitude: "",
};

// ─────────────────────────────────────────────
//   LOCATION FORM MODAL  (create + edit)
// ─────────────────────────────────────────────
function LocationModal({
  visible,
  mode,
  initialData,
  locationId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  mode: FormMode;
  initialData?: FormState;
  locationId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setForm(initialData ?? EMPTY_FORM);
      setError("");
    }
  }, [visible, initialData]);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const isValid =
    form.restaurantName.trim() &&
    form.country.trim() &&
    form.city.trim() &&
    form.neighborhood.trim();

  const handleSave = async () => {
    const currentRestaurant = getCurrentRestaurant();
    if (!currentRestaurant) {
      setError("Connexion requise pour gérer les emplacements.");
      setSaving(false);
      return;
    }

    if (!isValid) { setError("Remplis tous les champs obligatoires."); return; }
    setError("");
    setSaving(true);

    const cleanedAddressValue = cleanAddress(form.address) || null;

    try {
      if (mode === "create") {
        const { data: existing } = await supabase
          .from("restaurant_locations")
          .select("id")
          .eq("restaurant_uuid", currentRestaurant.id)
          .maybeSingle();

        if (existing) {
          setError("Un emplacement existe déjà pour ce restaurant.");
          setSaving(false);
          return;
        }

        const { error: locErr } = await supabase
          .from("restaurant_locations")
          .insert([{
            restaurant_uuid: currentRestaurant.id,
            restaurant_name: currentRestaurant.nom,
            country: form.country.trim(),
            city: form.city.trim(),
            neighborhood: form.neighborhood.trim(),
            address: cleanedAddressValue,
            opening_time: form.openTime,
            closing_time: form.closeTime,
            is_active: true,
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
          }]);

        if (locErr) throw locErr;

      } else if (mode === "edit" && locationId) {
        const { error: locErr } = await supabase
          .from("restaurant_locations")
          .update({
            restaurant_name: form.restaurantName.trim(),
            country: form.country.trim(),
            city: form.city.trim(),
            neighborhood: form.neighborhood.trim(),
            address: cleanedAddressValue,
            opening_time: form.openTime,
            closing_time: form.closeTime,
            latitude: form.latitude ? parseFloat(form.latitude) : null,
            longitude: form.longitude ? parseFloat(form.longitude) : null,
          })
          .eq("id", locationId);

        if (locErr) throw locErr;
      }

      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: T.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        width: "100%", maxWidth: 600, maxHeight: "93vh",
        display: "flex", flexDirection: "column", animation: "slideUp 0.28s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: "#DDD", alignSelf: "center", marginTop: 12 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 14px", borderBottom: `1px solid ${T.separator}` }}>
          <button
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 10, background: T.input, border: "none", cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: T.text1 }}
          >✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text1 }}>
              {mode === "create" ? "📍 Créer l'emplacement" : "✏️ Modifier l'emplacement"}
            </div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 1 }}>
              {mode === "create" ? "Un seul emplacement par restaurant" : "Mettre à jour les informations"}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
          {error && (
            <div style={{ background: T.errorBg, border: `1px solid #FCA5A5`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#B91C1C", fontSize: 13, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

           {/* GPS */}
<div style={{ marginBottom: 16 }}>
  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
    Localisation GPS
  </label>
  <button
    type="button"
    onClick={async () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      });
    }}
    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "none", background: "#EFF6FF", color: "#2563EB", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8, fontFamily: "inherit" }}
  >
    📍 Détecter ma position GPS
  </button>
  <div style={{ display: "flex", gap: 10 }}>
    <input
      type="number"
      placeholder="Latitude"
      value={form.latitude}
      onChange={e => setForm(prev => ({ ...prev, latitude: e.target.value }))}
      style={{ flex: 1, background: T.input, border: "1.5px solid transparent", borderRadius: 12, padding: "11px 14px", fontSize: 14, color: T.text1, outline: "none", fontFamily: "inherit" }}
    />
    <input
      type="number"
      placeholder="Longitude"
      value={form.longitude}
      onChange={e => setForm(prev => ({ ...prev, longitude: e.target.value }))}
      style={{ flex: 1, background: T.input, border: "1.5px solid transparent", borderRadius: 12, padding: "11px 14px", fontSize: 14, color: T.text1, outline: "none", fontFamily: "inherit" }}
    />
  </div>
  {form.latitude && form.longitude && (
    <div style={{ fontSize: 11, color: T.success, marginTop: 6, fontWeight: 600 }}>
      ✅ {form.latitude}, {form.longitude}
    </div>
  )}
</div>

          <Field label="Nom du restaurant" value={form.restaurantName} onChange={set("restaurantName")} placeholder="Ex: Chitir Chicken" required />
          <Field label="Pays" value={form.country} onChange={set("country")} placeholder="Ex: Sénégal" required />
          <Field label="Ville" value={form.city} onChange={set("city")} placeholder="Ex: Dakar" required />
          <Field label="Quartier / Zone" value={form.neighborhood} onChange={set("neighborhood")} placeholder="Ex: Plateau" required />

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Horaires d'ouverture
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.input, borderRadius: 12, padding: "11px 14px" }}>
                <span style={{ fontSize: 14 }}>🌅</span>
                <input
                  type="time"
                  value={form.openTime}
                  onChange={(e) => set("openTime")(e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: T.text1, fontFamily: "inherit" }}
                />
              </div>
              <span style={{ color: T.text3, fontSize: 18, fontWeight: 300 }}>→</span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.input, borderRadius: 12, padding: "11px 14px" }}>
                <span style={{ fontSize: 14 }}>🌙</span>
                <input
                  type="time"
                  value={form.closeTime}
                  onChange={(e) => set("closeTime")(e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: T.text1, fontFamily: "inherit" }}
                />
              </div>
            </div>
          </div>

          <Field label="Adresse complète" value={form.address} onChange={set("address")} placeholder="Ex: Rue 10..." multiline />

          <div style={{ height: 20 }} />
        </div>

        <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${T.separator}` }}>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: isValid && !saving ? `linear-gradient(135deg, ${T.red}, ${T.orange})` : "#E5E5E5",
              color: isValid && !saving ? "#fff" : T.text3,
              fontSize: 15, fontWeight: 800, cursor: isValid && !saving ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            {saving ? "Enregistrement…" : mode === "create" ? "Créer l'emplacement" : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//   DELETE CONFIRM MODAL
// ─────────────────────────────────────────────
function DeleteModal({
  visible,
  locationName,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  locationName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.card, borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, animation: "fadeIn 0.2s ease" }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text1, textAlign: "center", marginBottom: 8 }}>Supprimer l'emplacement ?</div>
        <div style={{ fontSize: 13, color: T.text2, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
          <strong>{locationName}</strong> sera définitivement supprimé.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.input, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: T.text1 }}
          >Annuler</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "#EF4444", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//   LOCATION CARD
// ─────────────────────────────────────────────
function LocationCard({
  loc,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  loc: Location;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const now = new Date();
  const toMins = (t: string) => { const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m; };
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMins >= toMins(loc.opening_time) && nowMins <= toMins(loc.closing_time);
  const displayAddress = cleanAddress(loc.address);

  return (
    <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 16 }}>
      <div style={{ height: 4, background: `linear-gradient(to right, ${T.red}, ${T.orange})` }} />

      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg, ${T.red}20, ${T.orange}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏪</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 3 }}>{loc.restaurant_name}</div>
            <div style={{ fontSize: 13, color: T.text2 }}>{loc.city} · {loc.neighborhood} · {loc.country}</div>
          </div>
          <button
            onClick={onToggleActive}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20,
              border: "none", cursor: "pointer", flexShrink: 0,
              background: loc.is_active ? T.successBg : T.errorBg,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: loc.is_active ? T.success : "#EF4444" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: loc.is_active ? T.success : "#EF4444" }}>
              {loc.is_active ? "Actif" : "Inactif"}
            </span>
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: isOpen ? "#F0FDF4" : "#FEF2F2", borderRadius: 8, padding: "5px 10px" }}>
            <span style={{ fontSize: 12 }}>{isOpen ? "🟢" : "🔴"}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? T.success : "#EF4444" }}>
              {isOpen ? "Ouvert" : "Fermé"} · {loc.opening_time.slice(0, 5)}–{loc.closing_time.slice(0, 5)}
            </span>
          </div>
          {displayAddress && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.input, borderRadius: 8, padding: "5px 10px", maxWidth: "100%", overflow: "hidden" }}>
              <span style={{ fontSize: 12 }}>📍</span>
              <span style={{ fontSize: 12, color: T.text2, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayAddress}>
                {displayAddress}
              </span>
            </div>
          )}
        </div>

        {/* Modes de paiement globaux — affichage info uniquement */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Paiements acceptés</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { label: "Orange Money", emoji: "🟠", color: "#FF6600" },
              { label: "Wave",         emoji: "🌊", color: "#1AA3FF" },
              { label: "Moov Money",   emoji: "💙", color: "#0070FF" },
              { label: "MTN Money",    emoji: "💛", color: "#D97706" },
              { label: "Airtel Money", emoji: "🔴", color: "#E4002B" },
            ].map((pm) => (
              <div key={pm.label} style={{ display: "flex", alignItems: "center", gap: 5, borderRadius: 8, padding: "5px 10px", background: pm.color + "12", border: `1px solid ${pm.color}30` }}>
                <span style={{ fontSize: 13 }}>{pm.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: pm.color }}>{pm.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.separator}`, paddingTop: 14 }}>
          <button
            onClick={onEdit}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 11, border: `1.5px solid ${T.border}`, background: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: T.text1 }}
          >✏️ Modifier</button>
          <button
            onClick={onDelete}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 11, border: "1.5px solid #FCA5A5", background: "#FEF2F2", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#EF4444" }}
          >🗑️ Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//   PAGE
// ─────────────────────────────────────────────
export default function LocationsPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [showDelete, setShowDelete] = useState(false);

  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const loadData = useCallback(async () => {
    const currentRestaurant = getCurrentRestaurant();
    if (!currentRestaurant) {
      router.push('/restaurant/login');
      return;
    }
    setRestaurant(currentRestaurant);
    setLoading(true);
    try {
      const { data: loc } = await supabase
        .from("restaurant_locations")
        .select("*")
        .eq("restaurant_uuid", currentRestaurant.id)
        .maybeSingle();

      setLocation(loc ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setFormMode("create"); setShowForm(true); };
  const openEdit = () => { setFormMode("edit"); setShowForm(true); };

  const handleDelete = async () => {
    if (!location) return;
    await supabase.from("restaurant_locations").delete().eq("id", location.id);
    setShowDelete(false);
    await loadData();
  };

  const toggleActive = async () => {
    if (!location) return;
    await supabase.from("restaurant_locations").update({ is_active: !location.is_active }).eq("id", location.id);
    await loadData();
  };

      const editInitialData: FormState | undefined = location
  ? {
      restaurantName: location.restaurant_name,
      country: location.country,
      city: location.city,
      neighborhood: location.neighborhood,
      address: cleanAddress(location.address),
      openTime: location.opening_time.slice(0, 5),
      closeTime: location.closing_time.slice(0, 5),
      latitude: location.latitude?.toString() ?? "",
      longitude: location.longitude?.toString() ?? "",
    }
  : undefined;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        * { box-sizing: border-box; }
        input[type=time]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, #C4000A, #E8161A 50%, #F97316)`, padding: "20px 20px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Mon Emplacement</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 1 }}>Gérer votre restaurant</div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 60, gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${T.red}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : location ? (
          <LocationCard
            loc={location}
            onEdit={openEdit}
            onDelete={() => setShowDelete(true)}
            onToggleActive={toggleActive}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 32px" }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: `${T.red}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, marginBottom: 20 }}>🏪</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text1, marginBottom: 10 }}>Aucun emplacement</div>
            <div style={{ fontSize: 14, color: T.text3, lineHeight: 1.6, marginBottom: 28 }}>
              Créez votre emplacement unique pour commencer.
            </div>
            <button
              onClick={openCreate}
              style={{ padding: "14px 28px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${T.red}, ${T.orange})`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Créer mon emplacement
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <LocationModal
        visible={showForm}
        mode={formMode}
        initialData={formMode === "edit" ? editInitialData : undefined}
        locationId={location?.id}
        onClose={() => setShowForm(false)}
        onSuccess={loadData}
      />

      <DeleteModal
        visible={showDelete}
        locationName={location?.restaurant_name ?? ""}
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  );
}