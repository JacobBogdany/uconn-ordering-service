"""Manual check of supabase/migrations/20261117120000_checkout.sql on a throwaway Postgres.

Not collected by pytest (no test_ prefix). Needs: pip install pgserver "psycopg[binary]".
Run: python backend/tests/verify_checkout_sql.py
Covers: atomic debit, idempotent replay, stale price/availability, missing required
option, insufficient balance (nothing charged/inserted), concurrent pickup codes,
same-key races, and an overdraw race. Stubs the Supabase-only auth schema/roles.
"""
import pgserver, sys, json, tempfile, pathlib, threading
R=pathlib.Path(__file__).resolve().parents[2]
d=tempfile.mkdtemp()
pg=pgserver.get_server(d, cleanup_mode='stop')
def run(sql, *a):
    return pg.psql(sql)
stub="""
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema extensions; create schema auth;
create function extensions.gen_random_uuid() returns uuid language sql as 'select gen_random_uuid()';
create table auth.users(id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
 email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
 confirmation_token text, recovery_token text, email_change_token_new text, email_change text, is_sso_user boolean, is_anonymous boolean);
create function auth.uid() returns uuid language sql as 'select null::uuid';
"""
print(run(stub))
for f in [R/"supabase/migrations/20261110120000_initial_schema.sql", R/"supabase/seed.sql", R/"supabase/migrations/20261117120000_checkout.sql"]:
    out=run(f.read_text()); print(f.name, "->", out[-300:] if out else "ok")

import psycopg
uri=pg.get_uri()
def conn(): return psycopg.connect(uri, autocommit=False)
def call(c, user, loc, key, lines):
    try:
        with c.cursor() as cur:
            cur.execute("select public.place_order(%s,%s,%s,%s::jsonb)", (user,loc,key,json.dumps(lines)))
            r=cur.fetchone()[0]; c.commit(); return ("ok", r)
    except psycopg.errors.Error as e:
        c.rollback(); return ("err", e.diag.sqlstate, e.diag.message_primary, e.diag.message_detail, e.diag.message_hint)
c=conn(); cur=c.cursor()
STU="00000000-0000-4000-8000-000000000001"
cur.execute("select id,slug from locations"); locs={s:i for i,s in cur.fetchall()}
cur.execute("""select m.id,m.name,m.base_price,m.location_id,m.is_available from menu_items m order by m.name"""); items=cur.fetchall()
cur.execute("""select g.menu_item_id,g.id,g.name,g.is_required,g.min_select,g.max_select,o.id,o.name,o.price_delta from modifier_groups g join modifier_options o on o.group_id=g.id order by g.menu_item_id,g.sort_order,o.sort_order""")
mods=cur.fetchall()
print(len(items),"items",len(mods),"options")
req=[m for m in mods if m[3]][:3]; print("required samples",req)
mid=req[0][0]
cur.execute("select name,base_price,location_id from menu_items where id=%s",(mid,)); nm,base,loc=cur.fetchone()
cur.execute("select id from locations where id=%s",(loc,))
opt=req[0][6]; delta=req[0][8]
unit=base+delta
cur.execute("select huskybucks_balance from profiles where id=%s",(STU,)); b0=cur.fetchone()[0]; c.commit()
print("balance0",b0,"item",nm,"unit",unit)
line={"menu_item_id":str(mid),"quantity":2,"selected_option_ids":[str(opt)],"notes":"  extra   ice ","unit_price":float(unit)}
r=call(c,STU,str(loc),"key-0001-aaaa",[line]); print("ORDER",json.dumps(r[1],indent=1) if r[0]=="ok" else r)
r2=call(c,STU,str(loc),"key-0001-aaaa",[line]); print("REPLAY replayed=",r2[1]["replayed"], r2[1]["order_id"]==r[1]["order_id"], r2[1]["balance"])
cur.execute("select huskybucks_balance from profiles where id=%s",(STU,)); print("balance after", cur.fetchone()[0], "expected", b0-2*unit); c.commit()
cur.execute("select count(*) from orders"); print("orders",cur.fetchone()[0]); c.commit()
# wrong price (stale)
bad=dict(line, unit_price=float(unit)+1); print("stale price", call(c,STU,str(loc),"key-0002-aaaa",[bad]))
# missing required option
nop=dict(line, selected_option_ids=[]); print("missing required", call(c,STU,str(loc),"key-0003-aaaa",[nop]))
# insufficient
big=dict(line, quantity=20); big["unit_price"]=float(unit)
print("insufficient", call(c,STU,str(loc),"key-0004-aaaa",[big]*5))
# unavailable item
cur.execute("update menu_items set is_available=false where id=%s",(mid,)); c.commit()
print("unavailable", call(c,STU,str(loc),"key-0005-aaaa",[line]))
cur.execute("update menu_items set is_available=true where id=%s",(mid,)); c.commit()
cur.execute("select huskybucks_balance from profiles where id=%s",(STU,)); print("balance unchanged", cur.fetchone()[0]); c.commit()
cur.execute("select count(*) from orders"); print("orders still",cur.fetchone()[0]); c.commit()
# pickup codes sequential, and concurrency: 6 threads, distinct keys, plus 6 threads same key
single=dict(line, quantity=1)
res=[]
def worker(k):
    cc=conn(); res.append(call(cc,STU,str(loc),k,[single])); cc.close()
ts=[threading.Thread(target=worker,args=(f"conc-key-{i:04d}",)) for i in range(6)]
[t.start() for t in ts]; [t.join() for t in ts]
codes=sorted(x[1]["pickup_code"] for x in res if x[0]=="ok"); print("concurrent codes",codes, [x for x in res if x[0]!="ok"])
res=[]
ts=[threading.Thread(target=worker,args=("same-key-0001",)) for i in range(6)]
[t.start() for t in ts]; [t.join() for t in ts]
print("same key ids", {x[1]["order_id"] for x in res if x[0]=="ok"}.__len__(), "replayed flags", sorted(x[1]["replayed"] for x in res if x[0]=="ok"))
cur.execute("select count(*), sum(total_amount) from orders"); n,t=cur.fetchone(); cur.execute("select huskybucks_balance from profiles where id=%s",(STU,)); b=cur.fetchone()[0]
print("orders",n,"sum",t,"balance",b,"consistent", b0-t==b); c.commit()
# overdraw race: set balance to 1 unit, two parallel orders of 1 unit with different keys
cur.execute("update profiles set huskybucks_balance=%s where id=%s",(unit,STU)); c.commit()
res=[]
ts=[threading.Thread(target=worker,args=(f"race-key-{i:04d}",)) for i in range(4)]
single2=dict(line, quantity=1)
[t.start() for t in ts]; [t.join() for t in ts]
print("race oks", sum(1 for x in res if x[0]=="ok"), [x[2] for x in res if x[0]!="ok"])
cur.execute("select huskybucks_balance from profiles where id=%s",(STU,)); print("final balance",cur.fetchone()[0]); c.commit()
