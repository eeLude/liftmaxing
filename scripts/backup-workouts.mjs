import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  let raw;
  try {
    raw = await readFile(envPath, "utf8");
  } catch {
    throw new Error("Missing .env.local — copy from .env.local.example and add your keys.");
  }

  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function fetchAll(supabase, table, applyFilter) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    let query = supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (applyFilter) query = applyFilter(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchAllOptional(supabase, table, applyFilter) {
  try {
    return await fetchAll(supabase, table, applyFilter);
  } catch (err) {
    const code = err?.code ?? err?.cause?.code;
    const message = String(err?.message ?? err);
    if (
      code === "42P01" ||
      code === "PGRST205" ||
      /schema cache|does not exist|Could not find the table/i.test(message)
    ) {
      console.warn(`Skipping missing table: ${table}`);
      return [];
    }
    throw err;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const env = await loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = env.BACKUP_USER_ID?.trim() || null;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (service role is backup-only, never commit it)."
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let sessions = await fetchAll(supabase, "workout_sessions", (q) =>
    userId ? q.eq("user_id", userId) : q
  );

  const sessionIds = sessions.map((s) => s.id);
  let exercises = [];
  let logs = [];

  if (sessionIds.length > 0) {
    exercises = await fetchAll(supabase, "session_exercises", (q) =>
      q.in("session_id", sessionIds)
    );
    const exerciseIds = exercises.map((e) => e.id);
    if (exerciseIds.length > 0) {
      logs = await fetchAll(supabase, "workout_logs", (q) =>
        q.in("session_exercise_id", exerciseIds)
      );
    }
  }

  const healthLogs = await fetchAllOptional(supabase, "health_logs", (q) =>
    userId ? q.eq("user_id", userId) : q
  );
  const profiles = await fetchAllOptional(supabase, "user_profiles", (q) =>
    userId ? q.eq("user_id", userId) : q
  );
  const books = await fetchAllOptional(supabase, "books", (q) =>
    userId ? q.eq("user_id", userId) : q
  );
  const moodLogs = await fetchAllOptional(supabase, "mood_logs", (q) =>
    userId ? q.eq("user_id", userId) : q
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    userIdFilter: userId,
    tables: {
      workout_sessions: sessions,
      session_exercises: exercises,
      workout_logs: logs,
      health_logs: healthLogs,
      user_profiles: profiles,
      books,
      mood_logs: moodLogs,
    },
  };

  const backupsDir = path.join(root, "backups");
  await mkdir(backupsDir, { recursive: true });
  const outPath = path.join(backupsDir, `liftmaxxing-${todayIso()}.json`);
  await writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Backup written: ${outPath}`);
  console.log(
    `  workout_sessions: ${sessions.length}, session_exercises: ${exercises.length}, workout_logs: ${logs.length}, health_logs: ${healthLogs.length}, user_profiles: ${profiles.length}, books: ${books.length}, mood_logs: ${moodLogs.length}`
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
