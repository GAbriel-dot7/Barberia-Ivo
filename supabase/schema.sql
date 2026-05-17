-- SGCM - Supabase schema
-- Modelo base para uma instalação por cliente.
-- Cada cópia do sistema usa seu próprio projeto Supabase.

create extension if not exists pgcrypto;

-- Tipos
-- Create enum types only if they don't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'atendente');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agendamento_status') THEN
    CREATE TYPE public.agendamento_status AS ENUM ('agendado', 'concluido', 'cancelado');
  END IF;
END
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_usuarios_updated_at' AND tgrelid = 'public.usuarios'::regclass
  ) THEN
    CREATE TRIGGER set_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_clientes_updated_at' AND tgrelid = 'public.clientes'::regclass
  ) THEN
    CREATE TRIGGER set_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_servicos_updated_at' AND tgrelid = 'public.servicos'::regclass
  ) THEN
    CREATE TRIGGER set_servicos_updated_at
    BEFORE UPDATE ON public.servicos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_agendamentos_updated_at' AND tgrelid = 'public.agendamentos'::regclass
  ) THEN
    CREATE TRIGGER set_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_configuracoes_updated_at' AND tgrelid = 'public.configuracoes'::regclass
  ) THEN
    CREATE TRIGGER set_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- RLS
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.servicos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.historico enable row level security;
alter table public.configuracoes enable row level security;

-- A aplicação usa ANON KEY no front-end, então a instalação por cliente
-- precisa permitir acesso ao schema para anon/authenticated.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'usuarios_select_own' AND polrelid = 'public.usuarios'::regclass) THEN
    CREATE POLICY "usuarios_select_own"
    ON public.usuarios
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'usuarios_update_own' AND polrelid = 'public.usuarios'::regclass) THEN
    CREATE POLICY "usuarios_update_own"
    ON public.usuarios
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'usuarios_insert_authenticated' AND polrelid = 'public.usuarios'::regclass) THEN
    CREATE POLICY "usuarios_insert_authenticated"
    ON public.usuarios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'usuarios_delete_authenticated' AND polrelid = 'public.usuarios'::regclass) THEN
    CREATE POLICY "usuarios_delete_authenticated"
    ON public.usuarios
    FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END
$$;

-- Regra simples para a base copiável: todo usuário autenticado pode operar a base da própria instalação.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'clientes_authenticated_all' AND polrelid = 'public.clientes'::regclass) THEN
    CREATE POLICY "clientes_authenticated_all"
    ON public.clientes
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'servicos_authenticated_all' AND polrelid = 'public.servicos'::regclass) THEN
    CREATE POLICY "servicos_authenticated_all"
    ON public.servicos
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'agendamentos_authenticated_all' AND polrelid = 'public.agendamentos'::regclass) THEN
    CREATE POLICY "agendamentos_authenticated_all"
    ON public.agendamentos
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'historico_authenticated_all' AND polrelid = 'public.historico'::regclass) THEN
    CREATE POLICY "historico_authenticated_all"
    ON public.historico
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'configuracoes_authenticated_all' AND polrelid = 'public.configuracoes'::regclass) THEN
    CREATE POLICY "configuracoes_authenticated_all"
    ON public.configuracoes
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

-- Storage de backups JSON do front-end.
-- As policies abaixo liberam apenas arquivos com o padrão de backup usado pelo app.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'storage_backups_read' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "storage_backups_read"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (name LIKE 'sgcm-backup-%');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'storage_backups_insert' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "storage_backups_insert"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (name LIKE 'sgcm-backup-%');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'storage_backups_update' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "storage_backups_update"
    ON storage.objects
    FOR UPDATE
    TO anon, authenticated
    USING (name LIKE 'sgcm-backup-%')
    WITH CHECK (name LIKE 'sgcm-backup-%');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'storage_backups_delete' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "storage_backups_delete"
    ON storage.objects
    FOR DELETE
    TO anon, authenticated
    USING (name LIKE 'sgcm-backup-%');
  END IF;
END
$$;

-- Opcional: permitir que o primeiro admin seja inserido manualmente via SQL ou seed.
-- Recomendação para a próxima fase: criar funções RPC para login de UI antiga,
-- ou migrar a interface para Supabase Auth de forma gradual.
