#!/usr/bin/env python3
"""Converte a apostila "Gestão justa de equipes e escalas" em blocos nativos, sem executar conteúdo do DOCX."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
URL = re.compile(r"(https?://\S+)")

# Ordem e carga do "Roteiro e carga horária" da apostila (12 h).
MODULES = {
    1: ("modulo-1-papel-gerencial-e-principios-de-equipe", 75),
    2: ("modulo-2-organizacao-operacional-e-prioridades", 75),
    3: ("modulo-3-planejamento-e-construcao-de-escalas", 120),
    4: ("modulo-4-comunicacao-justica-e-gestao-de-mudancas", 90),
    5: ("modulo-5-delegacao-desempenho-e-feedback", 90),
    6: ("modulo-6-saude-mental-e-prevencao-de-riscos-psicossociais", 120),
    7: ("modulo-7-conflitos-integracao-e-retencao", 75),
    8: ("modulo-8-indicadores-simulacao-e-plano-de-30-dias", 75),
}
CHECKLIST_SECTIONS = ("Lista de verificação da escala", "Checklist diário do líder", "Checklist semanal de gestão")


def plain(element):
    return "".join(node.text or "" for node in element.iter(W + "t")).strip()


def normalize(text):
    return re.sub(r"\s+", " ", text).strip()


def inlines(paragraph):
    result = []
    for run in paragraph.iter(W + "r"):
        text = "".join((n.text or "") if n.tag == W + "t" else "\n" if n.tag in (W + "br", W + "cr") else "\t" if n.tag == W + "tab" else "" for n in run)
        if not text:
            continue
        props = run.find(W + "rPr")
        marks = []
        if props is not None:
            for tag, mark in [("b", "bold"), ("i", "italic"), ("u", "underline")]:
                prop = props.find(W + tag)
                if prop is not None and prop.get(W + "val") not in ("0", "false", "none"):
                    marks.append(mark)
        # URLs escritas no texto das referências viram links seguros.
        for piece in URL.split(text):
            if not piece:
                continue
            if URL.fullmatch(piece):
                result.append({"kind": "link", "text": piece, "href": piece})
            else:
                result.append({"kind": "text", "text": piece, **({"marks": marks} if marks else {})})
    return result


def table(element, original):
    rows = []
    for row in element.findall(W + "tr"):
        cells = []
        for cell in row.findall(W + "tc"):
            if cell.find(W + "tcPr/" + W + "vMerge") is not None:
                raise ValueError("Tabela com mesclagem vertical exige revisão.")
            texts = []
            for paragraph in cell.findall(W + "p"):
                if plain(paragraph):
                    original.append(plain(paragraph))
                    if texts:
                        texts.append({"kind": "text", "text": "\n"})
                    texts.extend(inlines(paragraph))
            span = cell.find(W + "tcPr/" + W + "gridSpan")
            cells.append({"text": texts, **({"colSpan": int(span.get(W + "val"))} if span is not None else {})})
        rows.append(cells)
    for cell in rows[0]:
        cell["header"] = True
    return {"type": "table", "header": [rows[0]], "rows": rows[1:]}


def convert(source, target):
    source_bytes = source.read_bytes()
    with zipfile.ZipFile(source) as archive:
        if any(n.startswith("word/media/") for n in archive.namelist()):
            raise ValueError("A apostila contém mídia: trate os arquivos antes de importar.")
        body = ET.fromstring(archive.read("word/document.xml")).find(W + "body")

    # 1) Lê a apostila como capítulos (Heading1) com seções (Heading2) e blocos.
    chapters = []
    cover = {"title": "Capa", "sections": [{"title": "Gestão justa de equipes e escalas", "blocks": []}]}
    chapter, section = cover, cover["sections"][0]
    original = []
    title = ""
    tables = 0
    for index, element in enumerate(body):
        if element.tag == W + "tbl":
            tables += 1
            block = table(element, original)
            block["id"] = f"gje-b-{index}"
            section["blocks"].append(block)
            continue
        if element.tag != W + "p":
            continue
        text = plain(element)
        if not text:
            continue
        original.append(text)
        style = element.find(W + "pPr/" + W + "pStyle")
        style = style.get(W + "val") if style is not None else "Normal"
        if style == "Title":
            title = text
            continue
        if style == "Heading1":
            chapter = {"title": text, "sections": [{"title": "", "blocks": []}]}
            chapters.append(chapter)
            section = chapter["sections"][0]
            continue
        if style == "Heading2":
            section = {"title": text, "blocks": []}
            chapter["sections"].append(section)
            continue
        if style == "ListBullet":
            last = section["blocks"][-1] if section["blocks"] else None
            if not last or last["type"] != "list":
                list_style = "check" if section["title"] in CHECKLIST_SECTIONS or chapter["title"] in CHECKLIST_SECTIONS else "bullet"
                last = {"id": f"gje-b-{index}", "type": "list", "style": list_style, "items": []}
                section["blocks"].append(last)
            last["items"].append({"text": inlines(element)})
            continue
        if style != "Normal":
            raise ValueError(f"Estilo não previsto: {style} ({text[:40]})")
        if text.startswith("Objetivo:"):
            section["blocks"].append({"id": f"gje-b-{index}", "type": "callout", "variant": "destaque", "title": "Objetivo do módulo", "blocks": [{"id": f"gje-b-{index}-p", "type": "paragraph", "text": inlines(element)}]})
        elif text.startswith("O que evitar:") or text.startswith("A má organização da escala"):
            section["blocks"].append({"id": f"gje-b-{index}", "type": "callout", "variant": "atencao", "blocks": [{"id": f"gje-b-{index}-p", "type": "paragraph", "text": inlines(element)}]})
        else:
            section["blocks"].append({"id": f"gje-b-{index}", "type": "paragraph", "text": inlines(element)})

    by_title = {c["title"]: c for c in chapters}

    def sections(chapter, prefix=None, first_title=None):
        out = []
        for i, s in enumerate(chapter["sections"]):
            if not s["blocks"]:
                continue
            name = s["title"] or first_title or chapter["title"]
            out.append({"id": f"gje-s-{slug_id(chapter['title'])}-{i}", "kind": "section", "title": f"{prefix}{name}" if prefix else name, "blocks": s["blocks"]})
        return out

    def topic(slug, title, kind, minutes, secs, number=None):
        t = {"title": title, "slug": slug, "kind": kind, "durationMinutes": minutes, "document": {"schemaVersion": 2, "title": title, "sections": secs}}
        if number:
            t["moduleNumber"] = number
        return t

    topics = []
    intro = sections(cover, first_title="Sobre o curso") + sections(by_title["Apresentação"], first_title="Apresentação")
    topics.append(topic("apresentacao", "Apresentação do curso", "introduction", 0, intro))
    special = next(c for c in chapters if c["title"].startswith("Área especial"))
    for number, (slug, minutes) in MODULES.items():
        chapter = next(c for c in chapters if c["title"].startswith(f"Módulo {number} |"))
        name = chapter["title"].split("|", 1)[1].strip()
        secs = sections(chapter, first_title="Objetivo")
        if number == 6:
            # A "Área especial" da apostila fundamenta o Módulo 6 (2 h de saúde mental e descanso).
            secs = sections(special, prefix="Área especial · ", first_title=special["title"].split("|", 1)[1].strip()) + secs
        if number == 8:
            secs += sections(by_title["Plano de aplicação em 30 dias"], first_title="Plano de aplicação em 30 dias")
        topics.append(topic(slug, f"Módulo {number} — {name}", "module", minutes, secs, number))
    module3 = next(c for c in chapters if c["title"].startswith("Módulo 3 |"))
    kit = [s for s in module3["sections"] if s["title"] in ("Modelo de quadro semanal", "Lista de verificação da escala")]
    tools = [{"id": f"gje-s-kit-{i}", "kind": "section", "title": f"{s['title']} (Módulo 3)", "blocks": s["blocks"]} for i, s in enumerate(kit)]
    tools += sections(by_title["Plano de aplicação em 30 dias"], first_title="Plano de aplicação em 30 dias")
    tools += sections(by_title["Checklist diário do líder"], first_title="Checklist diário do líder")
    tools += sections(by_title["Checklist semanal de gestão"], first_title="Checklist semanal de gestão")
    topics.append(topic("ferramentas-de-aplicacao", "Ferramentas de aplicação: escala, plano de 30 dias e checklists", "resource", 0, tools))
    closing = sections(by_title["Avaliação e conclusão"], first_title="Avaliação e conclusão") + sections(by_title["Fontes e leituras de referência"], first_title="Fontes e leituras de referência")
    topics.append(topic("avaliacao-e-fontes", "Avaliação, conclusão e fontes de referência", "resource", 0, closing))

    used = {"Apresentação", special["title"], "Plano de aplicação em 30 dias", "Checklist diário do líder", "Checklist semanal de gestão", "Avaliação e conclusão", "Fontes e leituras de referência"} | {c["title"] for c in chapters if c["title"].startswith("Módulo ")}
    unused = [c["title"] for c in chapters if c["title"] not in used]
    if unused:
        raise ValueError(f"Capítulos não mapeados: {unused}")
    assert len([t for t in topics if t["kind"] == "module"]) == 8
    assert sum(t["durationMinutes"] for t in topics) == 12 * 60
    assert tables == 5

    def flat(value):
        if isinstance(value, dict):
            if value.get("kind") in ("text", "link"):
                return value["text"]
            return " ".join(flat(v) for k, v in value.items() if k not in ("id", "type", "kind", "variant", "style"))
        if isinstance(value, list):
            return ("" if value and all(isinstance(v, dict) and v.get("kind") in ("text", "link") for v in value) else " ").join(flat(v) for v in value)
        return value if isinstance(value, str) else ""

    combined = normalize(title + " " + " ".join(c["title"] for c in chapters) + " " + flat(topics))
    missing = [p for p in original if normalize(p) not in combined]
    if missing:
        raise ValueError(f"Texto perdido na conversão: {missing[:3]}")

    result = {"source": {"fileName": "source.docx", "title": title, "sha256": hashlib.sha256(source_bytes).hexdigest(), "paragraphs": len(original), "tables": tables}, "topics": topics}
    target.mkdir(parents=True, exist_ok=True)
    (target / "lessons.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    outline = {
        "title": "Gestão justa de equipes e escalas",
        "slug": "gestao-justa-de-equipes-e-escalas",
        "segment": {"name": "Gestão e Pessoas", "slug": "gestao-e-pessoas"},
        "hours": 12,
        "topics": [{k: v for k, v in t.items() if k != "document"} for t in topics],
    }
    (target / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=2) + "\n")
    print(f"Importado: {len(topics)} capítulos, 8 módulos, 12 h, {tables} tabelas; {len(original)} parágrafos conferidos.")


def slug_id(text):
    return re.sub(r"[^a-z0-9]+", "", text.lower())[:12] or "x"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("content/courses/gestao-justa-de-equipes"))
    args = parser.parse_args()
    convert(args.source, args.output)
