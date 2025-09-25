-- RLS Policies för Players med is_member helper
-- Kör i Supabase SQL Editor

-- Skapa helper function för membership check (camelCase schema)
create or replace function public.is_member(u uuid, t uuid)
returns boolean language sql stable as $
  select exists(
    select 1
    from public.tenant_memberships m
    where m."userId" = u and m."tenantId" = t
  );
$;

-- Ta bort befintliga policies
drop policy if exists players_select_same_tenant on public.players;
drop policy if exists players_insert_same_tenant on public.players;
drop policy if exists players_update_same_tenant on public.players;
drop policy if exists players_delete_same_tenant on public.players;

-- Skapa nya säkra policies (camelCase schema)
create policy players_select_same_tenant
on public.players for select
using ( is_member(auth.uid(), "tenantId") );

create policy players_insert_same_tenant
on public.players for insert
with check ( is_member(auth.uid(), "tenantId") );

create policy players_update_same_tenant
on public.players for update
using ( is_member(auth.uid(), "tenantId") )
with check ( is_member(auth.uid(), "tenantId") );

create policy players_delete_same_tenant
on public.players for delete
using ( is_member(auth.uid(), "tenantId") );

-- Säkerställ att RLS är aktiverat
alter table public.players enable row level security;