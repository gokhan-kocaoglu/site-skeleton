---
name: graphify
description: Kod tabanı, mimari, dosya ilişkileri veya proje içeriği hakkındaki HER soru için kullan — özellikle graphify-out/ varsa soru önce graphify sorgusu olarak ele alınır. Her girdiyi (kod, doküman, PDF, görsel) kalıcı bir bilgi grafına çevirir; query/path/explain araçları sunar.
---

# /graphify

Bir klasörü gezinilebilir bilgi grafına çevirir. Üç çıktı: interaktif HTML,
GraphRAG-hazır JSON (`graph.json`) ve düz dilli `GRAPH_REPORT.md`.
Tüm çıktılar `graphify-out/` altındadır (gitignore'lu).

> **Paket adı:** PyPI paketi `graphifyy` (çift y — upstream README'den
> doğrulandı; diğer `graphify*` paketleri ilgisizdir). CLI komutu `graphify`.
> **PowerShell notu:** `/graphify .` değil `graphify .` yazın — baştaki `/`
> PowerShell'de yol ayracıdır. Aşağıdaki bloklar Bash aracıyla çalıştırılır.

## Kullanım

```
/graphify                          # tüm pipeline, mevcut dizin
/graphify <path>                   # tüm pipeline, belirli yol
/graphify <path> --mode deep       # derin çıkarım, daha zengin INFERRED kenarlar
/graphify <path> --update          # artımlı — yalnız yeni/değişen dosyalar
/graphify <path> --cluster-only    # mevcut grafta kümelenmeyi yenile
/graphify <path> --directed        # yönlü graf (kaynak→hedef korunur)
/graphify <path> --no-viz          # görselleştirmeyi atla
/graphify <path> --svg|--graphml|--neo4j|--falkordb|--wiki|--mcp   # ek exportlar
/graphify query "<soru>"           # BFS geziş — geniş bağlam
/graphify query "<soru>" --dfs     # DFS — belirli bir yolu izle
/graphify query "<soru>" --budget 1500
/graphify path "AuthModule" "Database"    # iki kavram arası en kısa yol
/graphify explain "CouponService"         # tek düğümün düz dilli açıklaması
```

Upstream'in GitHub-URL klonlama, video transkripsiyon, `add <url>` ve
`--watch` akışları bu uyarlamaya dahil edilmedi; gerekirse
`graphify install --project` ile resmi skill kurulur.

## Çağrıldığında Yapılacaklar

**Hızlı yol — mevcut graf:** Başka her şeyden önce `graphify-out/graph.json`
var mı bak (proje köküne göre). Varsa VE istek kod tabanı hakkında doğal
dilli bir soruysa ("X nasıl çalışır?", "Y'yi kim çağırır?") ve açık bir
yeniden-kurma komutu değilse (`--update`, `--cluster-only`, çıplak yol):
**1–5. adımları tamamen atla, doğrudan `references/query.md`'ye geç** ve
`graphify query "<soru>"` çalıştır. Graf zaten kurulu — kullan.

Yol verilmemişse `.` kullan; kullanıcıya yol sorma. Adımları sırayla izle.

### Adım 1 — Kurulum garantisi

```bash
PYTHON=""
GRAPHIFY_BIN=$(which graphify 2>/dev/null)
if [ -z "$PYTHON" ] && command -v uv >/dev/null 2>&1; then
    _UV_PY=$(uv tool run graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null)
    if [ -n "$_UV_PY" ]; then PYTHON="$_UV_PY"; fi
fi
if [ -z "$PYTHON" ] && [ -n "$GRAPHIFY_BIN" ]; then
    _SHEBANG=$(head -1 "$GRAPHIFY_BIN" | tr -d '#!')
    case "$_SHEBANG" in
        *[!a-zA-Z0-9/_.-]*) ;;
        *) "$_SHEBANG" -c "import graphify" 2>/dev/null && PYTHON="$_SHEBANG" ;;
    esac
fi
if [ -z "$PYTHON" ]; then PYTHON="python3"; fi
if ! "$PYTHON" -c "import graphify" 2>/dev/null; then
    if command -v uv >/dev/null 2>&1; then
        uv tool install --upgrade graphifyy -q 2>&1 | tail -3
        _UV_PY=$(uv tool run graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null)
        if [ -n "$_UV_PY" ]; then PYTHON="$_UV_PY"; fi
    else
        "$PYTHON" -m pip install graphifyy -q 2>/dev/null \
          || "$PYTHON" -m pip install graphifyy -q --break-system-packages 2>&1 | tail -3
    fi
fi
mkdir -p graphify-out
"$PYTHON" -c "import sys; open('graphify-out/.graphify_python', 'w', encoding='utf-8').write(sys.executable)"
echo "$(cd INPUT_PATH && pwd)" > graphify-out/.graphify_root
```

Import başarılıysa hiçbir şey yazdırma, Adım 2'ye geç. **Sonraki her bash
bloğunda `python3` yerine `$(cat graphify-out/.graphify_python)` kullan.**

### Adım 2 — Dosya tespiti

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.detect import detect
from pathlib import Path
result = detect(Path('INPUT_PATH'))
print(json.dumps(result, ensure_ascii=False))
" > graphify-out/.graphify_detect.json
```

INPUT_PATH'i gerçek yolla değiştir. JSON'u yazdırma; temiz özet sun
(kategori başına dosya sayısı; 0 olanları atla). Sonra:
- `total_files` 0 ise: "Desteklenen dosya yok" deyip dur.
- `skipped_sensitive` doluysa: yalnız sayıyı söyle, dosya adlarını değil.
- `total_words` > 2.000.000 VEYA `total_files` > 500 ise: uyarı göster,
  ilk-seviye alt dizinleri dosya sayısına göre sırala, ilk 5'i sun ve
  hangi alt klasörde çalışılacağını sor.
- Aksi halde Adım 3'e geç.

### Adım 3 — Varlık ve ilişki çıkarımı

İki bölüm: **yapısal (AST — deterministik, ücretsiz)** ve **semantik
(LLM — yalnız doc/paper/görsel için)**. İkisini paralel başlat.

> **graphify API anahtarı İSTEMEZ; anahtar için asla durma.** Kod AST ile
> anahtarsız çıkarılır — yalnız-kod corpus (bu repoda tipik durum) semantik
> çıkarımı tamamen atlar. Semantik çıkarım `GEMINI_API_KEY`/`GOOGLE_API_KEY`
> zaten set ise Gemini'yi kullanır; değilse host ajanın kendisi LLM'dir.
> `ANTHROPIC_API_KEY` veya başka sağlayıcı anahtarı OKUNMAZ.

**Bölüm A — AST (kod dosyaları)**:

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.extract import collect_files, extract
from pathlib import Path

code_files = []
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
for f in detect.get('files', {}).get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

if code_files:
    result = extract(code_files, cache_root=Path('INPUT_PATH'))
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding=\"utf-8\")
    print(f'AST: {len(result[\"nodes\"])} nodes, {len(result[\"edges\"])} edges')
else:
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps({'nodes':[],'edges':[],'input_tokens':0,'output_tokens':0}, ensure_ascii=False), encoding=\"utf-8\")
    print('No code files - skipping AST extraction')
"
```

**Bölüm B — Semantik (doc/paper/görsel)**:

Tespit 0 doc + 0 paper + 0 görsel bulduysa (yalnız-kod corpus) Bölüm B'yi
tamamen atla; önce boş semantik dosyayı yaz (C'nin merge girdisi):

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps({'nodes':[],'edges':[],'hyperedges':[],'input_tokens':0,'output_tokens':0}), encoding='utf-8')
"
```

Doc/paper/görsel VARSA:
1. Önce cache'i kontrol et: `graphify.cache.check_semantic_cache` ile
   cache'li dosyaları ayır (`.graphify_cached.json` + `.graphify_uncached.txt`).
2. Cache'lenmemiş dosyaları 20–25'lik parçalara böl (her görsel kendi
   parçasında; aynı dizindekiler aynı parçada).
3. **Agent aracıyla TÜM parçaları TEK mesajda paralel gönder**
   (`subagent_type="general-purpose"` — Explore salt-okunurdur, chunk dosyası
   yazamaz). Her alt-ajana `references/extraction-spec.md` içindeki prompt'u
   FILE_LIST/CHUNK_NUM/TOTAL_CHUNKS/DEEP_MODE/CHUNK_PATH doldurulmuş halde
   birebir ver; sonuç mutlak yollu `graphify-out/.graphify_chunk_NN.json`'a
   yazılır.
4. Tüm parçaları bekle; diskte var + geçerli JSON ise dahil et ve cache'e
   kaydet (`save_semantic_cache`); yarısından çoğu kayıpsa dur ve
   general-purpose ile yeniden çalıştırılmasını söyle.
5. cache + yeni sonuçları `graphify-out/.graphify_semantic.json`'a birleştir
   (id bazında dedup); geçici dosyaları temizle.

**Bölüm C — AST + semantik birleşimi**:

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from pathlib import Path

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding=\"utf-8\"))
sem = json.loads(Path('graphify-out/.graphify_semantic.json').read_text(encoding=\"utf-8\"))

seen = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem['nodes']:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])

merged = {
    'nodes': merged_nodes,
    'edges': ast['edges'] + sem['edges'],
    'hyperedges': sem.get('hyperedges', []),
    'input_tokens': sem.get('input_tokens', 0),
    'output_tokens': sem.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Merged: {len(merged_nodes)} nodes, {len(merged[\"edges\"])} edges')
"
```

### Adım 4 — Graf kurma, kümeleme, analiz

`IS_DIRECTED`'ı `--directed` verildiyse `True`, yoksa `False` yap
(INPUT_PATH gibi yerine koy — literal bırakma):

```bash
mkdir -p graphify-out
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))

G = build_from_json(extraction, root='INPUT_PATH', directed=IS_DIRECTED)
if G.number_of_nodes() == 0:
    print('ERROR: Graph is empty - extraction produced no nodes.')
    raise SystemExit(1)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}
questions = suggest_questions(G, communities, labels)

wrote = to_json(G, communities, 'graphify-out/graph.json')
if not wrote:
    print('ERROR: refused to shrink graphify-out/graph.json (existing graph has more nodes).')
    raise SystemExit(1)
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'INPUT_PATH', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods, 'surprises': surprises, 'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')
"
```

`ERROR: Graph is empty` basılırsa dur ve kullanıcıya bildir.

**Sağlık kontrolü (salt-okunur):** `graphify.diagnostics.diagnose_extraction`
ile sarkan/eksik uçlu ve çökmüş kenarları raporla; uyarı çıkarsa final
özette görünür kıl (durma — dürüstlük kuralı).

### Adım 5 — Toplulukları adlandır

`.graphify_analysis.json`'daki her topluluk için düğüm etiketlerine bakarak
2–5 kelimelik düz dilli ad yaz; sonra raporu gerçek etiketlerle yeniden
üret ve `.graphify_labels.json`'a kaydet (Adım 4'teki `generate` çağrısının
aynısı, `labels = LABELS_DICT` ile).

### Adım 6 — HTML çıktı

```bash
graphify export html   # >5000 düğümde otomatik topluluk görünümü
```

Ek exportlar (`--wiki`, `--neo4j`, `--falkordb`, `--svg`, `--graphml`,
`--mcp`) ve token benchmark'ı yalnız kendi bayraklarıyla:
`references/exports.md`.

### Adım 9 — Manifest, maliyet, temizlik, rapor

`graphify.detect.save_manifest` ile manifesti kaydet (root='INPUT_PATH'),
`graphify-out/cost.json`'a bu koşunun token sayımını ekle; sonra geçici
dosyaları sil:

```bash
rm -f graphify-out/.graphify_detect.json graphify-out/.graphify_extract.json graphify-out/.graphify_ast.json graphify-out/.graphify_semantic.json graphify-out/.graphify_analysis.json
find graphify-out -maxdepth 1 -name '.graphify_chunk_*.json' -delete 2>/dev/null
```

Kullanıcıya çıktı listesini bildir (graph.html, GRAPH_REPORT.md, graph.json),
rapordan yalnız **God Nodes**, **Surprising Connections** ve **Suggested
Questions** bölümlerini yapıştır (tam raporu değil), sonra en ilginç soruyu
seçip "İzlememi ister misin?" diye sor. Graf haritadır; pipeline bittikten
sonra görevin rehberlik.

---

## Alt Komutlar

- **`query` / `path` / `explain`** → `references/query.md` (kısıtlı sorgu
  genişletme + BFS/DFS geziş + NetworkX fallback + save-result döngüsü)
- **`--update` / `--cluster-only`** → `references/update.md`
- **Ek exportlar + benchmark** → `references/exports.md`
- **Commit hook'u + CLAUDE.md entegrasyonu** → `references/hooks.md`

Alt komutlardan önce `.graphify_python` yoksa Adım 1'deki interpreter
çözümlemesini yeniden çalıştır.

## Dürüstlük Kuralları

- Kenar UYDURMA; emin değilsen AMBIGUOUS işaretle.
- Corpus boyut uyarısını asla atlama.
- Token maliyetini raporda her zaman göster.
- Cohesion skorlarını sembole gizleme — ham sayıyı ver.
- 5.000+ düğümlü grafta kullanıcıyı uyarmadan HTML görselleştirme çalıştırma.
