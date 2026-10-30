"""Extrai a árvore de microtemas do Programa Detalhado oficial da CPA (PDF da ANBIMA) com a redação original.

Uso: python3 -I scripts/cpa-extrair-programa.py <programa.pdf> content/cpa/programa-oficial.json
Requer pdftotext (poppler). A numeração e o texto de cada item são preservados; linhas quebradas são unidas.
"""
import json, re, subprocess, sys

pdf, out = sys.argv[1], sys.argv[2]
text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
skip = re.compile(r"Data da elaboração|Vigência a partir|Programa detalhado • CPA|^\s*ANBIMA\s*$|^\s*\d+\s*$")
lines = [l.strip() for l in text.splitlines() if l.strip() and not skip.search(l)]
start = next(i for i, l in enumerate(lines) if re.match(r"^1\.\s*Estrutura e dinâmica do sistema financeiro nacional$", l))
lines = lines[start:]

macro_re = re.compile(r"^(\d)\.\s*([A-ZÀ-Ú].*)$")
item_re = re.compile(r"^((?:\d+\.)+\d+)\.?\s+(.*)$")
weight_re = re.compile(r"^Proporção:\s*(\d+)%")

macros, items, cur = [], [], None
for l in lines:
    if m := weight_re.match(l):
        macros[-1]["peso"] = int(m.group(1)); cur = None; continue
    if (m := item_re.match(l)):
        cur = {"codigo": m.group(1), "texto": m.group(2).strip()}
        items.append(cur); continue
    if (m := macro_re.match(l)) and not item_re.match(l):
        macros.append({"codigo": m.group(1), "titulo": m.group(2).strip(), "peso": None}); cur = None; continue
    if cur is not None:
        cur["texto"] += " " + l
    elif macros and macros[-1]["peso"] is None:
        macros[-1]["titulo"] += " " + l

for it in items:
    it["texto"] = re.sub(r"\s+", " ", it["texto"]).strip()
    it["nivel"] = it["codigo"].count(".") + 1
    it["macro"] = it["codigo"].split(".")[0]
    it["pai"] = ".".join(it["codigo"].split(".")[:-1]) or None
codes = {it["codigo"] for it in items}
for it in items:
    it["folha"] = not any(c.startswith(it["codigo"] + ".") for c in codes)

doc = {
    "fonte": "ANBIMA — Programa Detalhado CPA (Certificado Profissional Anbima)",
    "url": "https://www.anbima.com.br/data/files/6A/52/6F/A1/BED73910B07B2739B82BA2A8/Programa-Detalhado-CPA-ANBIMA.pdf",
    "versao": "1.2 (revisado em 04/06/2025)",
    "elaboracao": "2024-09-02",
    "vigencia": "2026-01-01",
    "conferido_em": __import__("datetime").date.today().isoformat(),
    "macrotemas": macros,
    "itens": items,
}
json.dump(doc, open(out, "w"), ensure_ascii=False, indent=1)
print(f"{len(macros)} macrotemas, {len(items)} itens, {sum(i['folha'] for i in items)} folhas")
for m in macros: print(m)
