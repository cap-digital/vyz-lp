// Gera src/lib/supabase/database.types.ts lendo o catálogo do Postgres (schema
// public). Mesmo formato do `supabase gen types`, sem precisar de Docker.
//
//   npm run db:types
//
// Lê SUPABASE_DB_URL do .env.local.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

process.loadEnvFile?.(".env.local");

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("SUPABASE_DB_URL não definido (.env.local)");

const OUT = resolve("src/lib/supabase/database.types.ts");
const POSTGREST_VERSION = "14.18";

type Col = { rel: string; name: string; typ: string; typtype: string; elem: string | null; elemtype: string | null; notnull: boolean; hasdef: boolean; identity: string; generated: string };
type Rel = { name: string; kind: string };
type Fk = { rel: string; name: string; cols: string[]; refrel: string; refcols: string[]; one: boolean };
type Fn = { name: string; argnames: string[] | null; argtypes: string[]; argmodes: string[] | null; ndefaults: number; rettype: string; rettyptype: string; retelem: string | null; retset: boolean };

const sql = postgres(url, { ssl: "require", max: 1, prepare: false });

const SCALAR: Record<string, string> = {
  bool: "boolean",
  int2: "number",
  int4: "number",
  int8: "number",
  float4: "number",
  float8: "number",
  numeric: "number",
  oid: "number",
  text: "string",
  varchar: "string",
  bpchar: "string",
  citext: "string",
  uuid: "string",
  date: "string",
  time: "string",
  timetz: "string",
  timestamp: "string",
  timestamptz: "string",
  interval: "string",
  inet: "string",
  cidr: "string",
  bytea: "string",
  json: "Json",
  jsonb: "Json",
  void: "undefined",
};

const key = (name: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : JSON.stringify(name));

async function main() {
  const enums = await sql<{ name: string; labels: string[] }[]>`
    select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname`;
  const enumNames = new Set(enums.map((e) => e.name));

  const rels = await sql<Rel[]>`
    select c.relname as name, c.relkind::text as kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and not c.relispartition
    order by c.relname`;

  const cols = await sql<Col[]>`
    select c.relname as rel, a.attname as name, t.typname as typ, t.typtype::text as typtype,
           et.typname as elem, et.typtype::text as elemtype,
           a.attnotnull as notnull, a.atthasdef as hasdef, a.attidentity::text as identity, a.attgenerated::text as generated
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_type et on et.oid = t.typelem and t.typcategory = 'A'
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and not c.relispartition
      and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum`;

  const fks = await sql<Fk[]>`
    select src.relname as rel, con.conname as name,
           array(select a.attname from unnest(con.conkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum order by k.ord) as cols,
           dst.relname as refrel,
           array(select a.attname from unnest(con.confkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum order by k.ord) as refcols,
           exists (
             select 1 from pg_constraint u
             where u.conrelid = con.conrelid and u.contype in ('p', 'u')
               and u.conkey::int2[] <@ con.conkey::int2[] and con.conkey::int2[] <@ u.conkey::int2[]
           ) as one
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_namespace sn on sn.oid = src.relnamespace
    join pg_class dst on dst.oid = con.confrelid
    join pg_namespace dn on dn.oid = dst.relnamespace
    where con.contype = 'f' and sn.nspname = 'public' and dn.nspname = 'public' and not src.relispartition
    order by src.relname, con.conname`;

  const fns = await sql<Fn[]>`
    select p.proname as name, p.proargnames as argnames,
           array(select format_type(t, null) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) t) as argtypes,
           p.proargmodes::text[] as argmodes, p.pronargdefaults as ndefaults,
           rt.typname as rettype, rt.typtype::text as rettyptype, ret.typname as retelem, p.proretset as retset
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type rt on rt.oid = p.prorettype
    left join pg_type ret on ret.oid = rt.typelem and rt.typcategory = 'A'
    where n.nspname = 'public' and p.prokind = 'f' and rt.typname <> 'trigger'
    order by p.proname`;

  await sql.end();

  const tsType = (typ: string, typtype: string, elem: string | null, elemtype: string | null): string => {
    if (elem) return `${tsType(elem, elemtype ?? "b", null, null)}[]`;
    if (typtype === "e" && enumNames.has(typ)) return `Database["public"]["Enums"]["${typ}"]`;
    return SCALAR[typ] ?? "unknown";
  };
  // format_type devolve nomes SQL ("text", "uuid[]", "timestamp with time zone", "public.member_role")
  const sqlNameType = (name: string): string => {
    if (name.endsWith("[]")) return `${sqlNameType(name.slice(0, -2))}[]`;
    const bare = name.replace(/^public\./, "");
    if (enumNames.has(bare)) return `Database["public"]["Enums"]["${bare}"]`;
    const map: Record<string, string> = {
      boolean: "boolean",
      smallint: "number",
      integer: "number",
      bigint: "number",
      numeric: "number",
      real: "number",
      "double precision": "number",
      text: "string",
      uuid: "string",
      date: "string",
      "timestamp with time zone": "string",
      "timestamp without time zone": "string",
      inet: "string",
      json: "Json",
      jsonb: "Json",
      regclass: "string",
    };
    return map[bare] ?? SCALAR[bare] ?? "unknown";
  };

  const byRel = new Map<string, Col[]>();
  for (const c of cols) byRel.set(c.rel, [...(byRel.get(c.rel) ?? []), c]);
  const fkByRel = new Map<string, Fk[]>();
  for (const f of fks) fkByRel.set(f.rel, [...(fkByRel.get(f.rel) ?? []), f]);

  const ind = (n: number) => "  ".repeat(n);
  const relationships = (rel: string, depth: number) => {
    const list = fkByRel.get(rel) ?? [];
    if (!list.length) return `${ind(depth)}Relationships: []`;
    const items = list.map(
      (f) =>
        `${ind(depth + 1)}{\n${ind(depth + 2)}foreignKeyName: ${JSON.stringify(f.name)}\n${ind(depth + 2)}columns: ${JSON.stringify(f.cols)}\n${ind(depth + 2)}isOneToOne: ${f.one}\n${ind(depth + 2)}referencedRelation: ${JSON.stringify(f.refrel)}\n${ind(depth + 2)}referencedColumns: ${JSON.stringify(f.refcols)}\n${ind(depth + 1)}},`,
    );
    return `${ind(depth)}Relationships: [\n${items.join("\n")}\n${ind(depth)}]`;
  };

  const tables: string[] = [];
  const views: string[] = [];
  for (const r of rels) {
    const list = byRel.get(r.name) ?? [];
    const isView = r.kind === "v" || r.kind === "m";
    const row = list.map((c) => {
      const t = tsType(c.typ, c.typtype, c.elem, c.elemtype);
      const nullable = isView || !c.notnull;
      return `${ind(5)}${key(c.name)}: ${t}${nullable ? " | null" : ""}`;
    });
    if (isView) {
      views.push(`${ind(3)}${key(r.name)}: {\n${ind(4)}Row: {\n${row.join("\n")}\n${ind(4)}}\n${relationships(r.name, 4)}\n${ind(3)}}`);
      continue;
    }
    const insert = list.map((c) => {
      const t = tsType(c.typ, c.typtype, c.elem, c.elemtype);
      if (c.identity === "a" || c.generated === "s") return `${ind(5)}${key(c.name)}?: never`;
      const optional = !c.notnull || c.hasdef || c.identity === "d";
      return `${ind(5)}${key(c.name)}${optional ? "?" : ""}: ${t}${!c.notnull ? " | null" : ""}`;
    });
    const update = list.map((c) => {
      const t = tsType(c.typ, c.typtype, c.elem, c.elemtype);
      if (c.identity === "a" || c.generated === "s") return `${ind(5)}${key(c.name)}?: never`;
      return `${ind(5)}${key(c.name)}?: ${t}${!c.notnull ? " | null" : ""}`;
    });
    tables.push(
      `${ind(3)}${key(r.name)}: {\n${ind(4)}Row: {\n${row.join("\n")}\n${ind(4)}}\n${ind(4)}Insert: {\n${insert.join("\n")}\n${ind(4)}}\n${ind(4)}Update: {\n${update.join("\n")}\n${ind(4)}}\n${relationships(r.name, 4)}\n${ind(3)}}`,
    );
  }

  const functions = fns.map((f) => {
    const modes = f.argmodes ?? f.argtypes.map(() => "i");
    const names = f.argnames ?? [];
    const inputs: string[] = [];
    const outputs: string[] = [];
    const inIdx = modes.map((m, i) => ({ m, i })).filter((x) => x.m === "i" || x.m === "b" || x.m === "v");
    const firstDefault = inIdx.length - f.ndefaults;
    inIdx.forEach(({ i }, pos) => {
      const name = names[i] || `arg${i}`;
      inputs.push(`${ind(5)}${key(name)}${pos >= firstDefault ? "?" : ""}: ${sqlNameType(f.argtypes[i])}`);
    });
    modes.forEach((m, i) => {
      if (m === "t" || m === "o") outputs.push(`${ind(6)}${key(names[i] || `col${i}`)}: ${sqlNameType(f.argtypes[i])}`);
    });
    let ret: string;
    if (outputs.length) ret = `{\n${outputs.join("\n")}\n${ind(5)}}[]`;
    else {
      const base = tsType(f.rettype, f.rettyptype, f.retelem, null);
      ret = f.retset ? `${base}[]` : base;
    }
    const args = inputs.length ? `{\n${inputs.join("\n")}\n${ind(4)}}` : "never";
    return `${ind(3)}${key(f.name)}: {\n${ind(4)}Args: ${args}\n${ind(4)}Returns: ${ret}\n${ind(3)}}`;
  });

  const enumLines = enums.map((e) => `${ind(3)}${key(e.name)}: ${e.labels.map((l) => JSON.stringify(l)).join(" | ")}`);
  const constants = enums.map((e) => `${ind(3)}${key(e.name)}: [${e.labels.map((l) => JSON.stringify(l)).join(", ")}],`);

  const out = `// GERADO por scripts/db/gen-types.ts (npm run db:types). Não editar à mão.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "${POSTGREST_VERSION}"
  }
  public: {
    Tables: {
${tables.join("\n")}
    }
    Views: {
${views.join("\n")}
    }
    Functions: {
${functions.join("\n")}
    }
    Enums: {
${enumLines.join("\n")}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> = (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T] extends { Insert: infer I } ? I : never
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T] extends { Update: infer U } ? U : never
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type FunctionArgs<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Args"]
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Returns"]

export const Constants = {
  public: {
    Enums: {
${constants.join("\n")}
    },
  },
} as const
`;
  writeFileSync(OUT, out);
  console.log(`database.types.ts: ${tables.length} tabelas, ${views.length} views, ${functions.length} funções, ${enums.length} enums`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
