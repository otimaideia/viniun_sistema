#!/usr/bin/env python3
"""
Migração v4: Dados faltantes com delay anti-rate-limit
Migra: localizações, construtoras, captadores, fotos, consultas
"""
import subprocess, json, urllib.request, time, sys

MYSQL_CMD = "/Applications/XAMPP/xamppfiles/bin/mysql"
MYSQL_ARGS = ["-h", "br58-cp.valueserver.com.br", "-u", "p000104_lecimove", "-pMkt@310809", "p000104_lecimoveis", "-N", "--default-character-set=utf8"]
SUPABASE = "https://supabase.viniun.com.br"
SK = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NDkwMDgwMCwiZXhwIjo0OTMwNTc0NDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.QTxwodH12TivsqI5vrZJzVfH7i0oI_5u2c1GczpCTJ4"
TID = "6049d76c-0d18-4112-a33f-a85d37a6da18"
DELAY = 1.5  # seconds between pg/query requests

def mysql(sql):
    r = subprocess.run([MYSQL_CMD] + MYSQL_ARGS + ["-e", sql], capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        print(f"  MySQL ERR: {r.stderr[:150]}")
        return []
    return [line.split("\t") for line in r.stdout.strip().split("\n") if line]

def pg(sql, retries=3):
    for attempt in range(retries):
        data = json.dumps({"query": sql}).encode("utf-8")
        req = urllib.request.Request(f"{SUPABASE}/pg/query", data=data,
            headers={"Content-Type": "application/json", "apikey": SK, "Authorization": f"Bearer {SK}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 403 and attempt < retries - 1:
                wait = DELAY * (attempt + 2)
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  PG ERR: {e.code}")
                return None
        except Exception as e:
            print(f"  PG ERR: {e}")
            return None
    return None

def esc(s):
    if s is None: return "NULL"
    s = str(s).replace("'", "''").replace("\\", "\\\\")
    return f"'{s}'"

def val(row, idx, default=None):
    if idx >= len(row): return default
    v = row[idx].strip()
    return default if v in ("\\N", "NULL", "") else v

def num(row, idx, default=0):
    v = val(row, idx)
    if v is None: return default
    try: return float(v) if "." in v else int(v)
    except: return default

# ═══════════════════════════════════════════
print("=== 1. LOCALIZAÇÕES (faltantes) ===")
time.sleep(3)
for tipo, col in [("estado", "id_estado"), ("cidade", "id_cidade"), ("bairro", "id_bairro")]:
    rows = mysql(f"SELECT DISTINCT {col} FROM imoveis WHERE {col} IS NOT NULL AND {col} != '' AND CHAR_LENGTH({col}) > 1")
    if not rows: continue
    values = []
    for r in rows:
        nome = r[0].strip()
        if not nome: continue
        uf_part = f", {esc(nome[:2].upper())}" if tipo == "estado" and len(nome) == 2 else ", NULL"
        values.append(f"({esc(TID)}, {esc(tipo)}, {esc(nome)}{uf_part})")
    for i in range(0, len(values), 30):
        chunk = values[i:i+30]
        pg(f"INSERT INTO mt_locations (tenant_id, tipo, nome, uf) VALUES {', '.join(chunk)} ON CONFLICT DO NOTHING")
        time.sleep(DELAY)
    print(f"  {tipo}: {len(values)}")

# ═══════════════════════════════════════════
print("\n=== 2. CONSTRUTORAS ===")
time.sleep(3)
rows = mysql("SELECT id, nome, email, telefone, responsavel, site FROM construtoras ORDER BY id")
values = []
for r in rows:
    nome = val(r, 1)
    if not nome: continue
    values.append(f"({esc(TID)}, {num(r,0)}, {esc(nome)}, {esc(val(r,2))}, {esc(val(r,3))}, {esc(val(r,4))}, {esc(val(r,5))})")
for i in range(0, len(values), 20):
    chunk = values[i:i+20]
    pg(f"INSERT INTO mt_construtoras (tenant_id, legacy_id, nome, email, telefone, responsavel, site) VALUES {', '.join(chunk)} ON CONFLICT DO NOTHING")
    time.sleep(DELAY)
print(f"  Construtoras: {len(values)}")

# ═══════════════════════════════════════════
print("\n=== 3. CAPTADORES ===")
time.sleep(3)
rows = mysql("SELECT id, nome, email, telefone, celular FROM captador ORDER BY id")
values = [f"({esc(TID)}, {num(r,0)}, {esc(val(r,1))}, {esc(val(r,2))}, {esc(val(r,3))}, {esc(val(r,4))})" for r in rows if val(r,1)]
if values:
    pg(f"INSERT INTO mt_captadores (tenant_id, legacy_id, nome, email, telefone, celular) VALUES {', '.join(values)} ON CONFLICT DO NOTHING")
print(f"  Captadores: {len(values)}")

# ═══════════════════════════════════════════
print("\n=== 4. CONSULTAS ===")
time.sleep(3)
rows = mysql("SELECT id_contador, forma_contato, SUBSTRING(mensagem,1,300), como_conheceu, data_contato FROM contador ORDER BY id_contador")
values = []
for r in rows:
    msg = val(r, 2)
    values.append(f"({esc(TID)}, 'consulta', {esc(val(r,1))}, {esc(msg)}, {esc(val(r,3))}, COALESCE({esc(val(r,4))}, NOW()), 'novo')")
for i in range(0, len(values), 30):
    chunk = values[i:i+30]
    pg(f"INSERT INTO mt_property_inquiries (tenant_id, tipo, forma_contato, mensagem, como_conheceu, created_at, status) VALUES {', '.join(chunk)} ON CONFLICT DO NOTHING")
    time.sleep(DELAY)
print(f"  Consultas: {len(values)}")

# ═══════════════════════════════════════════
print("\n=== 5. FOTOS (86k) ===")
time.sleep(5)

# Buscar mapa de imóveis com retry
prop_map = {}
for attempt in range(5):
    result = pg(f"SELECT id, legacy_id FROM mt_properties WHERE tenant_id='{TID}' AND legacy_id IS NOT NULL")
    if result and len(result) > 0:
        for p in result:
            prop_map[str(p["legacy_id"])] = p["id"]
        break
    time.sleep(3)

print(f"  Mapa: {len(prop_map)} imóveis")

if not prop_map:
    print("  SKIP: Sem mapa de imóveis, não pode migrar fotos")
else:
    total_fotos = 0
    offset = 0
    while True:
        rows = mysql(f"SELECT id_fotos, id_imovel, nm_foto, ds_foto, ordemfoto FROM fotosimovel ORDER BY id_fotos LIMIT 100 OFFSET {offset}")
        if not rows:
            break
        values = []
        for r in rows:
            prop_id = prop_map.get(r[1].strip())
            if not prop_id: continue
            nm = val(r, 2, "")
            iref = r[1].strip()
            url = f"https://viniimoveis.com.br/fotos/ref-{iref}/ampliada/{nm}"
            thumb = f"https://viniimoveis.com.br/fotos/ref-{iref}/thumb/{nm}"
            values.append(f"({esc(TID)}, {esc(prop_id)}, {esc(url)}, {esc(thumb)}, {esc(val(r,3))}, {num(r,4,0)}, {esc(nm)})")

        if values:
            for i in range(0, len(values), 30):
                chunk = values[i:i+30]
                pg(f"INSERT INTO mt_property_photos (tenant_id, property_id, url, thumbnail_url, descricao, ordem, legacy_filename) VALUES {', '.join(chunk)} ON CONFLICT DO NOTHING")
                time.sleep(DELAY)
            total_fotos += len(values)

        offset += 100
        if offset % 2000 == 0:
            print(f"  Progresso: {offset}, fotos: {total_fotos}")
            time.sleep(2)  # Extra pause every 2000

    print(f"  TOTAL FOTOS: {total_fotos}")

# ═══════════════════════════════════════════
print("\n=== VERIFICAÇÃO ===")
time.sleep(5)
result = pg(f"""
    SELECT 'locations' as t, COUNT(*) as c FROM mt_locations WHERE tenant_id='{TID}'
    UNION ALL SELECT 'construtoras', COUNT(*) FROM mt_construtoras WHERE tenant_id='{TID}'
    UNION ALL SELECT 'captadores', COUNT(*) FROM mt_captadores WHERE tenant_id='{TID}'
    UNION ALL SELECT 'owners', COUNT(*) FROM mt_property_owners WHERE tenant_id='{TID}'
    UNION ALL SELECT 'properties', COUNT(*) FROM mt_properties WHERE tenant_id='{TID}' AND deleted_at IS NULL
    UNION ALL SELECT 'photos', COUNT(*) FROM mt_property_photos WHERE tenant_id='{TID}'
    UNION ALL SELECT 'inquiries', COUNT(*) FROM mt_property_inquiries WHERE tenant_id='{TID}'
    UNION ALL SELECT 'clients', COUNT(*) FROM mt_property_clients WHERE tenant_id='{TID}'
    ORDER BY t
""")
if result:
    for row in result:
        print(f"  {row['t']}: {row['c']}")

print("\n✅ V4 COMPLETA!")
