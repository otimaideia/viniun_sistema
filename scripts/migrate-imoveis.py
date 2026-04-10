#!/usr/bin/env python3
"""
Script de migração: viniimoveis (MySQL) → viniun_sistema (Supabase/PostgreSQL)
Migra todos os dados do sistema legado para o multi-tenant.
"""

import subprocess
import json
import sys
import urllib.request
import urllib.parse

# Configuração
MYSQL_CMD = "/Applications/XAMPP/xamppfiles/bin/mysql"
MYSQL_HOST = "br58-cp.valueserver.com.br"
MYSQL_USER = "p000104_lecimove"
MYSQL_PASS = "Mkt@310809"
MYSQL_DB = "p000104_lecimoveis"

SUPABASE_URL = "https://supabase.viniun.com.br"
SERVICE_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NDkwMDgwMCwiZXhwIjo0OTMwNTc0NDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.QTxwodH12TivsqI5vrZJzVfH7i0oI_5u2c1GczpCTJ4"
TENANT_ID = "6049d76c-0d18-4112-a33f-a85d37a6da18"


def mysql_query(sql):
    """Execute MySQL query and return rows as list of dicts"""
    cmd = [MYSQL_CMD, f"-h{MYSQL_HOST}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", MYSQL_DB, "-N", "-e", sql]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f"  MySQL ERROR: {result.stderr[:200]}")
        return []
    rows = []
    for line in result.stdout.strip().split("\n"):
        if line:
            rows.append(line.split("\t"))
    return rows


def supabase_sql(sql):
    """Execute SQL on Supabase via pg/query"""
    data = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/pg/query",
        data=data,
        headers={
            "Content-Type": "application/json",
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except Exception as e:
        print(f"  Supabase ERROR: {e}")
        return None


def escape_sql(s):
    """Escape single quotes for SQL"""
    if s is None or s == "NULL" or s == "\\N":
        return None
    return s.replace("'", "''").replace("\\", "\\\\")


def batch_insert(table, rows, batch_size=50):
    """Insert rows in batches"""
    total = len(rows)
    inserted = 0
    for i in range(0, total, batch_size):
        batch = rows[i : i + batch_size]
        if not batch:
            continue
        # Build multi-row INSERT
        cols = list(batch[0].keys())
        values_list = []
        for row in batch:
            vals = []
            for col in cols:
                v = row[col]
                if v is None:
                    vals.append("NULL")
                elif isinstance(v, bool):
                    vals.append("true" if v else "false")
                elif isinstance(v, (int, float)):
                    vals.append(str(v))
                else:
                    vals.append(f"'{escape_sql(str(v))}'")
            values_list.append(f"({', '.join(vals)})")

        sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES {', '.join(values_list)} ON CONFLICT DO NOTHING"
        result = supabase_sql(sql)
        if result is not None and isinstance(result, dict) and "error" in result:
            print(f"  Batch error at {i}: {str(result['error'])[:200]}")
        else:
            inserted += len(batch)

    return inserted


# ═══════════════════════════════════════════
# MIGRAÇÃO
# ═══════════════════════════════════════════

def migrate_locations():
    print("\n=== 1. LOCALIZAÇÕES ===")

    # Estados
    rows = mysql_query("SELECT DISTINCT id_estado FROM imoveis WHERE id_estado IS NOT NULL AND id_estado != '' AND CHAR_LENGTH(id_estado) >= 2")
    estados = []
    for r in rows:
        nome = r[0].strip()
        if nome:
            uf = nome[:2].upper() if len(nome) == 2 else None
            estados.append({"tenant_id": TENANT_ID, "tipo": "estado", "nome": nome, "uf": uf})
    n = batch_insert("mt_locations", estados)
    print(f"  Estados: {n} inseridos")

    # Cidades
    rows = mysql_query("SELECT DISTINCT id_cidade FROM imoveis WHERE id_cidade IS NOT NULL AND id_cidade != '' AND CHAR_LENGTH(id_cidade) > 1")
    cidades = [{"tenant_id": TENANT_ID, "tipo": "cidade", "nome": r[0].strip()} for r in rows if r[0].strip()]
    n = batch_insert("mt_locations", cidades)
    print(f"  Cidades: {n} inseridas")

    # Bairros
    rows = mysql_query("SELECT DISTINCT id_bairro FROM imoveis WHERE id_bairro IS NOT NULL AND id_bairro != '' AND CHAR_LENGTH(id_bairro) > 1")
    bairros = [{"tenant_id": TENANT_ID, "tipo": "bairro", "nome": r[0].strip()} for r in rows if r[0].strip()]
    n = batch_insert("mt_locations", bairros)
    print(f"  Bairros: {n} inseridos")


def migrate_types():
    print("\n=== 2. TIPOS DE IMÓVEL ===")
    rows = mysql_query("SELECT id_tipoImovel, tipoimovel FROM tipoimovel WHERE tipoimovel IS NOT NULL AND tipoimovel != '' ORDER BY id_tipoImovel")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "codigo": f"legacy_{r[0]}",
                "nome": r[1].strip(),
                "ordem": int(r[0]) if r[0].isdigit() else 0,
            })
    n = batch_insert("mt_property_types", items)
    print(f"  Tipos: {n} inseridos")


def migrate_purposes():
    print("\n=== 3. FINALIDADES ===")
    rows = mysql_query("SELECT id_finalidade, finalidade FROM finalidade WHERE finalidade IS NOT NULL AND finalidade != '' ORDER BY id_finalidade")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "codigo": f"legacy_{r[0]}",
                "nome": r[1].strip(),
                "ordem": int(r[0]) if r[0].isdigit() else 0,
            })
    n = batch_insert("mt_property_purposes", items)
    print(f"  Finalidades: {n} inseridas")


def migrate_features():
    print("\n=== 4. CARACTERÍSTICAS / PROXIMIDADES / ACABAMENTOS ===")
    for table, cat in [("caracteristicas", "caracteristica"), ("proximidades", "proximidade"), ("acabamento", "acabamento")]:
        rows = mysql_query(f"SELECT nome FROM {table} WHERE nome IS NOT NULL AND nome != '' ORDER BY nome")
        items = [{"tenant_id": TENANT_ID, "categoria": cat, "nome": r[0].strip()} for r in rows if r[0].strip()]
        n = batch_insert("mt_property_features", items)
        print(f"  {table}: {n} inseridos")


def migrate_construtoras():
    print("\n=== 5. CONSTRUTORAS ===")
    rows = mysql_query("SELECT id, nome, email, telefone, responsavel, site, endereco, numero, complemento, bairro, cep, cidade, estado FROM construtoras ORDER BY id")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "legacy_id": int(r[0]) if r[0].isdigit() else None,
                "nome": r[1].strip(),
                "email": r[2] if len(r) > 2 and r[2] != "\\N" else None,
                "telefone": r[3] if len(r) > 3 and r[3] != "\\N" else None,
                "responsavel": r[4] if len(r) > 4 and r[4] != "\\N" else None,
                "site": r[5] if len(r) > 5 and r[5] != "\\N" else None,
                "endereco": r[6] if len(r) > 6 and r[6] != "\\N" else None,
                "numero": r[7] if len(r) > 7 and r[7] != "\\N" else None,
                "complemento": r[8] if len(r) > 8 and r[8] != "\\N" else None,
                "bairro": r[9] if len(r) > 9 and r[9] != "\\N" else None,
                "cep": r[10] if len(r) > 10 and r[10] != "\\N" else None,
                "cidade": r[11] if len(r) > 11 and r[11] != "\\N" else None,
                "estado": r[12] if len(r) > 12 and r[12] != "\\N" else None,
            })
    n = batch_insert("mt_construtoras", items)
    print(f"  Construtoras: {n} inseridas")


def migrate_proprietarios():
    print("\n=== 6. PROPRIETÁRIOS ===")
    rows = mysql_query("SELECT id, nome, email, telefone, telefone2, celular, end, numero, complemento, cep, bairro, cnpjCpf, insEstRg, observacao, status FROM proprietario ORDER BY id")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "legacy_id": int(r[0]) if r[0].isdigit() else None,
                "nome": r[1].strip(),
                "email": r[2] if len(r) > 2 and r[2] not in ("\\N", "") else None,
                "telefone": r[3] if len(r) > 3 and r[3] not in ("\\N", "") else None,
                "telefone2": r[4] if len(r) > 4 and r[4] not in ("\\N", "") else None,
                "celular": r[5] if len(r) > 5 and r[5] not in ("\\N", "") else None,
                "endereco": r[6] if len(r) > 6 and r[6] not in ("\\N", "") else None,
                "numero": r[7] if len(r) > 7 and r[7] not in ("\\N", "") else None,
                "complemento": r[8] if len(r) > 8 and r[8] not in ("\\N", "") else None,
                "cep": r[9] if len(r) > 9 and r[9] not in ("\\N", "") else None,
                "bairro": r[10] if len(r) > 10 and r[10] not in ("\\N", "") else None,
                "cpf_cnpj": r[11] if len(r) > 11 and r[11] not in ("\\N", "") else None,
                "rg_inscricao_estadual": r[12] if len(r) > 12 and r[12] not in ("\\N", "") else None,
                "observacao": r[13] if len(r) > 13 and r[13] not in ("\\N", "") else None,
                "status": "ativo" if len(r) <= 14 or r[14] in ("1", "\\N", "") else "inativo",
            })
    n = batch_insert("mt_property_owners", items, batch_size=30)
    print(f"  Proprietários: {n} inseridos")


def migrate_captadores():
    print("\n=== 7. CAPTADORES ===")
    rows = mysql_query("SELECT id, nome, email, telefone, celular FROM captador ORDER BY id")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "legacy_id": int(r[0]) if r[0].isdigit() else None,
                "nome": r[1].strip(),
                "email": r[2] if len(r) > 2 and r[2] not in ("\\N", "") else None,
                "telefone": r[3] if len(r) > 3 and r[3] not in ("\\N", "") else None,
                "celular": r[4] if len(r) > 4 and r[4] not in ("\\N", "") else None,
            })
    n = batch_insert("mt_captadores", items)
    print(f"  Captadores: {n} inseridos")


def migrate_corretores():
    print("\n=== 8. CORRETORES ===")
    rows = mysql_query("SELECT idCorretor, nomeCorretor, email, telefone, celular FROM corretor ORDER BY idCorretor")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "legacy_id": int(r[0]) if r[0].isdigit() else None,
                "nome": r[1].strip(),
                "email": r[2] if len(r) > 2 and r[2] not in ("\\N", "") else None,
                "telefone": r[3] if len(r) > 3 and r[3] not in ("\\N", "") else None,
                "celular": r[4] if len(r) > 4 and r[4] not in ("\\N", "") else None,
            })
    n = batch_insert("mt_corretores", items)
    print(f"  Corretores: {n} inseridos")


def migrate_properties():
    print("\n=== 9. IMÓVEIS (5.639 registros) ===")

    # Buscar mapeamento de IDs
    location_map = {}
    loc_result = supabase_sql(f"SELECT id, tipo, nome FROM mt_locations WHERE tenant_id = '{TENANT_ID}'")
    if loc_result:
        for loc in loc_result:
            location_map[(loc["tipo"], loc["nome"])] = loc["id"]

    type_map = {}
    type_result = supabase_sql(f"SELECT id, codigo FROM mt_property_types WHERE tenant_id = '{TENANT_ID}'")
    if type_result:
        for t in type_result:
            type_map[t["codigo"]] = t["id"]

    purpose_map = {}
    purp_result = supabase_sql(f"SELECT id, codigo FROM mt_property_purposes WHERE tenant_id = '{TENANT_ID}'")
    if purp_result:
        for p in purp_result:
            purpose_map[p["codigo"]] = p["id"]

    owner_map = {}
    owner_result = supabase_sql(f"SELECT id, legacy_id FROM mt_property_owners WHERE tenant_id = '{TENANT_ID}' AND legacy_id IS NOT NULL")
    if owner_result:
        for o in owner_result:
            owner_map[str(o["legacy_id"])] = o["id"]

    captador_map = {}
    cap_result = supabase_sql(f"SELECT id, legacy_id FROM mt_captadores WHERE tenant_id = '{TENANT_ID}' AND legacy_id IS NOT NULL")
    if cap_result:
        for c in cap_result:
            captador_map[str(c["legacy_id"])] = c["id"]

    print(f"  Mapas: {len(location_map)} locs, {len(type_map)} tipos, {len(purpose_map)} fins, {len(owner_map)} owners, {len(captador_map)} captadores")

    # Migrar em batches de 100
    total_migrated = 0
    offset = 0
    batch = 100

    while True:
        rows = mysql_query(f"""
            SELECT id_imovel, ref_imovel, id_tipoImovel, id_finalidade, id_proprietario, id_captador,
                   id_estado, id_cidade, id_bairro, end, numero, complemento, cep, ponto_referencia,
                   dormitorios, suite, banheiro, garagem, salas, dep_empregada,
                   area_construida, area_privada, area_terreno, area_total, area_util,
                   valor_venda, valor_locacao, valor_temporada, valor_iptu, valor_condominio,
                   aceita_financiamento, financiamento_caixa, financiamento_construtora,
                   situacao, disponibilidade, destaque, destaque_semana, lancamento,
                   mobiliado, semimobiliado, descricao, descricaointerna,
                   integ_seo_title, integ_seo_descricao, integ_palavra_chave,
                   foto_destaque, integ_youtube, data_cadastro, data_atualizacao
            FROM imoveis ORDER BY id_imovel LIMIT {batch} OFFSET {offset}
        """)

        if not rows:
            break

        items = []
        for r in rows:
            if len(r) < 10:
                continue

            def val(idx, default=None):
                if idx < len(r) and r[idx] not in ("\\N", "NULL", ""):
                    return r[idx].strip()
                return default

            def num(idx, default=None):
                v = val(idx)
                if v is None:
                    return default
                try:
                    return float(v) if "." in v else int(v)
                except:
                    return default

            def flag(idx):
                v = val(idx, "")
                return v.lower() in ("sim", "s", "1", "yes", "true")

            tipo_key = f"legacy_{val(2, '')}"
            purpose_key = f"legacy_{val(3, '')}"

            item = {
                "tenant_id": TENANT_ID,
                "legacy_id": num(0),
                "ref_code": val(1),
                "property_type_id": type_map.get(tipo_key),
                "purpose_id": purpose_map.get(purpose_key),
                "owner_id": owner_map.get(val(4)),
                "captador_id": captador_map.get(val(5)),
                "location_estado_id": location_map.get(("estado", val(6, ""))),
                "location_cidade_id": location_map.get(("cidade", val(7, ""))),
                "location_bairro_id": location_map.get(("bairro", val(8, ""))),
                "endereco": val(9),
                "numero": val(10),
                "complemento": val(11),
                "cep": val(12),
                "ponto_referencia": val(13),
                "dormitorios": num(14, 0),
                "suites": num(15, 0),
                "banheiros": num(16, 0),
                "garagens": num(17, 0),
                "salas": num(18, 0),
                "dep_empregada": num(19, 0),
                "area_construida": num(20),
                "area_privada": num(21),
                "area_terreno": num(22),
                "area_total": num(23),
                "area_util": num(24),
                "valor_venda": num(25),
                "valor_locacao": num(26),
                "valor_temporada": num(27),
                "valor_iptu": num(28),
                "valor_condominio": num(29),
                "aceita_financiamento": flag(30),
                "financiamento_caixa": flag(31),
                "financiamento_construtora": flag(32),
                "situacao": "disponivel" if flag(33) else "inativo",
                "disponibilidade": val(34),
                "destaque": flag(35),
                "destaque_semana": flag(36),
                "lancamento": flag(37),
                "mobiliado": flag(38),
                "semimobiliado": flag(39),
                "descricao": val(40),
                "descricao_interna": val(41),
                "seo_title": val(42),
                "seo_descricao": val(43),
                "seo_palavras_chave": val(44),
                "foto_destaque_url": val(45),
                "video_youtube_url": val(46),
                "created_at": val(47),
                "updated_at": val(48),
            }
            items.append(item)

        n = batch_insert("mt_properties", items, batch_size=20)
        total_migrated += n
        offset += batch
        print(f"  Batch {offset}: {n} inseridos (total: {total_migrated})")

    print(f"  TOTAL IMÓVEIS MIGRADOS: {total_migrated}")


def migrate_photos():
    print("\n=== 10. FOTOS (86.176 registros - apenas referências) ===")

    # Buscar mapeamento property legacy_id -> new id
    prop_map = {}
    prop_result = supabase_sql(f"SELECT id, legacy_id FROM mt_properties WHERE tenant_id = '{TENANT_ID}' AND legacy_id IS NOT NULL")
    if prop_result:
        for p in prop_result:
            prop_map[str(p["legacy_id"])] = p["id"]
    print(f"  Mapa de imóveis: {len(prop_map)} registros")

    total_migrated = 0
    offset = 0
    batch = 500

    while True:
        rows = mysql_query(f"SELECT id_fotos, idImovel, nmFoto, dsFoto, ordemfoto FROM fotosimovel ORDER BY id_fotos LIMIT {batch} OFFSET {offset}")
        if not rows:
            break

        items = []
        for r in rows:
            if len(r) < 3:
                continue
            prop_id = prop_map.get(r[1])
            if not prop_id:
                continue

            foto_name = r[2] if r[2] not in ("\\N", "") else ""
            base_url = f"https://viniimoveis.com.br/fotos/ref-{r[1]}/ampliada/{foto_name}"
            thumb_url = f"https://viniimoveis.com.br/fotos/ref-{r[1]}/thumb/{foto_name}"

            items.append({
                "tenant_id": TENANT_ID,
                "property_id": prop_id,
                "url": base_url,
                "thumbnail_url": thumb_url,
                "descricao": r[3] if len(r) > 3 and r[3] not in ("\\N", "") else None,
                "ordem": int(r[4]) if len(r) > 4 and r[4].isdigit() else 0,
                "legacy_filename": foto_name,
            })

        if items:
            n = batch_insert("mt_property_photos", items, batch_size=100)
            total_migrated += n

        offset += batch
        if offset % 5000 == 0:
            print(f"  Progresso: {offset} processados, {total_migrated} inseridos")

    print(f"  TOTAL FOTOS MIGRADAS: {total_migrated}")


def migrate_clients():
    print("\n=== 11. CLIENTES ===")
    rows = mysql_query("SELECT id, nome, email, telefone, telefone2, celular, end, numero, complemento, cep, bairro, cnpjCpf, observacao, status FROM clientes ORDER BY id")
    items = []
    for r in rows:
        if len(r) >= 2 and r[1].strip():
            items.append({
                "tenant_id": TENANT_ID,
                "legacy_id": int(r[0]) if r[0].isdigit() else None,
                "nome": r[1].strip(),
                "email": r[2] if len(r) > 2 and r[2] not in ("\\N", "") else None,
                "telefone": r[3] if len(r) > 3 and r[3] not in ("\\N", "") else None,
                "telefone2": r[4] if len(r) > 4 and r[4] not in ("\\N", "") else None,
                "celular": r[5] if len(r) > 5 and r[5] not in ("\\N", "") else None,
                "endereco": r[6] if len(r) > 6 and r[6] not in ("\\N", "") else None,
                "numero": r[7] if len(r) > 7 and r[7] not in ("\\N", "") else None,
                "complemento": r[8] if len(r) > 8 and r[8] not in ("\\N", "") else None,
                "cep": r[9] if len(r) > 9 and r[9] not in ("\\N", "") else None,
                "bairro": r[10] if len(r) > 10 and r[10] not in ("\\N", "") else None,
                "cpf_cnpj": r[11] if len(r) > 11 and r[11] not in ("\\N", "") else None,
                "observacao": r[12] if len(r) > 12 and r[12] not in ("\\N", "") else None,
                "status": "ativo",
            })
    n = batch_insert("mt_property_clients", items, batch_size=30)
    print(f"  Clientes: {n} inseridos")


def migrate_inquiries():
    print("\n=== 12. CONSULTAS/LEADS (contador) ===")

    prop_map = {}
    prop_result = supabase_sql(f"SELECT id, legacy_id FROM mt_properties WHERE tenant_id = '{TENANT_ID}' AND legacy_id IS NOT NULL")
    if prop_result:
        for p in prop_result:
            prop_map[str(p["legacy_id"])] = p["id"]

    rows = mysql_query("SELECT id_contador, idImovel, formaContato, mensagem, comoConheceu, dataContato FROM contador ORDER BY id_contador")
    items = []
    for r in rows:
        if len(r) < 2:
            continue
        prop_id = prop_map.get(r[1])
        items.append({
            "tenant_id": TENANT_ID,
            "property_id": prop_id,
            "tipo": "consulta",
            "forma_contato": r[2] if len(r) > 2 and r[2] not in ("\\N", "") else None,
            "mensagem": r[3] if len(r) > 3 and r[3] not in ("\\N", "") else None,
            "como_conheceu": r[4] if len(r) > 4 and r[4] not in ("\\N", "") else None,
            "created_at": r[5] if len(r) > 5 and r[5] not in ("\\N", "") else None,
            "status": "novo",
        })
    n = batch_insert("mt_property_inquiries", items, batch_size=50)
    print(f"  Consultas: {n} inseridas")


def verify():
    print("\n═══════════════════════════════════════")
    print("  VERIFICAÇÃO FINAL")
    print("═══════════════════════════════════════")
    result = supabase_sql(f"""
        SELECT 'mt_locations' as t, COUNT(*) as c FROM mt_locations WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_property_types', COUNT(*) FROM mt_property_types WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_property_purposes', COUNT(*) FROM mt_property_purposes WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_property_features', COUNT(*) FROM mt_property_features WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_construtoras', COUNT(*) FROM mt_construtoras WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_property_owners', COUNT(*) FROM mt_property_owners WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_captadores', COUNT(*) FROM mt_captadores WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_corretores', COUNT(*) FROM mt_corretores WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_properties', COUNT(*) FROM mt_properties WHERE tenant_id='{TENANT_ID}' AND deleted_at IS NULL
        UNION ALL SELECT 'mt_property_photos', COUNT(*) FROM mt_property_photos WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_property_clients', COUNT(*) FROM mt_property_clients WHERE tenant_id='{TENANT_ID}'
        UNION ALL SELECT 'mt_property_inquiries', COUNT(*) FROM mt_property_inquiries WHERE tenant_id='{TENANT_ID}'
        ORDER BY t
    """)
    if result:
        for row in result:
            print(f"  {row['t']}: {row['c']}")


# ═══════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════

if __name__ == "__main__":
    print("═══════════════════════════════════════")
    print("  MIGRAÇÃO: viniimoveis → viniun MT")
    print(f"  Tenant: {TENANT_ID}")
    print("═══════════════════════════════════════")

    migrate_locations()
    migrate_types()
    migrate_purposes()
    migrate_features()
    migrate_construtoras()
    migrate_proprietarios()
    migrate_captadores()
    migrate_corretores()
    migrate_properties()
    migrate_photos()
    migrate_clients()
    migrate_inquiries()
    verify()

    print("\n✅ MIGRAÇÃO COMPLETA!")
