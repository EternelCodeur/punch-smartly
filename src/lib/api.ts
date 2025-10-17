// API utilitaires pour le frontend
// Centralise les appels vers le backend (via proxy Vite sur /api)

export type Employe = {
  id: number;
  entreprise_id?: number | null;
  first_name: string;
  last_name: string;
  position?: string | null;
  // Daily attendance status (backend-maintained)
  attendance_date?: string | null; // YYYY-MM-DD of the status
  arrival_signed?: boolean;
  departure_signed?: boolean;
  entreprise?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

// Tenants
export type Tenant = {
  id: number;
  name: string;
  contact?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreatedTenantUser = {
  id: number;
  nom: string;
  role: string;
  tenant_id: number | null;
  enterprise_id: number | null;
};

export type CreateTenantResponse = {
  tenant: Tenant;
  user: CreatedTenantUser;
  plain_password: string;
};

export async function listTenants(params?: { search?: string; per_page?: number; user_role?: string }): Promise<Tenant[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (typeof params?.per_page === 'number') qs.set('per_page', String(params.per_page)); else qs.set('per_page', '0');
  if (params?.user_role) qs.set('user_role', params.user_role);
  const json = await http<any>(`/api/tenants?${qs.toString()}`);
  return Array.isArray(json) ? json : (json?.data ?? []);
}

export async function createTenant(payload: { name: string; contact?: string }): Promise<CreateTenantResponse> {
  return http<CreateTenantResponse>(`/api/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateTenant(id: number, payload: { name?: string; contact?: string }): Promise<Tenant> {
  return http<Tenant>(`/api/tenants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTenant(id: number): Promise<void> {
  const res = await fetch(withApiBase(`/api/tenants/${id}`), { method: 'DELETE', credentials: 'include' });
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    try { const j = await res.json(); throw new Error(j?.message || res.statusText || 'Erreur API'); } catch { throw new Error(res.statusText || 'Erreur API'); }
  }
}

export type Entreprise = {
  id: number;
  name: string;
};

export type AttendanceSummary = {
  perDay: Array<{
    date: string;
    in?: string | null;
    out?: string | null;
    inSignature?: string | null;
    outSignature?: string | null;
    onField?: boolean | null;
    mins: number;
    leave?: boolean | null;
    leaveStatus?: string | null;
  }>;
  monthMins: number;
};

export type Attendance = {
  id: number;
  employe_id: number;
  date: string; // YYYY-MM-DD
  check_in_at?: string | null;
  check_in_signature?: string | null;
  check_out_at?: string | null;
  check_out_signature?: string | null;
};

// Base URL configurable via Vite (vite.config.ts -> env VITE_API_BASE)
// Example: VITE_API_BASE=https://api.example.com
export const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE || '';

function withApiBase(input: RequestInfo): RequestInfo {
  if (typeof input === 'string' && input.startsWith('/api')) {
    return `${API_BASE}${input}`;
  }
  return input;
}

export function apiUrl(path: string): string {
  return path.startsWith('/api') ? `${API_BASE}${path}` : path;
}

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  // Cookie-based auth; include credentials for cross-origin if needed
  const mergedInit: RequestInit = { credentials: 'include', ...init, headers: { ...(init?.headers || {}) } };
  const res = await fetch(withApiBase(input), mergedInit);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = (j && (j.message || j.error || JSON.stringify(j))) || msg;
    } catch {}
    throw new Error(msg || 'Erreur API');
  }
  return res.json();
}

// Employés
export async function listEmployes(): Promise<Employe[]> {
  const json = await http<any>(`/api/employes?per_page=0`);
  return Array.isArray(json) ? json : (json?.data ?? []);
}

export async function getEmploye(id: number): Promise<Employe> {
  return http<Employe>(`/api/employes/${id}`);
}

export async function createEmploye(payload: Partial<Employe>): Promise<Employe> {
  return http<Employe>(`/api/employes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateEmploye(id: number, payload: Partial<Employe>): Promise<Employe> {
  return http<Employe>(`/api/employes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteEmploye(id: number): Promise<void> {
  const res = await fetch(withApiBase(`/api/employes/${id}`), { method: 'DELETE', credentials: 'include' });
  if (res.status === 404) {
    // Treat missing resource as already deleted (idempotent delete)
    return;
  }
  if (!res.ok) {
    try {
      const j = await res.json();
      throw new Error(j?.message || res.statusText || 'Erreur API');
    } catch {
      throw new Error(res.statusText || 'Erreur API');
    }
  }
}

// Entreprises
export async function listEntreprises(): Promise<Entreprise[]> {
  const json = await http<any>(`/api/entreprises?per_page=0`);
  return Array.isArray(json) ? json : (json?.data ?? []);
}

// Daily stats (computed server-side in EmployeController)
export type TodayCounts = {
  date: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  leftToday: number;
};

export async function getTodayCounts(entrepriseId?: number, normalizeToday: boolean = true): Promise<TodayCounts> {
  const qs = new URLSearchParams({ today_counts: 'true' });
  if (entrepriseId) qs.set('entreprise_id', String(entrepriseId));
  if (normalizeToday) qs.set('normalize_today', 'true');
  const json = await http<TodayCounts>(`/api/employes?${qs.toString()}`);
  return json;
}

// Pointages
export async function attendanceCheckIn(employeId: number, signature?: string): Promise<any> {
  return http(`/api/attendances/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employe_id: employeId, signature }),
  });
}

export async function attendanceCheckOut(employeId: number, signature?: string): Promise<any> {
  return http(`/api/attendances/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employe_id: employeId, signature }),
  });
}

// Admin-only: marquer une arrivée "sur le terrain" pour aujourd'hui (ou une date spécifiée)
export async function adminCheckInOnField(employeId: number, date?: string): Promise<any> {
  return http(`/api/attendances/admin/check-in-on-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employe_id: employeId, ...(date ? { date } : {}) }),
  });
}

export async function getAttendanceSummary(employeId: number, monthStr: string): Promise<AttendanceSummary> {
  const qs = new URLSearchParams();
  if (monthStr) qs.set('month', monthStr);
  const url = qs.toString() ? `/api/attendances/summary/${employeId}?${qs.toString()}` : `/api/attendances/summary/${employeId}`;
  return http<AttendanceSummary>(url);
}

// Liste des pointages (avec filtres optionnels)
export async function listAttendances(params?: {
  employe_id?: number;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  month?: string; // YYYY-MM
  per_page?: number; // 0 pour tout
}): Promise<Attendance[]> {
  const qs = new URLSearchParams();
  if (params?.employe_id) qs.set('employe_id', String(params.employe_id));
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.month) qs.set('month', params.month);
  if (typeof params?.per_page === 'number') qs.set('per_page', String(params.per_page)); else qs.set('per_page', '0');
  const json = await http<any>(`/api/attendances?${qs.toString()}`);
  // L'API peut renvoyer un tableau direct ou un objet paginé
  return Array.isArray(json) ? json : (json?.data ?? []);
}

// Sorties temporaires (CRUD)
export type TemporaryDeparture = {
  id: number;
  employe_id: number;
  date: string; // YYYY-MM-DD
  departure_time: string; // HH:MM
  reason?: string | null;
  return_time?: string | null;
  return_signature?: string | null;
  return_signature_file_url?: string | null;
  created_at?: string;
  updated_at?: string;
  // Embedded relation when returned by API (index/show)
  employe?: Employe | null;
};

export async function listTemporaryDepartures(month: string, employeId?: number, entrepriseId?: number): Promise<TemporaryDeparture[]> {
  const params = new URLSearchParams({ month });
  if (employeId) params.set('employe_id', String(employeId));
  if (entrepriseId) params.set('entreprise_id', String(entrepriseId));
  const json = await http<any>(`/api/temporary-departures?${params.toString()}`);
  return Array.isArray(json) ? json : (json?.data ?? []);
}

export async function createTemporaryDeparture(employeId: number, reason?: string): Promise<TemporaryDeparture> {
  return http<TemporaryDeparture>(`/api/temporary-departures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employe_id: employeId, reason }),
  });
}

export async function markTemporaryDepartureReturn(id: number, signature: string): Promise<TemporaryDeparture> {
  return http<TemporaryDeparture>(`/api/temporary-departures/${id}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signature }),
  });
}

export async function updateTemporaryDeparture(id: number, payload: Partial<Pick<TemporaryDeparture, 'reason' | 'date' | 'departure_time'>>): Promise<TemporaryDeparture> {
  return http<TemporaryDeparture>(`/api/temporary-departures/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTemporaryDeparture(id: number): Promise<void> {
  const res = await fetch(withApiBase(`/api/temporary-departures/${id}`), { method: 'DELETE', credentials: 'include' });
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    try {
      const j = await res.json();
      throw new Error(j?.message || res.statusText || 'Erreur API');
    } catch {
      throw new Error(res.statusText || 'Erreur API');
    }
  }
}

// Absences (Congés)
export type Absence = {
  id: number;
  employe_id: number;
  date: string; // YYYY-MM-DD
  status?: string | null; // conge | justified | unjustified
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function createAbsence(payload: {
  employe_id: number;
  date?: string; // single day
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  status?: string;     // default conge
  reason?: string;
}): Promise<Absence | Absence[]> {
  return http<Absence | Absence[]>(`/api/absences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function listAbsences(params?: {
  employe_id?: number;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  per_page?: number; // 0 pour tout
}): Promise<Absence[]> {
  const qs = new URLSearchParams();
  if (params?.employe_id) qs.set('employe_id', String(params.employe_id));
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (typeof params?.per_page === 'number') qs.set('per_page', String(params.per_page)); else qs.set('per_page', '0');
  const json = await http<any>(`/api/absences?${qs.toString()}`);
  return Array.isArray(json) ? json : (json?.data ?? []);
}
