#!/usr/bin/env python3
"""Converte a apostila fornecida em blocos nativos, sem executar conteúdo do DOCX."""
import argparse
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def slugify(text):
    plain = unicodedata.normalize("NFD", text)
    plain = "".join(c for c in plain if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", plain).strip("-")[:80].rstrip("-")


def plain(element):
    return "".join(node.text or "" for node in element.iter(W + "t")).strip()


def normalize(text):
    return re.sub(r"\s+", " ", text).strip()


def convert(source, target):
    source_bytes = source.read_bytes()
    with zipfile.ZipFile(source) as archive:
        if any(n.startswith("word/media/") for n in archive.namelist()):
            raise ValueError("A apostila contém mídia: trate os arquivos antes de importar.")
        body = ET.fromstring(archive.read("word/document.xml")).find(W + "body")
        rels = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        links = {r.attrib["Id"]: r.attrib.get("Target", "") for r in rels}
        numbering = ET.fromstring(archive.read("word/numbering.xml"))

    formats = {}
    abstracts = {}
    for abstract in numbering.findall(W + "abstractNum"):
        abstracts[abstract.get(W + "abstractNumId")] = {
            level.get(W + "ilvl"): level.find(W + "numFmt").get(W + "val")
            for level in abstract.findall(W + "lvl")
        }
    for num in numbering.findall(W + "num"):
        formats[num.get(W + "numId")] = abstracts[num.find(W + "abstractNumId").get(W + "val")]

    def inlines(paragraph):
        result = []
        for child in paragraph:
            if child.tag == W + "hyperlink":
                text = plain(child)
                href = links.get(child.get(R + "id"), "")
                result.append({"kind": "link", "text": text, "href": href} if re.match(r"^(https?://|mailto:|/)", href) else {"kind": "text", "text": text})
            elif child.tag == W + "r":
                text = "".join((n.text or "") if n.tag == W + "t" else "\n" if n.tag in (W + "br", W + "cr") else "\t" if n.tag == W + "tab" else "" for n in child)
                if not text:
                    continue
                props = child.find(W + "rPr")
                marks = []
                if props is not None:
                    for tag, mark in [("b", "bold"), ("i", "italic"), ("u", "underline")]:
                        prop = props.find(W + tag)
                        if prop is not None and prop.get(W + "val") not in ("0", "false", "none"):
                            marks.append(mark)
                    vertical = props.find(W + "vertAlign")
                    if vertical is not None and vertical.get(W + "val") in ("superscript", "subscript"):
                        marks.append("sup" if vertical.get(W + "val") == "superscript" else "sub")
                result.append({"kind": "text", "text": text, **({"marks": marks} if marks else {})})
        return result

    topics = []
    current = None
    section = None
    previous_list = None
    original_paragraphs = []
    byline = ""
    source_title = ""
    tables = 0
    questions = []
    answer_key = {}
    question_module = None
    bank = False

    def new_section(title, index):
        nonlocal section, previous_list
        section = {"id": f"ge-s-{index}", "kind": "section", "title": title, "blocks": []}
        current["document"]["sections"].append(section)
        previous_list = None

    def ensure_section(index):
        if section is None:
            new_section("Antes de começar", index)

    for index, element in enumerate(body):
        if element.tag == W + "p":
            text = plain(element)
            if not text:
                continue
            original_paragraphs.append(text)
            style = element.find(W + "pPr/" + W + "pStyle")
            style = style.get(W + "val") if style is not None else "Normal"
            if style == "Heading1":
                source_title = text
                continue
            if current is None and style != "Heading2":
                byline = text
                continue
            if style == "Heading2":
                match = re.fullmatch(r"Módulo (\d+) — (.+) \((\d+) h\)", text)
                if match:
                    number, name, hours = match.groups()
                    slug = slugify(f"modulo-{int(number):02d}-{name}")
                    kind, minutes = "module", int(hours) * 60
                elif text.startswith("Projeto Integrador"):
                    slug, kind, minutes = "projeto-integrador", "project", 22 * 60
                elif text.startswith("Apresentação"):
                    slug, kind, minutes = "apresentacao", "introduction", 0
                else:
                    appendix = re.match(r"Anexo ([A-F])", text).group(1)
                    slug = {"A": "glossario", "B": "banco-de-questoes", "C": "respostas-dos-exercicios", "D": "bibliografia", "E": "guia-da-equipe", "F": "fontes-e-observacoes"}[appendix]
                    kind, minutes = ("staff" if appendix == "E" else "resource"), 0
                current = {"title": text, "slug": slug, "kind": kind, "durationMinutes": minutes, "document": {"schemaVersion": 2, "title": text, "sections": []}}
                if match:
                    current["moduleNumber"] = int(match.group(1))
                topics.append(current)
                section, previous_list = None, None
                bank = slug == "banco-de-questoes"
                continue
            if style == "Heading3":
                new_section(text, index)
                continue
            ensure_section(index)
            if bank and re.fullmatch(r"Módulo \d+", text):
                question_module = int(text.split()[-1])
            num = element.find(W + "pPr/" + W + "numPr")
            if bank and num is not None and re.search(r"\(a\).+\(b\).+\(c\).+\(d\)", text):
                parts = re.split(r"\(([a-d])\)\s*", text)
                questions.append({"id": f"ge-q{len(questions) + 1:02d}", "moduleNumber": question_module, "prompt": parts[0].strip(), "options": [{"id": parts[i], "text": parts[i + 1].strip()} for i in range(1, len(parts), 2)]})
            if style == "Code":
                section["blocks"].append({"id": f"ge-b-{index}", "type": "code", "code": text})
                previous_list = None
            elif num is not None:
                num_id = num.find(W + "numId").get(W + "val")
                level = int(num.find(W + "ilvl").get(W + "val"))
                if level != 0:
                    raise ValueError("Lista multinível encontrada; preserve a hierarquia antes de importar.")
                style = "bullet" if formats[num_id][str(level)] == "bullet" else "ordered"
                if previous_list != (num_id, style):
                    section["blocks"].append({"id": f"ge-b-{index}", "type": "list", "style": style, "items": []})
                section["blocks"][-1]["items"].append({"text": inlines(element)})
                previous_list = (num_id, style)
            else:
                section["blocks"].append({"id": f"ge-b-{index}", "type": "paragraph", "text": inlines(element)})
                previous_list = None
        elif element.tag == W + "tbl":
            ensure_section(index)
            tables += 1
            rows = []
            for row in element.findall(W + "tr"):
                cells = []
                for cell in row.findall(W + "tc"):
                    if cell.find(W + "tcPr/" + W + "vMerge") is not None:
                        raise ValueError("Tabela com mesclagem vertical exige revisão.")
                    texts = []
                    for paragraph in cell.findall(W + "p"):
                        if texts:
                            texts.append({"kind": "text", "text": "\n"})
                        texts.extend(inlines(paragraph))
                        if plain(paragraph):
                            original_paragraphs.append(plain(paragraph))
                    span = cell.find(W + "tcPr/" + W + "gridSpan")
                    cells.append({"text": texts, **({"colSpan": int(span.get(W + "val"))} if span is not None else {})})
                rows.append(cells)
            section["blocks"].append({"id": f"ge-b-{index}", "type": "table", "header": [rows[0]], "rows": rows[1:]})
            if bank:
                for row in rows[1:]:
                    values = ["".join(n["text"] for n in cell["text"]).strip() for cell in row]
                    for i in range(0, len(values), 2):
                        answer_key[int(values[i])] = values[i + 1].lower()
            previous_list = None

    for index, question in enumerate(questions, 1):
        question["correctOption"] = answer_key[index]
        assert len(question["options"]) == 4
        assert question["correctOption"] in [option["id"] for option in question["options"]]
    assert len(questions) == 36 and len(answer_key) == 36
    assert len([t for t in topics if t["kind"] == "module"]) == 18
    assert sum(t["durationMinutes"] for t in topics) == 200 * 60
    assert tables == 57

    def flat(value):
        if isinstance(value, dict):
            if value.get("kind") in ("text", "link"):
                return value["text"]
            if "title" in value:
                return value["title"] + " " + " ".join(flat(v) for k, v in value.items() if k != "title")
            return " ".join(flat(v) for v in value.values())
        if isinstance(value, list):
            # Inline runs must remain adjacent, including bold runs inside a word.
            return ("" if value and all(isinstance(v, dict) and v.get("kind") in ("text", "link") for v in value) else " ").join(flat(v) for v in value)
        return value if isinstance(value, str) else ""

    combined = normalize(source_title + " " + byline + " " + flat(topics))
    missing = [p for p in original_paragraphs if normalize(p) not in combined]
    if missing:
        raise ValueError(f"Texto perdido na conversão: {missing[:3]}")
    result = {"source": {"fileName": source.name, "title": source_title, "byline": byline, "sha256": hashlib.sha256(source_bytes).hexdigest(), "paragraphs": len(original_paragraphs), "tables": tables}, "topics": [t for t in topics if t["kind"] != "staff"], "editorialNotes": [t for t in topics if t["kind"] == "staff"]}
    target.mkdir(parents=True, exist_ok=True)
    (target / "lessons.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (target / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n")
    outline = {"title": "Curso Livre de Gestão de Empresas", "slug": "gestao-de-empresas", "segment": {"name": "Gestão e Negócios", "slug": "gestao-e-negocios"}, "hours": 200, "topics": [{k: v for k, v in topic.items() if k != "document"} for topic in result["topics"]]}
    (target / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=2) + "\n")
    print(f"Importado: {len(result['topics'])} capítulos, 18 módulos, 200 h, {len(questions)} questões, {tables} tabelas; {len(original_paragraphs)} parágrafos conferidos.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("content/courses/gestao-de-empresas"))
    args = parser.parse_args()
    convert(args.source, args.output)
