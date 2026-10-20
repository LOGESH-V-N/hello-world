"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness, Building2, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleAlert, Download, LoaderCircle, Mail, Pencil, Plus, Search, Trash2, Users, X,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

type Employee = {
  id: number; employeeCode: string; firstName: string; lastName?: string | null;
  email: string; mobile: string; panMasked?: string | null; aadhaarMasked?: string | null;
  department: string; designation: string; salary: number; dateOfJoining: string;
  isActive: boolean; createdAt: string; version: number;
  documents: { id: number; documentType: number; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string }[];
};
type EmployeePage = { items: Employee[]; page: number; pageSize: number; totalCount: number; totalPages: number };
type EmployeeForm = { firstName: string; lastName: string; email: string; mobile: string; department: string; designation: string; salary: string; dateOfJoining: string };
const EMPTY_FORM: EmployeeForm = { firstName: "", lastName: "", email: "", mobile: "", department: "Engineering", designation: "", salary: "", dateOfJoining: new Date().toISOString().slice(0, 10) };
const DEPARTMENTS = ["Engineering", "Human Resources", "Finance", "Operations", "Sales", "Marketing", "Design", "Customer Support"];
function displayName(e: Employee) { return [e.firstName, e.lastName].filter(Boolean).join(" "); }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—"; }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }
function initials(e: Employee) { return (e.firstName.slice(0, 1) + (e.lastName?.slice(0, 1) || "")).toUpperCase(); }

export default function EmployeesPage() {
  const [data, setData] = useState<EmployeePage | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);

  const loadEmployees = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (department) params.set("department", department);
      setData(await apiClient<EmployeePage>("/api/v1/employees?" + params.toString()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load employees.");
    } finally { setLoading(false); }
  }, [page, search, department]);
  useEffect(() => { void loadEmployees(); }, [loadEmployees]);

  const activeCount = useMemo(() => data?.items.filter((e) => e.isActive).length ?? 0, [data]);
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setError(""); setNotice(""); setDialogOpen(true); }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm({ firstName: e.firstName, lastName: e.lastName || "", email: e.email, mobile: e.mobile, department: e.department, designation: e.designation, salary: String(e.salary), dateOfJoining: e.dateOfJoining.slice(0, 10) });
    setError(""); setNotice(""); setDialogOpen(true);
  }
  function updateField(field: keyof EmployeeForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const payload = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim() || null,
      email: form.email.trim().toLowerCase(), mobile: form.mobile.trim(),
      department: form.department, designation: form.designation.trim(),
      salary: Number(form.salary), dateOfJoining: form.dateOfJoining, version: editing?.version ?? 0,
    };
    try {
      if (editing) {
        await apiClient<Employee>("/api/v1/employees/" + editing.id, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Employee details updated successfully.");
      } else {
        await apiClient<Employee>("/api/v1/employees", { method: "POST", body: JSON.stringify(payload) });
        setNotice("Employee added successfully.");
      }
      setDialogOpen(false); setPage(1); await loadEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not save employee.");
    } finally { setSaving(false); }
  }

  async function deactivateEmployee(e: Employee) {
    if (!window.confirm("Deactivate " + displayName(e) + "? Their record will be retained for audit.")) return;
    setError(""); setNotice("");
    try {
      await apiClient("/api/v1/employees/" + e.id, { method: "DELETE" });
      setNotice(displayName(e) + " has been deactivated."); await loadEmployees();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not deactivate employee."); }
  }

  function exportCsv() {
    const rows = data?.items ?? [];
    const columns = ["Employee ID", "Name", "Email", "Mobile", "Department", "Designation", "Salary (INR)", "Joining date", "Status"];
    const quote = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"';
    const content = [columns, ...rows.map((e) => [e.employeeCode, displayName(e), e.email, e.mobile, e.department, e.designation, e.salary, e.dateOfJoining, e.isActive ? "Active" : "Inactive"])].map((row) => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "employees-page-" + page + ".csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Users className="size-4" /> People operations</div>
        <h1 className="text-3xl font-semibold tracking-tight">Employee management</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Keep employee records, team assignments and joining details in one place.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportCsv} disabled={!data?.items.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><Download className="size-4" /> Export page</button>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><Plus className="size-4" /> Add employee</button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Total employees</span><Users className="size-4 text-primary" /></div><div className="mt-3 text-3xl font-semibold">{data?.totalCount ?? "—"}</div><p className="mt-1 text-xs text-muted-foreground">Matching current filters</p></div>
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Active on this page</span><Check className="size-4 text-emerald-600" /></div><div className="mt-3 text-3xl font-semibold">{activeCount}</div><p className="mt-1 text-xs text-muted-foreground">Active employee records</p></div>
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Departments</span><Building2 className="size-4 text-primary" /></div><div className="mt-3 text-3xl font-semibold">{new Set((data?.items ?? []).map((e) => e.department)).size}</div><p className="mt-1 text-xs text-muted-foreground">Represented on this page</p></div>
    </div>

    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check className="mt-0.5 size-4 shrink-0" />{notice}</div>}
    {error && !dialogOpen && <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")} className="ml-auto"><X className="size-4" /></button></div>}

    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center">
        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput); }} className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email or employee ID" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></form>
        <select aria-label="Filter by department" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} className="h-10 min-w-48 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"><option value="">All departments</option>{DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setDepartment(""); setPage(1); }} className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">Reset</button>
      </div>

      {loading ? <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /> Loading employee records…</div>
      : error && !data ? <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-5 text-center"><CircleAlert className="size-8 text-destructive" /><p className="max-w-lg text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => void loadEmployees()} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">Try again</button></div>
      : !data?.items.length ? <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center"><div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="size-6" /></div><h2 className="font-semibold">No employees found</h2><p className="mt-1 text-sm text-muted-foreground">Try a different search or add your first employee.</p><button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Add employee</button></div>
      : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Employee</th><th className="px-4 py-3 font-medium">Department</th><th className="px-4 py-3 font-medium">Designation</th><th className="px-4 py-3 font-medium">Joining date</th><th className="px-4 py-3 font-medium">Salary</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
          <tbody className="divide-y divide-border/70">{data.items.map((e) => <tr key={e.id} className="transition hover:bg-muted/30">
            <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">{initials(e)}</div><div className="min-w-0"><div className="font-semibold">{displayName(e)}</div><div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" />{e.email}</div><div className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">{e.employeeCode}</div></div></div></td>
            <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium"><Building2 className="size-3" />{e.department}</span></td>
            <td className="px-4 py-4">{e.designation}</td><td className="px-4 py-4 whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(e.dateOfJoining)}</span></td>
            <td className="px-4 py-4 whitespace-nowrap font-medium">{formatCurrency(e.salary)}</td><td className="px-4 py-4"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " + (e.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{e.isActive ? "Active" : "Inactive"}</span></td>
            <td className="px-4 py-4"><div className="flex justify-end gap-1.5"><button type="button" title="Edit employee" aria-label={"Edit " + displayName(e)} onClick={() => openEdit(e)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"><Pencil className="size-4" /></button>{e.isActive && <button type="button" title="Deactivate employee" aria-label={"Deactivate " + displayName(e)} onClick={() => void deactivateEmployee(e)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>}</div></td>
          </tr>)}</tbody></table></div>
        <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Showing {data.totalCount === 0 ? 0 : (page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.totalCount)} of {data.totalCount} employees</p><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40"><ChevronLeft className="size-4" /> Previous</button><span className="min-w-20 text-center text-xs text-muted-foreground">Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40">Next <ChevronRight className="size-4" /></button></div></div>
      </>}
    </section>

    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs leading-5 text-muted-foreground"><BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-primary" /><p>Employee data is loaded from the authenticated API. Sensitive identity fields are masked by the server; this screen does not display full PAN or Aadhaar numbers. Deactivation retains the record for audit.</p></div>

    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialogOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title" className="my-auto max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur"><div><h2 id="employee-dialog-title" className="text-lg font-semibold">{editing ? "Edit employee" : "Add employee"}</h2><p className="mt-1 text-xs text-muted-foreground">{editing ? "Update team and employment details." : "Create a new employee record in the directory."}</p></div><button type="button" aria-label="Close form" disabled={saving} onClick={() => setDialogOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"><X className="size-4" /></button></div>
        <form onSubmit={submitForm} className="space-y-5 p-5">
          {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">First name <span className="text-destructive">*</span><input required maxLength={100} value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm font-medium">Last name<input maxLength={100} value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Work email <span className="text-destructive">*</span><input required type="email" maxLength={200} value={form.email} onChange={(event) => updateField("email", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm font-medium">Mobile number <span className="text-destructive">*</span><input required inputMode="numeric" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" value={form.mobile} onChange={(event) => updateField("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm font-medium">Department <span className="text-destructive">*</span><select required value={form.department} onChange={(event) => updateField("department", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary">{DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="space-y-1.5 text-sm font-medium">Designation <span className="text-destructive">*</span><input required maxLength={120} value={form.designation} onChange={(event) => updateField("designation", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm font-medium">Annual salary (INR) <span className="text-destructive">*</span><input required type="number" min="0" max="100000000" step="1000" value={form.salary} onChange={(event) => updateField("salary", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm font-medium">Date of joining <span className="text-destructive">*</span><input required type="date" value={form.dateOfJoining} onChange={(event) => updateField("dateOfJoining", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary" /></label>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">PAN and Aadhaar are intentionally excluded from this form. The API masks these values and preserves existing identifiers when omitted.</p>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => setDialogOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{saving ? "Saving…" : editing ? "Save changes" : "Create employee"}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
