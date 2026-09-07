create table if not exists public.agendamentos (
  id text primary key default ('ag_' || extract(epoch from now())::bigint),
  nome text not null,
  telefone text not null,
  email text,
  pet text,
  servico text not null,
  data_formatada text not null,
  horario text not null,
  status text not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table if not exists public.mensagens (
  id text primary key,
  nome text not null,
  email text not null,
  telefone text,
  servico text,
  texto text not null,
  lida boolean not null default false,
  criada_em timestamptz not null default now()
);

alter table public.agendamentos enable row level security;
alter table public.mensagens enable row level security;

create policy "site pode inserir agendamentos"
  on public.agendamentos for insert to anon with check (true);
create policy "site pode consultar agendamentos"
  on public.agendamentos for select to anon using (true);
create policy "painel pode atualizar agendamentos"
  on public.agendamentos for update to anon using (true) with check (true);
create policy "site pode inserir mensagens"
  on public.mensagens for insert to anon with check (true);
create policy "painel pode consultar mensagens"
  on public.mensagens for select to anon using (true);
create policy "painel pode atualizar mensagens"
  on public.mensagens for update to anon using (true) with check (true);
create policy "painel pode excluir mensagens"
  on public.mensagens for delete to anon using (true);
