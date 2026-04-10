#!/usr/bin/env python3
"""
Migração v2: viniimoveis (MySQL) → viniun_sistema (Supabase)
Usa REST API com service key para evitar problemas de encoding.
"""
import subprocess, json, urllib.request, urllib.error, sys

MYSQL_CMD = "/Applications/XAMPP/xamppfiles/bin/mysql"
MYSQL_ARGS = ["-h", "br58-cp.valueserver.com.br", "-u", "p000104_lecimove", "-pMkt@310809", "p000104_lecimoveis", "-N", "--default-character-set=utf8"]
SUPABASE = "https://supabase.viniun.com.br"
SK = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NDkwMDgwMCwiZXhwIjo0OTMwNTc0NDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.QTxwodH12TivsqI5vrZJzVfH7i0oI_5u2c1GczpCTJ4"
TID = "6049d76c-0d18-4112-a33f-a85d37a6da18"

def mysql(sql):
    r = subprocess.run([MYSQL_CMD] + MYSQL_ARGS + ["-e", sql], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        print(f"  MySQL ERR: {r.stderr[:100]}")
        return []
    return [line.split("\t") for line in r.stdout.strip().split("\n") if line]

def rest_insert(table, rows, batch=50):
    total = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        data = json.dumps(chunk, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            f"{SUPABASE}/rest/v1/{table}",
            data=data,
            headers={"Content-Type": "application/json", "apikey": SK, "Authorization": f"Bearer {SK}", "Prefer": "return=minimal"},
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=30)
            total += len(chunk)
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:200]
            print(f"  REST ERR at {i}: {e.code} {body}")
        except Exception as e:
            print(f"  ERR at {i}: {e}")
    return total

def val(row, idx, default=None):
    if idx >= len(row): return default
    v = row[idx].strip()
    return default if v in ("\\N", "NULL", "") else v

def num(row, idx, default=None):
    v = val(row, idx)
    if v is None: return default
    try: return float(v) if "." in v else int(v)
    except: return default

def flag(row, idx):
    v = val(row, idx, "")
    return v.lower() in ("sim", "s", "1", "yes", "true")

# ═══════════════════════════════════════════
print("=== 1. LOCALIZAÇÕES ===")
for tipo in ["estado", "cidade", "bairro"]:
    col = f"id_{tipo if tipo != 'bairro' else 'bairro'}"
    rows = mysql(f"SELECT DISTINCT id_{tipo if tipo != 'bairro' else 'bairro'} FROM imoveis WHERE id_{tipo if tipo != 'bairro' else 'bairro'} IS NOT NULL AND id_{tipo if tipo != 'bairro' else 'bairro'} != '' AND CHAR_LENGTH(id_{tipo if tipo != 'bairro' else 'bairro'}) > 1")
    items = []
    for r in rows:
        nome = r[0].strip()
        if nome:
            item = {"tenant_id": TID, "tipo": tipo, "nome": nome}
            if tipo == "estado" and len(nome) == 2:
                item["uf"] = nome.upper()
            items.append(item)
    n = rest_insert("mt_locations", items)
    print(f"  {tipo}: {n}")

# ═══════════════════════════════════════════
print("\n=== 2. CONSTRUTORAS ===")
rows = mysql("SELECT id, nome, email, telefone, responsavel, site, endereco, numero, bairro, cep, cidade, estado FROM construtoras ORDER BY id")
items = []
for r in rows:
    if val(r, 1):
        items.append({"tenant_id": TID, "legacy_id": num(r, 0), "nome": val(r, 1), "email": val(r, 2), "telefone": val(r, 3), "responsavel": val(r, 4), "site": val(r, 5), "endereco": val(r, 6), "numero": val(r, 7), "bairro": val(r, 8), "cep": val(r, 9), "cidade": val(r, 10), "estado": val(r, 11)})
n = rest_insert("mt_construtoras", items)
print(f"  Construtoras: {n}")

# ═══════════════════════════════════════════
print("\n=== 3. PROPRIETÁRIOS ===")
rows = mysql("SELECT id, nome, email, telefone, telefone2, celular, end, numero, complemento, cep, bairro, cnpj_cpf, ins_est_rg, observacao FROM proprietario WHERE nome IS NOT NULL AND nome != '' ORDER BY id")
items = []
for r in rows:
    if val(r, 1):
        items.append({"tenant_id": TID, "legacy_id": num(r, 0), "nome": val(r, 1), "email": val(r, 2), "telefone": val(r, 3), "telefone2": val(r, 4), "celular": val(r, 5), "endereco": val(r, 6), "numero": val(r, 7), "complemento": val(r, 8), "cep": val(r, 9), "bairro": val(r, 10), "cpf_cnpj": val(r, 11), "rg_inscricao_estadual": val(r, 12), "observacao": val(r, 13), "status": "ativo"})
n = rest_insert("mt_property_owners", items, batch=30)
print(f"  Proprietários: {n}")

# ═══════════════════════════════════════════
print("\n=== 4. CAPTADORES ===")
rows = mysql("SELECT id, nome, email, telefone, celular FROM captador ORDER BY id")
items = [{"tenant_id": TID, "legacy_id": num(r, 0), "nome": val(r, 1), "email": val(r, 2), "telefone": val(r, 3), "celular": val(r, 4)} for r in rows if val(r, 1)]
n = rest_insert("mt_captadores", items)
print(f"  Captadores: {n}")

# ═══════════════════════════════════════════
print("\n=== 5. CLIENTES ===")
rows = mysql("SELECT id, nome, email, telefone, telefone2, celular, end, numero, complemento, cep, bairro, cnpj_cpf, observacao FROM clientes WHERE nome IS NOT NULL AND nome != '' ORDER BY id")
items = []
for r in rows:
    if val(r, 1):
        items.append({"tenant_id": TID, "legacy_id": num(r, 0), "nome": val(r, 1), "email": val(r, 2), "telefone": val(r, 3), "telefone2": val(r, 4), "celular": val(r, 5), "endereco": val(r, 6), "numero": val(r, 7), "complemento": val(r, 8), "cep": val(r, 9), "bairro": val(r, 10), "cpf_cnpj": val(r, 11), "observacao": val(r, 12), "status": "ativo"})
n = rest_insert("mt_property_clients", items, batch=30)
print(f"  Clientes: {n}")

# ═══════════════════════════════════════════
print("\n=== 6. FEATURES ===")
for tbl, cat, col in [("caracteristicas", "caracteristica", "caracteristicas"), ("proximidades", "proximidade", "proximidades"), ("acabamento", "acabamento", "acabamento")]:
    rows = mysql(f"SELECT {col} FROM {tbl} WHERE {col} IS NOT NULL AND {col} != '' ORDER BY {col}")
    items = [{"tenant_id": TID, "categoria": cat, "nome": r[0].strip()} for r in rows if r[0].strip()]
    n = rest_insert("mt_property_features", items)
    print(f"  {tbl}: {n}")

# ═══════════════════════════════════════════
print("\n=== 7. FOTOS (86k registros) ===")
# Primeiro buscar mapeamento legacy_id -> uuid
prop_map = {}
offset = 0
while True:
    rows_pg = mysql(f"SELECT legacy_id FROM mt_properties WHERE tenant_id='{TID}' AND legacy_id IS NOT NULL LIMIT 1")
    break  # Skip para pegar via pg/query

# Usar pg/query para buscar o mapa
import urllib.parse
pg_data = json.dumps({"query": f"SELECT id, legacy_id FROM mt_properties WHERE tenant_id='{TID}' AND legacy_id IS NOT NULL"}).encode()
req = urllib.request.Request(f"{SUPABASE}/pg/query", data=pg_data, headers={"Content-Type": "application/json", "apikey": SK, "Authorization": f"Bearer {SK}"})
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        for p in json.loads(resp.read()):
            prop_map[str(p["legacy_id"])] = p["id"]
except Exception as e:
    print(f"  WARN: Não conseguiu mapa de imóveis: {e}")

print(f"  Mapa: {len(prop_map)} imóveis")

if prop_map:
    total_fotos = 0
    offset = 0
    while True:
        rows = mysql(f"SELECT id_fotos, id_imovel, nm_foto, ds_foto, ordemfoto FROM fotosimovel ORDER BY id_fotos LIMIT 500 OFFSET {offset}")
        if not rows:
            break
        items = []
        for r in rows:
            prop_id = prop_map.get(r[1].strip())
            if not prop_id:
                continue
            nm = val(r, 2, "")
            imovel_ref = r[1].strip()
            items.append({
                "tenant_id": TID,
                "property_id": prop_id,
                "url": f"https://viniimoveis.com.br/fotos/ref-{imovel_ref}/ampliada/{nm}",
                "thumbnail_url": f"https://viniimoveis.com.br/fotos/ref-{imovel_ref}/thumb/{nm}",
                "descricao": val(r, 3),
                "ordem": num(r, 4, 0),
                "legacy_filename": nm,
            })
        if items:
            n = rest_insert("mt_property_photos", items, batch=100)
            total_fotos += n
        offset += 500
        if offset % 5000 == 0:
            print(f"  Progresso: {offset} processados, {total_fotos} inseridos")
    print(f"  TOTAL FOTOS: {total_fotos}")

# ═══════════════════════════════════════════
print("\n=== 8. CONSULTAS/LEADS ===")
rows = mysql("SELECT id_contador, ref_imovel, forma_contato, mensagem, como_conheceu, data_contato FROM contador ORDER BY id_contador")
items = []
for r in rows:
    items.append({
        "tenant_id": TID,
        "tipo": "consulta",
        "forma_contato": val(r, 2),
        "mensagem": val(r, 3),
        "como_conheceu": val(r, 4),
        "created_at": val(r, 5),
        "status": "novo",
    })
n = rest_insert("mt_property_inquiries", items, batch=50)
print(f"  Consultas: {n}")

# ═══════════════════════════════════════════
print("\n=== VERIFICAÇÃO FINAL ===")
pg_data = json.dumps({"query": f"""
    SELECT 'mt_locations' as t, COUNT(*) as c FROM mt_locations WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_property_types', COUNT(*) FROM mt_property_types WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_property_purposes', COUNT(*) FROM mt_property_purposes WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_property_features', COUNT(*) FROM mt_property_features WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_construtoras', COUNT(*) FROM mt_construtoras WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_property_owners', COUNT(*) FROM mt_property_owners WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_captadores', COUNT(*) FROM mt_captadores WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_corretores', COUNT(*) FROM mt_corretores WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_property_clients', COUNT(*) FROM mt_property_clients WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_properties', COUNT(*) FROM mt_properties WHERE tenant_id='{TID}' AND deleted_at IS NULL
    UNION ALL SELECT 'mt_property_photos', COUNT(*) FROM mt_property_photos WHERE tenant_id='{TID}'
    UNION ALL SELECT 'mt_property_inquiries', COUNT(*) FROM mt_property_inquiries WHERE tenant_id='{TID}'
    ORDER BY t
"""}).encode()
req = urllib.request.Request(f"{SUPABASE}/pg/query", data=pg_data, headers={"Content-Type": "application/json", "apikey": SK, "Authorization": f"Bearer {SK}"})
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        for row in json.loads(resp.read()):
            print(f"  {row['t']}: {row['c']}")
except Exception as e:
    print(f"  ERR: {e}")

print("\n✅ MIGRAÇÃO V2 COMPLETA!")
