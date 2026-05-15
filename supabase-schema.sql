-- Passômetro UTI - Schema Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase

create table if not exists patients (
  id text primary key,
  name text not null,
  bed_number text,
  diagnosis text,
  priority text default 'Baixa',
  antibiotics jsonb default '[]'::jsonb,
  admission_date text,
  current_condition text,
  pending_actions text,
  next_steps text,
  author text,
  created_at timestamptz default now(),
  last_modified timestamptz default now()
);

-- Permitir acesso público (app é para uso interno da UTI)
alter table patients enable row level security;
create policy "Allow all operations" on patients for all using (true) with check (true);

-- Ativar realtime para atualização automática entre usuários
alter publication supabase_realtime add table patients;
