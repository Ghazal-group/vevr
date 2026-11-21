CREATE TABLE IF NOT EXISTS users(id serial primary key,email text unique not null,password text not null,name text not null);
CREATE TABLE IF NOT EXISTS sessions(token text primary key,uid integer references users(id),expires timestamptz not null);
CREATE TABLE IF NOT EXISTS businesses(id serial primary key,owner integer not null references users(id),name text not null);
CREATE TABLE IF NOT EXISTS products(id serial primary key,bid integer not null references businesses(id),name text not null,price bigint not null check(price>=0),stock integer not null check(stock>=0));
CREATE TABLE IF NOT EXISTS ledger(id serial primary key,bid integer not null references businesses(id),kind text not null,description text not null,amount bigint not null check(amount>=0),product integer references products(id),qty integer,created timestamptz default now());
