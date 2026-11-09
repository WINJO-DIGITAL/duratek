import "server-only";
import { planPacks, roomArea, type PackPlan } from "@/lib/pricing";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";

/** Everything here is read as the signed-in trader: RLS returns their own rows only. */

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string;
  postcode: string | null;
  notes: string;
  createdAt: string;
}

const toCustomer = (c: { id: string; name: string; email: string | null; phone: string | null; address: string; postcode: string | null; notes: string; created_at: string }): Customer => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  postcode: c.postcode,
  notes: c.notes,
  createdAt: c.created_at,
});

export async function listCustomers(): Promise<Customer[]> {
  const db = await userSupabase();
  const { data } = await db.from("customers").select("id, name, email, phone, address, postcode, notes, created_at").order("name").limit(1000);
  return (data ?? []).map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (!isUuid(id)) return null;
  const db = await userSupabase();
  const { data } = await db.from("customers").select("id, name, email, phone, address, postcode, notes, created_at").eq("id", id).maybeSingle();
  return data ? toCustomer(data) : null;
}

export interface Room {
  id: string;
  name: string;
  lengthM: number | null;
  widthM: number | null;
  areaM2: number | null;
  wastagePct: number;
  finishId: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  sitePostcode: string | null;
  notes: string;
  rooms: Room[];
  updatedAt: string;
}

const PROJECT_SELECT =
  "id, name, customer_id, customer_name, site_postcode, notes, updated_at, customers (name), project_items (id, room_name, length_m, width_m, area_m2, wastage_pct, finish_id, sort_order, created_at)";

type ProjectRow = {
  id: string;
  name: string;
  customer_id: string | null;
  customer_name: string | null;
  site_postcode: string | null;
  notes: string;
  updated_at: string;
  customers: { name: string } | null;
  project_items: { id: string; room_name: string | null; length_m: number | null; width_m: number | null; area_m2: number | null; wastage_pct: number | null; finish_id: string | null; sort_order: number; created_at: string }[];
};

function toProject(p: ProjectRow): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    customerId: p.customer_id,
    customerName: p.customers?.name ?? p.customer_name,
    sitePostcode: p.site_postcode,
    notes: p.notes,
    updatedAt: p.updated_at,
    rooms: [...p.project_items]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map((r) => {
        const l = r.length_m === null ? null : Number(r.length_m);
        const w = r.width_m === null ? null : Number(r.width_m);
        return {
          id: r.id,
          name: r.room_name ?? "Room",
          lengthM: l,
          widthM: w,
          areaM2: l && w ? roomArea({ lengthM: l, widthM: w }) : r.area_m2 === null ? null : Number(r.area_m2),
          wastagePct: r.wastage_pct === null ? 10 : Number(r.wastage_pct),
          finishId: r.finish_id,
        };
      }),
  };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await userSupabase();
  const { data } = await db.from("projects").select(PROJECT_SELECT).eq("archived", false).order("updated_at", { ascending: false }).limit(200);
  return ((data ?? []) as unknown as ProjectRow[]).map(toProject);
}

export async function getProject(id: string): Promise<ProjectSummary | null> {
  if (!isUuid(id)) return null;
  const db = await userSupabase();
  const { data } = await db.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  return data ? toProject(data as unknown as ProjectRow) : null;
}

/** Packs for a room, from the finish's actual pack coverage. Null when something is missing. */
export function roomPlan(room: Room, coverageM2: number | undefined): PackPlan | null {
  if (!room.areaM2 || !coverageM2) return null;
  return planPacks(room.areaM2, room.wastagePct, coverageM2);
}

export async function listSavedFinishIds(): Promise<string[]> {
  const db = await userSupabase();
  const { data } = await db.from("saved_products").select("finish_id").order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.finish_id);
}
