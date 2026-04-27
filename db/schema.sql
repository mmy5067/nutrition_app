create table if not exists users (
  id bigserial primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  is_active boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamp not null default now()
);

create table if not exists meals (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  eaten_at timestamptz not null,
  meal_type varchar(32),
  note text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists ix_meals_user_id on meals(user_id);
create index if not exists ix_meals_eaten_at on meals(eaten_at);

create table if not exists meal_items (
  id bigserial primary key,
  meal_id bigint not null references meals(id) on delete cascade,
  name varchar(255) not null,
  quantity numeric(10, 2),
  unit varchar(32),
  calories numeric(10, 2),
  protein numeric(10, 2),
  fat numeric(10, 2),
  carbs numeric(10, 2),
  extra jsonb
);

create index if not exists ix_meal_items_meal_id on meal_items(meal_id);

create table if not exists user_profiles (
  id bigserial primary key,
  user_id bigint not null unique references users(id) on delete cascade,
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  body_fat_pct numeric(5, 2),
  birthday date,
  sex varchar(10),
  extra jsonb,
  updated_at timestamp not null default now()
);

create table if not exists day_summaries (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  date date not null,
  summary text not null,
  totals jsonb,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint uq_day_summary_user_date unique (user_id, date)
);

create index if not exists ix_day_summaries_user_id on day_summaries(user_id);
