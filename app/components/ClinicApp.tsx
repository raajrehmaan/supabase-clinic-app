"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase-browser";

type Role = "admin" | "staff";
type User = { id: string; username: string; passwordHash: string; role: Role };
type Client = { id: string; fullName: string; phone: string; email: string; notes: string };
type Staff = { id: string; name: string; role: string; active: boolean };
type Treatment = { id: string; category: string; treatment: string; variant: string; duration: number; price: number };
type Appointment = {
  id: string;
  startsAt: string;
  duration: number;
  clientId: string;
  staffId: string;
  treatmentId: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  paidStatus: "unpaid" | "deposit_paid" | "paid" | "refunded";
  paymentMethod: "cash" | "card" | "bank_transfer" | "voucher";
  price: number;
  notes: string;
};
type ClinicState = {
  users: User[];
  clients: Client[];
  staff: Staff[];
  treatments: Treatment[];
  appointments: Appointment[];
};

type AppointmentForm = Omit<Appointment, "id">;

const SESSION_KEY = "lte.supabase.clinic.session.v1";
const ADMIN_CODE = "6871";
const DEFAULT_ADMIN_USERNAME = "boss";
const DEFAULT_ADMIN_PASSWORD = "6871";

const uid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};
const cleanUsername = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
const today = () => new Date().toISOString().slice(0, 10);

const blankState = (): ClinicState => ({
  users: [],
  clients: [],
  staff: [],
  treatments: [],
  appointments: []
});

const starterTreatmentRows: Array<[string, string, string, number, number]> = [
  ["FACIALS", "HydraFacial", "Bronze", 45, 80],
  ["FACIALS", "HydraFacial", "Silver", 45, 90],
  ["FACIALS", "HydraFacial", "Gold", 60, 150],
  ["FACIALS", "HydraFacial", "Platinum", 60, 220],
  ["FACIALS", "Laser Carbon Peel", "Face", 45, 220],
  ["FACIALS", "Laser Carbon Peel", "Back", 45, 220],
  ["FACIALS", "Chemical Peel", "Mild", 45, 75],
  ["FACIALS", "Chemical Peel", "Medium", 45, 100],
  ["FACIALS", "Chemical Peel", "Deep", 45, 140],
  ["FACIALS", "Facial Treatments", "Microdermabrasion", 30, 35],
  ["FACIALS", "Facial Treatments", "Radiofrequency Skin Tightening", 30, 30],
  ["FACIALS", "Facial Treatments", "Microneedling", 60, 150],
  ["LASER HAIR REMOVAL", "Upper Lip", "Standard", 15, 29],
  ["LASER HAIR REMOVAL", "Chin", "Standard", 15, 30],
  ["LASER HAIR REMOVAL", "Chest", "Standard", 30, 30],
  ["LASER HAIR REMOVAL", "Stomach", "Standard", 30, 35],
  ["LASER HAIR REMOVAL", "Half Arm", "Standard", 45, 75],
  ["LASER HAIR REMOVAL", "Half Leg", "Standard", 45, 80],
  ["LASER HAIR REMOVAL", "Underarm", "Standard", 30, 99],
  ["LASER HAIR REMOVAL", "Bikini", "Standard", 45, 120],
  ["LASER HAIR REMOVAL", "Full Face", "Standard", 60, 120],
  ["LASER HAIR REMOVAL", "Full Arm", "Standard", 60, 150],
  ["LASER HAIR REMOVAL", "Full Leg", "Standard", 75, 160],
  ["LASER HAIR REMOVAL", "Full Body", "Standard", 120, 299],
  ["BODY CONTOURING & FAT REDUCTION", "Tattoo Removal", "Very Small", 15, 35],
  ["BODY CONTOURING & FAT REDUCTION", "Tattoo Removal", "Small", 20, 40],
  ["BODY CONTOURING & FAT REDUCTION", "Tattoo Removal", "Medium", 30, 50],
  ["BODY CONTOURING & FAT REDUCTION", "Tattoo Removal", "Large", 45, 100],
  ["BODY CONTOURING & FAT REDUCTION", "Tattoo Removal", "Very Large", 60, 150],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "Hamstring", 30, 50],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "Front Thigh", 30, 50],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "Back Thigh", 30, 50],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "Love Handles", 45, 70],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "Glutes", 45, 75],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "Shoulder Arm", 45, 80],
  ["BODY CONTOURING & FAT REDUCTION", "Body Contouring / Fat Reduction", "ABS", 60, 129],
  ["AQUALYX FAT DISSOLVING", "Aqualyx Fat Dissolving", "Double Chin", 45, 250],
  ["AQUALYX FAT DISSOLVING", "Aqualyx Fat Dissolving", "Arm", 45, 150],
  ["AQUALYX FAT DISSOLVING", "Aqualyx Fat Dissolving", "Love Handles", 45, 200],
  ["AQUALYX FAT DISSOLVING", "Aqualyx Fat Dissolving", "Belly", 60, 300],
  ["AQUALYX FAT DISSOLVING", "Aqualyx Fat Dissolving", "Thighs", 60, 250],
  ["MASSAGE & THERAPY", "Massage", "30 Minutes", 30, 50],
  ["MASSAGE & THERAPY", "Aroma", "30 Minutes", 30, 40],
  ["MASSAGE & THERAPY", "Hot Stone", "30 Minutes", 30, 60],
  ["MASSAGE & THERAPY", "Relaxing", "30 Minutes", 30, 70],
  ["MASSAGE & THERAPY", "Couple", "30 Minutes", 30, 80],
  ["MASSAGE & THERAPY", "Massage", "60 Minutes", 60, 70],
  ["MASSAGE & THERAPY", "Aroma", "60 Minutes", 60, 60],
  ["MASSAGE & THERAPY", "Hot Stone", "60 Minutes", 60, 80],
  ["MASSAGE & THERAPY", "Relaxing", "60 Minutes", 60, 100],
  ["MASSAGE & THERAPY", "Couple", "60 Minutes", 60, 110],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "3 Areas", 30, 260],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "Nefertiti Neck Lift", 30, 260],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "Jaw Relaxing/Slimming", 30, 260],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "Trapezius", 30, 320],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "Additional Areas", 15, 60],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "Anti-Sweating Hands/Underarms", 45, 360],
  ["ADVANCED AESTHETICS", "Anti-Wrinkle Treatment", "Migraine Prevention", 45, 480],
  ["ADVANCED AESTHETICS", "Dermal Fillers", "Lip Augmentation", 45, 190],
  ["ADVANCED AESTHETICS", "Dermal Fillers", "Temples", 45, 270],
  ["ADVANCED AESTHETICS", "Dermal Fillers", "8 Point Face Lift", 90, 660],
  ["ADVANCED AESTHETICS", "Dermal Fillers", "Tear Trough Eye Area", 45, 260],
  ["ADVANCED AESTHETICS", "Dermal Fillers", "Cheeks Jaw Line Chin", 60, 240],
  ["ADVANCED AESTHETICS", "Dermal Fillers", "Rhinoplasty", 45, 270],
  ["ADVANCED AESTHETICS", "Vitamin Injections", "Vitamin B12", 30, 40],
  ["ADVANCED AESTHETICS", "Vitamin Injections", "Vitamin D", 30, 60],
  ["ADVANCED AESTHETICS", "Vitamin Injections", "Vitamin C", 30, 60],
  ["ADVANCED AESTHETICS", "Vitamin Injections", "Glutathione", 30, 150],
  ["ADVANCED AESTHETICS", "Vitamin Injections", "Biotin", 30, 60],
  ["ADVANCED AESTHETICS", "IV Drips", "Total Hydration", 60, 180],
  ["ADVANCED AESTHETICS", "IV Drips", "Detox", 60, 180],
  ["ADVANCED AESTHETICS", "IV Drips", "Wellness Plus", 60, 180],
  ["ADVANCED AESTHETICS", "IV Drips", "Advanced Anti-Ageing", 60, 220],
  ["ADVANCED AESTHETICS", "IV Drips", "Skin Lightening & Brightening", 60, 220],
  ["ADVANCED AESTHETICS", "IV Drips", "Methylene Blue", 60, 320],
  ["ADVANCED AESTHETICS", "IV Drips", "NAD+", 60, 390],
  ["ADVANCED AESTHETICS", "Skin Boosters", "Profhilo", 30, 260],
  ["ADVANCED AESTHETICS", "Skin Boosters", "Sunekos", 30, 260],
  ["ADVANCED AESTHETICS", "Skin Boosters", "Jalupro", 30, 240],
  ["ADVANCED AESTHETICS", "Skin Boosters", "NCTF", 30, 180],
  ["ADVANCED AESTHETICS", "Biostimulators", "Radiesse", 30, 400],
  ["ADVANCED AESTHETICS", "Biostimulators", "Aculptra", 30, 380]
];

const starterTreatments: Omit<Treatment, "id">[] = starterTreatmentRows.map(([category, treatment, variant, duration, price]) => ({
  category: String(category),
  treatment: String(treatment),
  variant: String(variant),
  duration: Number(duration),
  price: Number(price)
}));

const fromUserRow = (row: any): User => ({ id: row.id, username: row.username, passwordHash: row.password_hash, role: row.role });
const fromClientRow = (row: any): Client => ({ id: row.id, fullName: row.full_name, phone: row.phone, email: row.email || "", notes: row.notes || "" });
const fromStaffRow = (row: any): Staff => ({ id: row.id, name: row.name, role: row.role, active: Boolean(row.active) });
const fromTreatmentRow = (row: any): Treatment => ({ id: row.id, category: row.category, treatment: row.treatment, variant: row.variant, duration: row.duration, price: Number(row.price || 0) });
const fromAppointmentRow = (row: any): Appointment => ({
  id: row.id,
  startsAt: row.starts_at,
  duration: row.duration,
  clientId: row.client_id || "",
  staffId: row.staff_id || "",
  treatmentId: row.treatment_id || "",
  status: row.status,
  paidStatus: row.paid_status,
  paymentMethod: row.payment_method,
  price: Number(row.price || 0),
  notes: row.notes || ""
});

async function passwordHash(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function ClinicApp() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<ClinicState>(blankState);
  const [configError, setConfigError] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "create">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [adminCode, setAdminCode] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("appointments");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ fullName: "", phone: "", email: "", notes: "" });
  const [staffForm, setStaffForm] = useState({ name: "", role: "Therapist" });
  const [treatmentEditId, setTreatmentEditId] = useState<string | null>(null);
  const [treatmentForm, setTreatmentForm] = useState({ category: "", treatment: "", variant: "Standard", duration: 30, price: 0 });
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    startsAt: new Date().toISOString().slice(0, 16),
    duration: 30,
    clientId: "",
    staffId: "",
    treatmentId: "",
    status: "scheduled",
    paidStatus: "unpaid",
    paymentMethod: "card",
    price: 0,
    notes: ""
  });

  function getSupabaseClientOrNull() {
    try {
      setConfigError("");
      return getSupabaseClient();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Supabase is not configured correctly.";
      setConfigError(message);
      setNotice(message);
      return null;
    }
  }

  async function loadData() {
    try {
      const supabase = getSupabaseClientOrNull();
      if (!supabase) return;
      const [users, clients, staff, treatments, appointments] = await Promise.all([
        supabase.from("clinic_users").select("*").order("created_at", { ascending: true }),
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("staff").select("*").order("created_at", { ascending: false }),
        supabase.from("treatments").select("*").order("category", { ascending: true }).order("treatment", { ascending: true }),
        supabase.from("appointments").select("*").order("starts_at", { ascending: true })
      ]);

      const error = users.error || clients.error || staff.error || treatments.error || appointments.error;
      if (error) throw error;

      let mappedUsers = (users.data || []).map(fromUserRow);
      if (mappedUsers.length === 0) {
        mappedUsers = await createDefaultAdmin();
      }

      const mappedTreatments = (treatments.data || []).map(fromTreatmentRow);
      setData({
        users: mappedUsers,
        clients: (clients.data || []).map(fromClientRow),
        staff: (staff.data || []).map(fromStaffRow),
        treatments: mappedTreatments,
        appointments: (appointments.data || []).map(fromAppointmentRow)
      });

      if (mappedTreatments.length === 0) {
        await seedTreatments();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load Supabase data.");
    } finally {
      setReady(true);
    }
  }

  async function seedTreatments() {
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { error } = await supabase.from("treatments").insert(starterTreatments.map((item) => ({ id: uid(), ...item })));
    if (error) throw error;
    await loadData();
  }

  async function createDefaultAdmin() {
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return [];
    const password_hash = await passwordHash(DEFAULT_ADMIN_PASSWORD);
    const { data: created, error } = await supabase
      .from("clinic_users")
      .insert({ username: DEFAULT_ADMIN_USERNAME, password_hash, role: "admin" })
      .select();

    if (error) throw error;
    return (created || []).map(fromUserRow);
  }

  async function ensureDefaultAdmin() {
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return null;
    const password_hash = await passwordHash(DEFAULT_ADMIN_PASSWORD);
    const { data: existing, error: readError } = await supabase
      .from("clinic_users")
      .select("*")
      .eq("username", DEFAULT_ADMIN_USERNAME)
      .maybeSingle();

    if (readError) {
      setNotice(readError.message);
      return null;
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("clinic_users")
        .update({ password_hash, role: "admin" })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        setNotice(updateError.message);
        return null;
      }

      return fromUserRow(updated);
    }

    const { data: created, error: createError } = await supabase
      .from("clinic_users")
      .insert({ username: DEFAULT_ADMIN_USERNAME, password_hash, role: "admin" })
      .select()
      .single();

    if (createError) {
      setNotice(createError.message);
      return null;
    }

    return fromUserRow(created);
  }

  useEffect(() => {
    const savedSession = window.localStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(SESSION_KEY);
    setSessionUserId(savedSession);
    loadData();

    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const channel = supabase
      .channel("clinic-live-data")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const treatment = data.treatments.find((item) => item.id === appointmentForm.treatmentId);
    if (!treatment) return;
    setAppointmentForm((current) => ({ ...current, duration: treatment.duration, price: treatment.price }));
  }, [appointmentForm.treatmentId, data.treatments]);

  const currentUser = data.users.find((user) => user.id === sessionUserId) || null;
  const isAdmin = currentUser?.role === "admin";
  const visibleTabs = isAdmin ? ["appointments", "clients", "staff", "treatments", "finance", "settings"] : ["appointments", "clients"];
  const stats = useMemo(() => ({
    todayAppointments: data.appointments.filter((appt) => appt.startsAt.slice(0, 10) === today() && appt.status === "scheduled").length,
    clients: data.clients.length,
    activeStaff: data.staff.filter((member) => member.active).length,
    pendingPayments: data.appointments.filter((appt) => ["unpaid", "deposit_paid"].includes(appt.paidStatus) && appt.status !== "cancelled").length,
    paidRevenue: data.appointments.filter((appt) => appt.paidStatus === "paid").reduce((sum, appt) => sum + Number(appt.price || 0), 0)
  }), [data]);

  function saveSession(userId: string, shouldRemember: boolean) {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    const storage = shouldRemember ? window.localStorage : window.sessionStorage;
    storage.setItem(SESSION_KEY, userId);
    setSessionUserId(userId);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const clean = cleanUsername(username);
    if (clean === DEFAULT_ADMIN_USERNAME && password === DEFAULT_ADMIN_PASSWORD) {
      const admin = await ensureDefaultAdmin();
      if (!admin) return;
      setData((current) => ({
        ...current,
        users: [...current.users.filter((item) => item.id !== admin.id && item.username !== admin.username), admin]
      }));
      saveSession(admin.id, remember);
      setNotice("");
      return;
    }

    const hash = await passwordHash(password);
    const user = data.users.find((item) => item.username === clean && item.passwordHash === hash);
    if (!user) return setNotice("Invalid username or password.");
    saveSession(user.id, remember);
    setNotice("");
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    const clean = cleanUsername(username);
    if (!clean || password.length < 6) return setNotice("Username and a 6+ character password are required.");
    if (data.users.some((user) => user.username === clean)) return setNotice("Username already exists.");
    const role: Role = adminCode === ADMIN_CODE ? "admin" : "staff";
    const password_hash = await passwordHash(password);
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { data: created, error } = await supabase
      .from("clinic_users")
      .insert({ username: clean, password_hash, role })
      .select()
      .single();

    if (error) return setNotice(error.message);
    const user = fromUserRow(created);
    setData((current) => ({ ...current, users: [...current.users, user] }));
    saveSession(user.id, remember);
    setNotice(role === "admin" ? "Admin account created." : "Staff account created.");
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    setSessionUserId(null);
    setMenuOpen(false);
  }

  async function addClient(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin) return setNotice("Staff can view clients only.");
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { error } = await supabase.from("clients").insert({
      full_name: clientForm.fullName,
      phone: clientForm.phone,
      email: clientForm.email,
      notes: clientForm.notes
    });
    if (error) return setNotice(error.message);
    setClientForm({ fullName: "", phone: "", email: "", notes: "" });
    setNotice("Client saved.");
    await loadData();
  }

  async function addStaff(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin) return setNotice("Admin only.");
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { error } = await supabase.from("staff").insert({ name: staffForm.name, role: staffForm.role, active: true });
    if (error) return setNotice(error.message);
    setStaffForm({ name: "", role: "Therapist" });
    setNotice("Staff saved.");
    await loadData();
  }

  async function deleteStaff(id: string) {
    if (!isAdmin) return setNotice("Admin only.");
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    if (data.appointments.some((appt) => appt.staffId === id)) {
      const { error } = await supabase.from("staff").update({ active: false }).eq("id", id);
      if (error) return setNotice(error.message);
      setNotice("Staff member has appointments, so they were marked inactive.");
      return loadData();
    }
    if (!confirm("Delete this staff member?")) return;
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) return setNotice(error.message);
    setNotice("Staff deleted.");
    await loadData();
  }

  async function saveTreatment(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin) return setNotice("Admin only.");
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const payload = {
      category: treatmentForm.category,
      treatment: treatmentForm.treatment,
      variant: treatmentForm.variant || "Standard",
      duration: Number(treatmentForm.duration),
      price: Number(treatmentForm.price)
    };
    const response = treatmentEditId
      ? await supabase.from("treatments").update(payload).eq("id", treatmentEditId)
      : await supabase.from("treatments").insert(payload);
    if (response.error) return setNotice(response.error.message);
    setTreatmentEditId(null);
    setTreatmentForm({ category: "", treatment: "", variant: "Standard", duration: 30, price: 0 });
    setNotice("Treatment saved.");
    await loadData();
  }

  function editTreatment(treatment: Treatment) {
    setTreatmentEditId(treatment.id);
    setTreatmentForm({ category: treatment.category, treatment: treatment.treatment, variant: treatment.variant, duration: treatment.duration, price: treatment.price });
  }

  async function deleteTreatment(id: string) {
    if (!isAdmin) return setNotice("Admin only.");
    if (data.appointments.some((appt) => appt.treatmentId === id)) return setNotice("Cannot delete a treatment used in appointments.");
    if (!confirm("Delete this treatment?")) return;
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { error } = await supabase.from("treatments").delete().eq("id", id);
    if (error) return setNotice(error.message);
    setNotice("Treatment deleted.");
    await loadData();
  }

  async function addAppointment(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser) return;
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { error } = await supabase.from("appointments").insert({
      starts_at: appointmentForm.startsAt,
      duration: appointmentForm.duration,
      client_id: appointmentForm.clientId || null,
      staff_id: appointmentForm.staffId || null,
      treatment_id: appointmentForm.treatmentId || null,
      status: appointmentForm.status,
      paid_status: isAdmin ? appointmentForm.paidStatus : "unpaid",
      payment_method: isAdmin ? appointmentForm.paymentMethod : "card",
      price: isAdmin ? appointmentForm.price : 0,
      notes: appointmentForm.notes
    });
    if (error) return setNotice(error.message);
    setNotice("Appointment saved.");
    await loadData();
  }

  async function updateAppointment(id: string, patch: Partial<Appointment>) {
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const payload: Record<string, unknown> = {};
    if (patch.status) payload.status = patch.status;
    if (patch.paidStatus && isAdmin) payload.paid_status = patch.paidStatus;
    const { error } = await supabase.from("appointments").update(payload).eq("id", id);
    if (error) return setNotice(error.message);
    await loadData();
  }

  async function deleteAppointment(id: string) {
    if (!isAdmin) return setNotice("Only Admin can delete appointments.");
    if (!confirm("Delete this appointment?")) return;
    const supabase = getSupabaseClientOrNull();
    if (!supabase) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return setNotice(error.message);
    setNotice("Appointment deleted.");
    await loadData();
  }

  if (!ready) return <main className="login">Loading clinic data...</main>;

  if (!currentUser) {
    return (
      <main className="login">
        <form className="card" onSubmit={authMode === "login" ? login : createAccount}>
          <div className="brand">
            <h1>Laser Treat Esthetica</h1>
            <p>Shared Supabase clinic management system</p>
          </div>
          {notice ? <p className="notice">{notice}</p> : null}
          <div className="tabs compact">
            <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
            <button type="button" className={authMode === "create" ? "active" : ""} onClick={() => setAuthMode("create")}>Create User</button>
          </div>
          <div className="form">
            <label className="full">Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" required /></label>
            <label className="full">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
            <label className="check full"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember login</label>
            {authMode === "create" ? <label className="full">Admin creation code<input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} type="password" placeholder="Private code only" /></label> : null}
            <button className="gold full">{authMode === "login" ? "Login" : "Create Account"}</button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="app-frame">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="side-brand">
          <strong>Laser Treat</strong>
          <span>{currentUser.role === "admin" ? "Admin" : "Staff"}</span>
        </div>
        <nav>
          {visibleTabs.map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setMenuOpen(false); }}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>
      </aside>
      {menuOpen ? <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}
      <section className="shell">
        <header className="top">
          <button className="hamburger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><span></span><span></span><span></span></button>
          <div className="brand">
            <h1>Clinic Management</h1>
            <p>Signed in as {currentUser.username} ({currentUser.role})</p>
          </div>
          <button className="ghost" onClick={logout}>Logout</button>
        </header>
        {notice ? <p className="notice">{notice}</p> : null}
        <Dashboard stats={stats} isAdmin={isAdmin} />
        {tab === "appointments" ? <Appointments data={data} isAdmin={isAdmin} form={appointmentForm} setForm={setAppointmentForm} add={addAppointment} update={updateAppointment} remove={deleteAppointment} /> : null}
        {tab === "clients" ? <Clients clients={data.clients} isAdmin={isAdmin} form={clientForm} setForm={setClientForm} add={addClient} /> : null}
        {tab === "staff" && isAdmin ? <StaffPanel staff={data.staff} form={staffForm} setForm={setStaffForm} add={addStaff} remove={deleteStaff} /> : null}
        {tab === "treatments" && isAdmin ? <Treatments treatments={data.treatments} form={treatmentForm} setForm={setTreatmentForm} editId={treatmentEditId} save={saveTreatment} edit={editTreatment} remove={deleteTreatment} /> : null}
        {tab === "finance" && isAdmin ? <Finance stats={stats} /> : null}
        {tab === "settings" && isAdmin ? <section className="card"><h2>Settings</h2><p className="meta">Supabase sync is active. Data is shared live between staff devices.</p></section> : null}
      </section>
    </main>
  );
}

function Dashboard({ stats, isAdmin }: { stats: { todayAppointments: number; clients: number; activeStaff: number; pendingPayments: number; paidRevenue: number }; isAdmin: boolean }) {
  return <section className="grid stats"><Stat label="Today's Appointments" value={stats.todayAppointments} /><Stat label="Clients" value={stats.clients} /><Stat label="Active Staff" value={stats.activeStaff} />{isAdmin ? <Stat label="Pending Payments" value={stats.pendingPayments} /> : null}</section>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="card"><div className="stat-label">{label}</div><div className="stat-value">{label.includes("Revenue") ? `£${value.toFixed(2)}` : value}</div></div>;
}

function Appointments({ data, isAdmin, form, setForm, add, update, remove }: { data: ClinicState; isAdmin: boolean; form: AppointmentForm; setForm: (form: AppointmentForm) => void; add: (event: React.FormEvent) => void; update: (id: string, patch: Partial<Appointment>) => void; remove: (id: string) => void }) {
  return <section className="card"><h2>Appointments</h2><form className="form" onSubmit={add}>
    <label>Date & Time<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required /></label>
    <label>Client<select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required><option value="">Select client</option>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></label>
    <label>Staff<select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}><option value="">Unassigned</option>{data.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Treatment<select value={form.treatmentId} onChange={(e) => setForm({ ...form, treatmentId: e.target.value })}><option value="">Select treatment</option>{data.treatments.map((t) => <option key={t.id} value={t.id}>{t.category} / {t.treatment} / {t.variant}</option>)}</select></label>
    <label>Duration<input type="number" min="5" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></label>
    {isAdmin ? <label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label> : null}
    <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Appointment["status"] })}><option>scheduled</option><option>completed</option><option>cancelled</option><option>no_show</option></select></label>
    {isAdmin ? <label>Payment<select value={form.paidStatus} onChange={(e) => setForm({ ...form, paidStatus: e.target.value as Appointment["paidStatus"] })}><option>unpaid</option><option>deposit_paid</option><option>paid</option><option>refunded</option></select></label> : null}
    <label className="full">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
    <button className="gold full">Add Appointment</button>
  </form><div className="list">{data.appointments.map((a) => <AppointmentRow key={a.id} appointment={a} data={data} isAdmin={isAdmin} update={update} remove={remove} />)}</div></section>;
}

function AppointmentRow({ appointment, data, isAdmin, update, remove }: { appointment: Appointment; data: ClinicState; isAdmin: boolean; update: (id: string, patch: Partial<Appointment>) => void; remove: (id: string) => void }) {
  const client = data.clients.find((item) => item.id === appointment.clientId);
  const staff = data.staff.find((item) => item.id === appointment.staffId);
  const treatment = data.treatments.find((item) => item.id === appointment.treatmentId);
  return <div className="row"><div><strong>{new Date(appointment.startsAt).toLocaleString()} - {client?.fullName || "No client"}</strong><div className="meta">{treatment ? `${treatment.treatment} / ${treatment.variant}` : "No treatment"} · {staff?.name || "Unassigned"}{isAdmin ? ` · £${appointment.price.toFixed(2)}` : ""}</div></div><div className="actions"><select value={appointment.status} onChange={(e) => update(appointment.id, { status: e.target.value as Appointment["status"] })}><option>scheduled</option><option>completed</option><option>cancelled</option><option>no_show</option></select>{isAdmin ? <button className="danger" onClick={() => remove(appointment.id)}>Delete</button> : null}</div></div>;
}

function Clients({ clients, isAdmin, form, setForm, add }: { clients: Client[]; isAdmin: boolean; form: Omit<Client, "id">; setForm: (form: Omit<Client, "id">) => void; add: (event: React.FormEvent) => void }) {
  return <section className="card"><h2>Clients</h2>{isAdmin ? <form className="form" onSubmit={add}><label>Full Name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label><label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="full">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><button className="gold full">Add Client</button></form> : <p className="notice">Staff can view clients only.</p>}<SimpleList items={clients.map((c) => ({ title: c.fullName, meta: `${c.phone}${c.email ? ` · ${c.email}` : ""}` }))} /></section>;
}

function StaffPanel({ staff, form, setForm, add, remove }: { staff: Staff[]; form: Omit<Staff, "id" | "active">; setForm: (form: Omit<Staff, "id" | "active">) => void; add: (event: React.FormEvent) => void; remove: (id: string) => void }) {
  return <section className="card"><h2>Staff</h2><form className="form" onSubmit={add}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Role<input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label><button className="gold full">Add Staff</button></form><div className="list">{staff.map((s) => <div className="row" key={s.id}><div><strong>{s.name}</strong><div className="meta">{s.role} · {s.active ? "Active" : "Inactive"}</div></div><button className="danger" onClick={() => remove(s.id)}>Delete</button></div>)}</div></section>;
}

function Treatments({ treatments, form, setForm, editId, save, edit, remove }: { treatments: Treatment[]; form: Omit<Treatment, "id">; setForm: (form: Omit<Treatment, "id">) => void; editId: string | null; save: (event: React.FormEvent) => void; edit: (t: Treatment) => void; remove: (id: string) => void }) {
  return <section className="card"><h2>Treatments</h2><form className="form" onSubmit={save}><label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></label><label>Treatment<input value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} required /></label><label>Variant<input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} /></label><label>Duration<input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></label><label>Price<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label><button className="gold full">{editId ? "Save Treatment" : "Add Treatment"}</button></form><div className="list">{treatments.map((t) => <div className="row" key={t.id}><div><strong>{t.category} · {t.treatment}</strong><div className="meta">{t.variant} · {t.duration} min · £{t.price.toFixed(2)}</div></div><div className="actions"><button className="ghost" onClick={() => edit(t)}>Edit</button><button className="danger" onClick={() => remove(t.id)}>Delete</button></div></div>)}</div></section>;
}

function Finance({ stats }: { stats: { paidRevenue: number; pendingPayments: number } }) {
  return <section className="card"><h2>Finance Reports</h2><div className="grid"><Stat label="Paid Revenue" value={stats.paidRevenue} /><Stat label="Pending Payments" value={stats.pendingPayments} /></div></section>;
}

function SimpleList({ items }: { items: { title: string; meta: string }[] }) {
  return <div className="list">{items.length ? items.map((item, index) => <div className="row" key={`${item.title}-${index}`}><div><strong>{item.title}</strong><div className="meta">{item.meta}</div></div></div>) : <div className="notice">Nothing added yet.</div>}</div>;
}
