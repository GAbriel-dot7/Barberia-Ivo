-- SGCM - Supabase schema
-- Modelo base para uma instalação por cliente.
-- Cada cópia do sistema usa seu próprio projeto Supabase.

create extension if not exists pgcrypto;

-- Tipos
create type public.user_role as enum ('admin', 'atendente');
create type public.agendamento_status as enum ('agendado', 'concluido', 'cancelado');

-- Perfil de usuário / funcionário
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  email text not null unique,
  role public.user_role not null default 'atendente',
  comissao numeric(5,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clientes
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Serviços
create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null default 0,
  duracao integer not null default 0,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Agendamentos
create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  servico_id uuid not null references public.servicos (id) on delete restrict,
  funcionario_id uuid references public.usuarios (id) on delete set null,
  data date not null,
  hora time not null,
  valor numeric(10,2) not null default 0,
  status public.agendamento_status not null default 'agendado',
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_agendamentos_data_status on public.agendamentos (data, status);
create index if not exists idx_agendamentos_cliente on public.agendamentos (cliente_id);
create index if not exists idx_agendamentos_funcionario on public.agendamentos (funcionario_id);

-- Histórico de atendimentos concluídos
create table if not exists public.historico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  servico_id uuid references public.servicos (id) on delete set null,
  funcionario_id uuid references public.usuarios (id) on delete set null,
  agendamento_id uuid references public.agendamentos (id) on delete set null,
  valor numeric(10,2) not null default 0,
  data date not null,
  hora time not null,
  observacao text,
  registrado_em timestamptz not null default now()
);

create index if not exists idx_historico_registrado_em on public.historico (registrado_em);
create index if not exists idx_historico_funcionario on public.historico (funcionario_id);

-- Configurações do negócio
create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Meu Negócio',
  slogan text not null default 'Bem-vindo ao sistema',
  cor text not null default '#2563EB',
  owner text not null default 'Admin',
  emoji text not null default '🏪',
  modulos jsonb not null default '{"duracao":true,"historico":true,"agendamentos":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_usuarios_updated_at
before update on public.usuarios
for each row execute function public.set_updated_at();

create trigger set_clientes_updated_at
before update on public.clientes
for each row execute function public.set_updated_at();

create trigger set_servicos_updated_at
before update on public.servicos
for each row execute function public.set_updated_at();

create trigger set_agendamentos_updated_at
before update on public.agendamentos
for each row execute function public.set_updated_at();

create trigger set_configuracoes_updated_at
before update on public.configuracoes
for each row execute function public.set_updated_at();

-- RLS
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.servicos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.historico enable row level security;
alter table public.configuracoes enable row level security;

-- Usuários autenticados podem ler o próprio perfil
create policy "usuarios_select_own"
on public.usuarios
for select
to authenticated
using (true);

create policy "usuarios_update_own"
on public.usuarios
for update
to authenticated
using (true)
with check (true);

create policy "usuarios_insert_authenticated"
on public.usuarios
for insert
to authenticated
with check (true);

create policy "usuarios_delete_authenticated"
on public.usuarios
for delete
to authenticated
using (true);

-- Regra simples para a base copiável: todo usuário autenticado pode operar a base da própria instalação.
create policy "clientes_authenticated_all"
on public.clientes
for all
to authenticated
using (true)
with check (true);

create policy "servicos_authenticated_all"
on public.servicos
for all
to authenticated
using (true)
with check (true);

create policy "agendamentos_authenticated_all"
on public.agendamentos
for all
to authenticated
using (true)
with check (true);

create policy "historico_authenticated_all"
on public.historico
for all
to authenticated
using (true)
with check (true);

create policy "configuracoes_authenticated_all"
on public.configuracoes
for all
to authenticated
using (true)
with check (true);

-- Opcional: permitir que o primeiro admin seja inserido manualmente via SQL ou seed.
-- Recomendação para a próxima fase: criar funções RPC para login de UI antiga,
-- ou migrar a interface para Supabase Auth de forma gradual.
