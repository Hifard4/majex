-- ===== Majors =====
create table majors (
  id serial primary key,
  name text unique not null
);

insert into majors (name) values
  ('Computer Science'), ('Law'), ('Medicine'), ('Economics'),
  ('Civil Engineering'), ('Public Administration'), ('Agronomy'), ('Mathematics');

-- ===== Profiles =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

-- ===== Exchange requests =====
create table exchange_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  current_major_id int references majors(id) not null,
  target_major_id int references majors(id) not null,
  status text default 'pending' check (status in ('pending','matched','cancelled')),
  created_at timestamptz default now(),
  constraint different_majors check (current_major_id != target_major_id)
);

create unique index one_active_request_per_user
  on exchange_requests(user_id)
  where status = 'pending';

-- ===== Match groups (supports 2-way and 3-way cycles) =====
create table match_groups (
  id uuid primary key default gen_random_uuid(),
  cycle_length int not null,
  matched_at timestamptz default now()
);

create table match_members (
  match_group_id uuid references match_groups(id) on delete cascade,
  request_id uuid references exchange_requests(id),
  position int not null,
  primary key (match_group_id, request_id)
);

-- ===== Matching function =====
create or replace function find_match(req_id uuid)
returns uuid
language plpgsql
as $$
declare
  my_req exchange_requests%rowtype;
  partner_id uuid;
  req_b exchange_requests%rowtype;
  req_c exchange_requests%rowtype;
  group_id uuid;
begin
  select * into my_req from exchange_requests where id = req_id and status = 'pending';
  if not found then
    return null;
  end if;

  -- 1. Direct 2-way swap
  select id into partner_id
  from exchange_requests
  where status = 'pending'
    and id != my_req.id
    and current_major_id = my_req.target_major_id
    and target_major_id = my_req.current_major_id
  order by created_at asc
  for update skip locked
  limit 1;

  if partner_id is not null then
    update exchange_requests set status = 'matched' where id in (my_req.id, partner_id);

    insert into match_groups (cycle_length) values (2) returning id into group_id;
    insert into match_members (match_group_id, request_id, position) values
      (group_id, my_req.id, 1),
      (group_id, partner_id, 2);

    return group_id;
  end if;

  -- 2. 3-way cycle: my_req(X->Y), req_b(Y->Z), req_c(Z->X)
  for req_b in
    select * from exchange_requests
    where status = 'pending'
      and id != my_req.id
      and current_major_id = my_req.target_major_id
    order by created_at asc
    for update skip locked
  loop
    select * into req_c
    from exchange_requests
    where status = 'pending'
      and id not in (my_req.id, req_b.id)
      and current_major_id = req_b.target_major_id
      and target_major_id = my_req.current_major_id
    order by created_at asc
    for update skip locked
    limit 1;

    if found then
      update exchange_requests
        set status = 'matched'
        where id in (my_req.id, req_b.id, req_c.id);

      insert into match_groups (cycle_length) values (3) returning id into group_id;
      insert into match_members (match_group_id, request_id, position) values
        (group_id, my_req.id, 1),
        (group_id, req_b.id, 2),
        (group_id, req_c.id, 3);

      return group_id;
    end if;
  end loop;

  return null;
end;
$$;

-- ===== Trigger: auto-match on insert =====
create or replace function trigger_find_match()
returns trigger as $$
begin
  perform find_match(new.id);
  return new;
end;
$$ language plpgsql;

create trigger after_request_insert
after insert on exchange_requests
for each row execute function trigger_find_match();

-- ===== Safe cancel function (race-safe against matching) =====
create or replace function cancel_request(req_id uuid, requester uuid)
returns text
language plpgsql
as $$
declare
  updated_rows int;
begin
  update exchange_requests
    set status = 'cancelled'
    where id = req_id
      and user_id = requester
      and status = 'pending';

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    return 'already_matched_or_not_found';
  end if;

  return 'cancelled';
end;
$$;

-- ===== Row Level Security =====
alter table profiles enable row level security;
alter table exchange_requests enable row level security;
alter table match_groups enable row level security;
alter table match_members enable row level security;
alter table majors enable row level security;

create policy "majors are readable by everyone"
  on majors for select using (true);

create policy "users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "users insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "users read own requests"
  on exchange_requests for select using (auth.uid() = user_id);

create policy "users insert own requests"
  on exchange_requests for insert with check (auth.uid() = user_id);

-- Members can see match groups they belong to
create policy "users read match groups they belong to"
  on match_groups for select using (
    exists (
      select 1 from match_members mm
      join exchange_requests er on er.id = mm.request_id
      where mm.match_group_id = match_groups.id
        and er.user_id = auth.uid()
    )
  );

create policy "users read match members of their groups"
  on match_members for select using (
    exists (
      select 1 from exchange_requests er
      where er.id = match_members.request_id
        and er.user_id = auth.uid()
    )
    or
    exists (
      select 1 from match_members mm2
      join exchange_requests er2 on er2.id = mm2.request_id
      where mm2.match_group_id = match_members.match_group_id
        and er2.user_id = auth.uid()
    )
  );

-- Enable realtime
alter publication supabase_realtime add table exchange_requests;
alter publication supabase_realtime add table match_members;
