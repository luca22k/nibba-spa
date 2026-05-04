// Bootstraps demo users + seed data. Idempotent: safe to call multiple times.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const FEATURES = ["bookings","customers","therapists","attendance","payments","reports","services_pricing","audit_log"] as const;

async function ensureUser(email: string, password: string, full_name: string) {
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (error) throw error;
    user = data.user!;
  }
  await admin.from("profiles").upsert({ id: user.id, full_name, is_active: true });
  return user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Idempotency check
    const { count } = await admin.from("branches").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ ok: true, message: "Already seeded", credentials: creds() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const owner = await ensureUser("owner@spa.test", "Demo1234!", "Olivia Owner");
    const admin1 = await ensureUser("admin1@spa.test", "Demo1234!", "Adrian Admin");
    const admin2 = await ensureUser("admin2@spa.test", "Demo1234!", "Andrea Admin");

    await admin.from("user_roles").upsert([
      { user_id: owner.id, role: "owner" },
      { user_id: admin1.id, role: "admin" },
      { user_id: admin2.id, role: "admin" },
    ], { onConflict: "user_id,role" });

    // grant full permissions to admins by default
    const perms = [admin1.id, admin2.id].flatMap((uid) =>
      FEATURES.map((f) => ({ user_id: uid, feature: f, can_view: true, can_edit: true, can_delete: f !== "audit_log" }))
    );
    await admin.from("admin_permissions").upsert(perms, { onConflict: "user_id,feature" });

    // Branches
    const branchesPayload = [
      { name: "Serenity Spa - Makati", address: "123 Ayala Ave, Makati", contact_number: "+63 917 111 2233", opening_time: "10:00", closing_time: "23:00" },
      { name: "Serenity Spa - BGC", address: "5th Ave, Bonifacio Global City", contact_number: "+63 917 222 3344", opening_time: "10:00", closing_time: "23:00" },
      { name: "Serenity Spa - Quezon City", address: "Tomas Morato, QC", contact_number: "+63 917 333 4455", opening_time: "11:00", closing_time: "22:00" },
    ];
    const { data: branches } = await admin.from("branches").insert(branchesPayload).select();
    if (!branches) throw new Error("branches insert failed");

    await admin.from("branch_admins").insert([
      { user_id: admin1.id, branch_id: branches[0].id },
      { user_id: admin1.id, branch_id: branches[1].id },
      { user_id: admin2.id, branch_id: branches[2].id },
    ]);

    // Rooms 4 per branch
    const rooms = branches.flatMap((b) => [1,2,3,4].map((n) => ({ branch_id: b.id, name: `Room ${n}` })));
    const { data: roomsData } = await admin.from("rooms").insert(rooms).select();

    // Services
    const servicesPayload = [
      { name: "Swedish Massage", category: "massage", duration_minutes: 60, base_price: 1200, description: "Classic relaxing massage" },
      { name: "Deep Tissue Massage", category: "massage", duration_minutes: 90, base_price: 1800, description: "Targets deep muscle tension" },
      { name: "Hot Stone Massage", category: "massage", duration_minutes: 90, base_price: 2200, description: "Warm basalt stones" },
      { name: "Aromatherapy Massage", category: "massage", duration_minutes: 60, base_price: 1500, description: "With essential oils" },
      { name: "Foot Reflexology", category: "add_on", duration_minutes: 30, base_price: 600, description: "Pressure-point foot massage" },
      { name: "Couples Package", category: "package", duration_minutes: 90, base_price: 3500, description: "Two Swedish massages side by side" },
      { name: "Home Service Massage", category: "home_service", duration_minutes: 90, base_price: 2500, description: "We come to you" },
      { name: "Hair Spa", category: "add_on", duration_minutes: 45, base_price: 800, description: "Scalp & hair treatment" },
    ];
    const { data: services } = await admin.from("services").insert(servicesPayload).select();
    if (!services) throw new Error("services failed");

    // Branch pricing variations
    const pricingRows: any[] = [];
    services.forEach((s) => {
      branches.forEach((b, i) => {
        pricingRows.push({ service_id: s.id, branch_id: b.id, price: Number(s.base_price) + i * 100 });
      });
    });
    await admin.from("service_branch_pricing").insert(pricingRows);

    // Therapists
    const names = ["Maria Cruz","Lara Reyes","Joy Santos","Kim Dela Cruz","Anna Lim","Faye Garcia","Bea Mendoza","Rina Tan","Sam Ortiz","Ella Ramos","Vivi Aquino","Tess Soriano"];
    const therapistRows = names.map((n, i) => ({
      full_name: n,
      phone: `+63 917 ${String(100+i).padStart(3,"0")} ${String(1000+i).padStart(4,"0")}`,
      email: n.toLowerCase().replace(/\s/g,".") + "@spa.test",
      branch_id: branches[i % 3].id,
      commission_rate: 10 + (i % 4) * 2,
      employment_status: "active",
    }));
    const { data: therapists } = await admin.from("therapists").insert(therapistRows).select();
    if (!therapists) throw new Error("therapists failed");

    // Skills - each therapist can do 4 random services
    const skills: any[] = [];
    therapists.forEach((t, i) => {
      const idxs = [0, 1, 2, 3, 4].map((k) => (i + k) % services.length);
      [...new Set(idxs)].slice(0, 4).forEach((j) => skills.push({ therapist_id: t.id, service_id: services[j].id }));
    });
    await admin.from("therapist_skills").insert(skills);

    // Schedules - Tue-Sun 10-22 with 14-15 break, Mon off
    const schedules: any[] = [];
    therapists.forEach((t) => {
      for (let d = 0; d < 7; d++) {
        const off = d === 1; // Monday off
        schedules.push({
          therapist_id: t.id,
          day_of_week: d,
          start_time: "10:00",
          end_time: "22:00",
          break_start: off ? null : "14:00",
          break_end: off ? null : "15:00",
          is_off: off,
        });
      }
    });
    await admin.from("therapist_schedules").insert(schedules);

    // Attendance for today and yesterday
    const today = new Date(); today.setHours(0,0,0,0);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const isoDay = (d: Date) => d.toISOString().slice(0,10);

    const att: any[] = [];
    therapists.forEach((t, i) => {
      const todayStatus = i % 7 === 0 ? "absent" : (i % 5 === 0 ? "late" : "present");
      const yestStatus = i % 6 === 0 ? "absent" : "present";
      att.push({ therapist_id: t.id, branch_id: t.branch_id, date: isoDay(today), status: todayStatus, clock_in: todayStatus==="absent"?null:new Date(today.getTime()+10*3600*1000).toISOString(), late_minutes: todayStatus==="late"?15:0 });
      att.push({ therapist_id: t.id, branch_id: t.branch_id, date: isoDay(yest), status: yestStatus, clock_in: yestStatus==="absent"?null:new Date(yest.getTime()+10*3600*1000).toISOString(), clock_out: yestStatus==="absent"?null:new Date(yest.getTime()+22*3600*1000).toISOString() });
    });
    await admin.from("attendance_records").insert(att);

    // Customers
    const cnames = ["John Smith","Sarah Lee","Mike Chen","Emma Watson","Carlos Rivera","Diana Park","Liam Brown","Sophia Gomez","Noah Tan","Mia Ng","Ethan Yu","Aria Wang","Lucas Cruz","Zoe Lim","Mason Kim","Ava Reyes","Logan Sy","Ella Tan","Henry Ko","Lily Vu","Owen Sia","Chloe Yap","Jack Lo","Grace Ong","Wyatt Que"];
    const customerRows = cnames.map((n, i) => ({
      full_name: n,
      phone: `+63 920 ${String(100+i).padStart(3,"0")} ${String(2000+i).padStart(4,"0")}`,
      email: n.toLowerCase().replace(/\s/g,".") + "@example.com",
      allergies: i % 5 === 0 ? "None" : null,
      preferred_therapist_id: therapists[i % therapists.length].id,
    }));
    const { data: customers } = await admin.from("customers").insert(customerRows).select();
    if (!customers) throw new Error("customers failed");

    // Bookings spanning yesterday/today/tomorrow
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dates = [yest, today, tomorrow];
    const statuses = ["completed","confirmed","in_progress","completed","pending","no_show","cancelled","confirmed"];
    const bookingRows: any[] = [];
    let counter = 0;
    for (const d of dates) {
      for (let h = 10; h < 21; h += 2) {
        for (let bi = 0; bi < 3; bi++) {
          const therapist = therapists[(counter) % therapists.length];
          const service = services[counter % services.length];
          const customer = customers[counter % customers.length];
          const branch = branches.find((b) => b.id === therapist.branch_id)!;
          const room = roomsData?.find((r) => r.branch_id === branch.id);
          const start = new Date(d); start.setHours(h, 0, 0, 0);
          const end = new Date(start.getTime() + (service.duration_minutes ?? 60) * 60000);
          const status = d < today ? "completed" : (d.getTime() === today.getTime() ? statuses[counter % statuses.length] : "confirmed");
          bookingRows.push({
            branch_id: branch.id,
            customer_id: customer.id,
            therapist_id: therapist.id,
            service_id: service.id,
            room_id: service.category === "home_service" ? null : room?.id,
            booking_type: ["walk_in","phone","online","repeat"][counter % 4],
            booking_date: isoDay(d),
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            status,
            payment_status: status === "completed" ? "paid" : (status === "in_progress" ? "partially_paid" : "unpaid"),
            payment_method: status === "completed" ? "cash" : null,
            is_home_service: service.category === "home_service",
            service_address: service.category === "home_service" ? "123 Customer Address, Manila" : null,
            notes: counter % 5 === 0 ? "Repeat customer, prefers light pressure" : null,
            created_by: admin1.id,
          });
          counter++;
        }
      }
    }
    const { data: bookings } = await admin.from("bookings").insert(bookingRows).select();
    if (!bookings) throw new Error("bookings failed");

    // Payments + commissions for completed bookings
    const completed = bookings.filter((b) => b.status === "completed");
    const paymentRows = completed.map((b) => {
      const svc = services.find((s) => s.id === b.service_id)!;
      const amount = Number(svc.base_price);
      return {
        booking_id: b.id, branch_id: b.branch_id, customer_id: b.customer_id,
        therapist_id: b.therapist_id, service_id: b.service_id,
        amount, discount: 0, final_amount: amount, method: "cash", status: "paid",
        date_paid: b.end_time,
      };
    });
    const { data: payments } = await admin.from("payments").insert(paymentRows).select();

    const commissionRows = (payments ?? []).map((p) => {
      const t = therapists.find((th) => th.id === p.therapist_id)!;
      const rate = Number(t.commission_rate);
      return {
        therapist_id: p.therapist_id, booking_id: p.booking_id, payment_id: p.id,
        branch_id: p.branch_id, amount: Number(p.final_amount) * rate / 100, rate,
        earned_date: (p.date_paid as string).slice(0,10),
      };
    });
    if (commissionRows.length) await admin.from("commissions").insert(commissionRows);

    return new Response(JSON.stringify({ ok: true, credentials: creds() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function creds() {
  return {
    owner: { email: "owner@spa.test", password: "Demo1234!" },
    admin1: { email: "admin1@spa.test", password: "Demo1234!" },
    admin2: { email: "admin2@spa.test", password: "Demo1234!" },
  };
}
