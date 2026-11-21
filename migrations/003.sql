ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type text default 'Sole proprietorship';
CREATE TABLE IF NOT EXISTS memberships(bid integer not null references businesses(id),uid integer not null references users(id),role text not null,primary key(bid,uid));
INSERT INTO memberships(bid,uid,role) SELECT id,owner,'owner' FROM businesses ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS media(id serial primary key,bid integer not null references businesses(id),kind text not null,record_id integer not null,mime text not null,bytes bytea not null,unique(bid,kind,record_id));
CREATE TABLE IF NOT EXISTS applications(id serial primary key,bid integer not null references businesses(id),lender text not null,purpose text not null,amount bigint not null,status text not null default 'Draft',created timestamptz default now());
CREATE TABLE IF NOT EXISTS operation_keys(bid integer not null references businesses(id),key uuid not null,digest text not null,result jsonb not null,primary key(bid,key));
