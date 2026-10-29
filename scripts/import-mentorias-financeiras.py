#!/usr/bin/env python3
"""Converte as apostilas das mentorias financeiras (Médias: Markdown; Pequenas: DOCX) em blocos nativos.

Usa o AST JSON do pandoc (somente leitura do arquivo, sem executar conteúdo) e confere que nenhum texto
da apostila se perde na conversão. Uso:

  python3 scripts/import-mentorias-financeiras.py medias  content/courses/mentoria-financeira-medias/source.md
  python3 scripts/import-mentorias-financeiras.py pequenas content/courses/mentoria-financeira-pequenas/source.docx
"""
import argparse
import hashlib
import json
import re
import subprocess
import unicodedata
from pathlib import Path

URL = re.compile(r"(https?://\S+)")
OPTION = re.compile(r"^([A-D])\)\s*(.*)$", re.S)


def normalize(text):
    return re.sub(r"\s+", " ", text).strip()


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def pandoc(source, fmt):
    out = subprocess.run(["pandoc", "-f", fmt, "-t", "json", str(source)], check=True, capture_output=True, text=True)
    return json.loads(out.stdout)["blocks"]


class Converter:
    def __init__(self, prefix):
        self.prefix = prefix
        self.count = 0

    def id(self):
        self.count += 1
        return f"{self.prefix}-b-{self.count}"

    def inlines(self, items, marks=()):
        out = []

        def push(text, extra=()):
            m = sorted(set(marks) | set(extra))
            for piece in URL.split(text):
                if not piece:
                    continue
                if URL.fullmatch(piece):
                    out.append({"kind": "link", "text": piece, "href": piece})
                elif out and out[-1]["kind"] == "text" and out[-1].get("marks", []) == m:
                    out[-1]["text"] += piece
                else:
                    out.append({"kind": "text", "text": piece, **({"marks": m} if m else {})})

        for node in items:
            t, c = node["t"], node.get("c")
            if t == "Str":
                push(c)
            elif t in ("Space", "SoftBreak"):
                push(" ")
            elif t == "LineBreak":
                push("\n")
            elif t == "Strong":
                out.extend(self.inlines(c, (*marks, "bold")))
            elif t == "Emph":
                out.extend(self.inlines(c, (*marks, "italic")))
            elif t == "Underline":
                out.extend(self.inlines(c, (*marks, "underline")))
            elif t == "Superscript":
                out.extend(self.inlines(c, (*marks, "sup")))
            elif t == "Subscript":
                out.extend(self.inlines(c, (*marks, "sub")))
            elif t == "Code":
                push(c[1], ("code",))
            elif t == "Quoted":
                q = "“" if c[0]["t"] == "DoubleQuote" else "‘"
                push(q)
                out.extend(self.inlines(c[1], marks))
                push("”" if q == "“" else "’")
            elif t == "Link":
                text = plain(c[1])
                href = c[2][0]
                if href.startswith("https://") or href.startswith("http://"):
                    out.append({"kind": "link", "text": text, "href": href})
                else:
                    out.extend(self.inlines(c[1], marks))
            elif t == "Span":
                out.extend(self.inlines(c[1], marks))
            else:
                raise ValueError(f"Inline não previsto: {t}")
        # Funde trechos vizinhos com as mesmas marcas.
        merged = []
        for item in out:
            if merged and item["kind"] == "text" and merged[-1]["kind"] == "text" and merged[-1].get("marks") == item.get("marks"):
                merged[-1]["text"] += item["text"]
            else:
                merged.append(item)
        return merged

    def items(self, entries):
        result = []
        for entry in entries:
            text, children = [], []
            for block in entry:
                if block["t"] in ("Plain", "Para"):
                    if text:
                        text.append({"kind": "text", "text": "\n"})
                    text.extend(self.inlines(block["c"]))
                elif block["t"] in ("BulletList", "OrderedList"):
                    children.extend(self.items(block["c"] if block["t"] == "BulletList" else block["c"][1]))
                else:
                    raise ValueError(f"Bloco em lista não previsto: {block['t']}")
            result.append({"text": text, **({"children": children} if children else {})})
        return result

    def cell(self, cell, header=False):
        _, _, rowspan, colspan, blocks = cell
        text = []
        for block in blocks:
            if text:
                text.append({"kind": "text", "text": "\n"})
            text.extend(self.inlines(block["c"]))
        return {"text": text, **({"colSpan": colspan} if colspan > 1 else {}), **({"rowSpan": rowspan} if rowspan > 1 else {}), **({"header": True} if header else {})}

    def block(self, node):
        t, c = node["t"], node.get("c")
        if t in ("Para", "Plain"):
            return [{"id": self.id(), "type": "paragraph", "text": self.inlines(c)}]
        if t == "BulletList":
            return [{"id": self.id(), "type": "list", "style": "bullet", "items": self.items(c)}]
        if t == "OrderedList":
            return [{"id": self.id(), "type": "list", "style": "ordered", "items": self.items(c[1])}]
        if t == "Header":
            return [{"id": self.id(), "type": "heading", "level": min(4, max(2, c[0])), "text": self.inlines(c[2])}]
        if t == "HorizontalRule":
            return []
        if t == "Table":
            head = [[self.cell(cell, True) for cell in row[1]] for row in c[3][1]]
            rows = [[self.cell(cell) for cell in row[1]] for body in c[4] for row in body[2] + body[3]]
            return [{"id": self.id(), "type": "table", "header": head, "rows": rows}]
        if t == "BlockQuote":
            return [b for child in c for b in self.block(child)]
        raise ValueError(f"Bloco não previsto: {t}")


def plain(items):
    out = []
    for node in items:
        t, c = node["t"], node.get("c")
        if t == "Str":
            out.append(c)
        elif t in ("Space", "SoftBreak", "LineBreak"):
            out.append(" ")
        elif t in ("Strong", "Emph", "Underline", "Superscript", "Subscript"):
            out.append(plain(c))
        elif t == "Code":
            out.append(c[1])
        elif t == "Quoted":
            out.append(("“" if c[0]["t"] == "DoubleQuote" else "‘") + plain(c[1]) + ("”" if c[0]["t"] == "DoubleQuote" else "’"))
        elif t in ("Link", "Span"):
            out.append(plain(c[1]))
    return "".join(out)


def block_text(node):
    t, c = node["t"], node.get("c")
    if t in ("Para", "Plain"):
        return plain(c)
    if t == "Header":
        return plain(c[2])
    if t == "BulletList":
        return " ".join(block_text(b) for entry in c for b in entry)
    if t == "OrderedList":
        return " ".join(block_text(b) for entry in c[1] for b in entry)
    if t == "Table":
        cells = [cell for row in c[3][1] for cell in row[1]] + [cell for body in c[4] for row in body[2] + body[3] for cell in row[1]]
        return " ".join(block_text(b) for cell in cells for b in cell[4])
    if t == "BlockQuote":
        return " ".join(block_text(b) for b in c)
    return ""


def flat(value):
    if isinstance(value, dict):
        if value.get("kind") in ("text", "link"):
            return value["text"]
        return " ".join(flat(v) for k, v in value.items() if k not in ("id", "type", "kind", "variant", "style", "level", "slug", "moduleNumber", "correctOption", "href"))
    if isinstance(value, list):
        return ("" if value and all(isinstance(v, dict) and v.get("kind") in ("text", "link") for v in value) else " ").join(flat(v) for v in value)
    return value if isinstance(value, str) else ""


def chapters(blocks):
    """Agrupa o AST em capítulos (nível 1) e seções (nível 2)."""
    result, chapter, section = [], {"title": "", "sections": [{"title": "", "nodes": []}]}, None
    section = chapter["sections"][0]
    result.append(chapter)
    for node in blocks:
        if node["t"] == "Header" and node["c"][0] == 1:
            chapter = {"title": normalize(plain(node["c"][2])), "sections": [{"title": "", "nodes": []}]}
            result.append(chapter)
            section = chapter["sections"][0]
        elif node["t"] == "Header" and node["c"][0] == 2:
            section = {"title": normalize(plain(node["c"][2])), "nodes": []}
            chapter["sections"].append(section)
        else:
            section["nodes"].append(node)
    return result


def topic(slug, title, kind, minutes, sections, number=None):
    t = {"title": title, "slug": slug, "kind": kind, "durationMinutes": minutes, "document": {"schemaVersion": 2, "title": title, "sections": sections}}
    if number:
        t["moduleNumber"] = number
    return t


def check_lossless(original, title, topics, extra):
    combined = normalize(title + " " + flat(topics) + " " + flat(extra))
    missing = [p for p in original if p and normalize(p) not in combined]
    if missing:
        raise ValueError(f"Texto perdido na conversão: {missing[:3]}")


def original_texts(blocks):
    texts = []
    for node in blocks:
        if node["t"] == "Table":
            cells = [cell for row in node["c"][3][1] for cell in row[1]] + [cell for body in node["c"][4] for row in body[2] + body[3] for cell in row[1]]
            texts.extend(normalize(block_text(b)) for cell in cells for b in cell[4])
        elif node["t"] in ("BulletList", "OrderedList"):
            entries = node["c"] if node["t"] == "BulletList" else node["c"][1]
            texts.extend(t for entry in entries for t in original_texts(entry))
        else:
            texts.append(normalize(block_text(node)))
    return texts


# ---------------------------------------------------------------- Médias (Markdown)

MEDIAS_ANSWERS = {
    1: "CBDACBDA", 2: "BCDACBDB", 3: "CABDCADB", 4: "BDACBDAC",
    5: "DACBDCAB", 6: "ACBDACDB", 7: "CBADCABD", 8: "BDACBDAC",
}


def split_options(text):
    parts = re.split(r"\s+(?=[B-D]\)\s)", text.strip())
    options = [OPTION.match(p) for p in parts]
    if len(parts) != 4 or not all(options) or [o.group(1) for o in options] != list("ABCD"):
        raise ValueError(f"Alternativas fora do padrão: {text[:60]}")
    return [o.group(2).strip() for o in options]


def medias(source, target):
    blocks = pandoc(source, "markdown-fancy_lists")
    conv = Converter("mfm")
    chs = chapters(blocks)
    title = normalize(plain(blocks[0]["c"][2]))
    by = {c["title"]: c for c in chs}

    def sections(chapter, first_title, skip=()):
        out = []
        for i, s in enumerate(chapter["sections"]):
            if not s["nodes"] or s["title"] in skip:
                continue
            out.append({"id": f"mfm-s-{slugify(chapter['title'])[:24]}-{i}", "kind": "section", "title": s["title"] or first_title, "blocks": [b for n in s["nodes"] for b in conv.block(n)]})
        return out

    def prova(number, section):
        """Prova do módulo: enunciados e alternativas em lista; questões objetivas também viram dados estruturados."""
        nodes, out, questions, i = section["nodes"], [], [], 0
        while i < len(nodes):
            node = nodes[i]
            text = plain(node["c"]) if node["t"] == "Para" else ""
            match = re.match(r"^(\d+)\.\s", text)
            if match and int(match.group(1)) <= 8:
                options = split_options(plain(nodes[i + 1]["c"]))
                q = int(match.group(1))
                out.extend(conv.block(node))
                out.append({"id": conv.id(), "type": "list", "style": "bullet", "items": [{"text": [{"kind": "text", "text": f"{l}) {o}"}]} for l, o in zip("ABCD", options)]})
                questions.append({"id": f"mfm-m{number}-q{q}", "moduleNumber": number, "prompt": normalize(text[match.end():]), "options": [{"id": l.lower(), "text": o} for l, o in zip("ABCD", options)], "correctOption": MEDIAS_ANSWERS[number][q - 1].lower()})
                i += 2
                continue
            if text.startswith("9."):
                out.append({"id": conv.id(), "type": "callout", "variant": "exemplo", "title": "Caso discursivo", "blocks": conv.block(node)})
            else:
                out.extend(conv.block(node))
            i += 1
        if len(questions) != 8:
            raise ValueError(f"Prova do Módulo {number} sem 8 questões objetivas")
        return out, questions

    topics, questions = [], []
    intro = sections(chs[0], "Apresentação") + sections(by["Mentoria Financeira para Médias Empresas"], "Sobre a apostila")
    topics.append(topic("apresentacao", "Apresentação, estrutura e avaliação", "introduction", 0, intro))
    for number in range(1, 9):
        chapter = next(c for c in chs if c["title"].startswith(f"Módulo {number} —"))
        name = chapter["title"].split("—", 1)[1].strip()
        secs = sections(chapter, "Objetivos do módulo", skip=(f"Prova do Módulo {number}",))
        exam = next(s for s in chapter["sections"] if s["title"] == f"Prova do Módulo {number}")
        blocks_, qs = prova(number, exam)
        secs.append({"id": f"mfm-s-prova-{number}", "kind": "section", "title": f"Prova do Módulo {number}", "blocks": blocks_})
        questions += qs
        topics.append(topic(f"modulo-{number}-{slugify(name)}"[:80].strip("-"), f"Módulo {number} — {name}", "module", 8 * 60, secs, number))
    project = next(c for c in chs if c["title"].startswith("Projeto integrador"))
    topics.append(topic("projeto-integrador", "Projeto integrador — Plano financeiro integrado", "project", 16 * 60, sections(project, "Objetivo e entregáveis")))
    cert = next(c for c in chs if c["title"].startswith("Apêndice B"))
    biblio = next(c for c in chs if c["title"].startswith("Apêndice C"))
    closing = [{**s, "title": f"Certificação · {s['title']}"} for s in sections(cert, cert["title"])] + sections(biblio, biblio["title"])
    topics.append(topic("certificacao-bibliografia-e-cronograma", "Certificação, bibliografia, cronograma e aviso", "resource", 0, closing))
    # Apêndice A é de uso docente: fica fora dos capítulos publicados e só é exibido à equipe pedagógica.
    teacher = next(c for c in chs if c["title"].startswith("Apêndice A"))
    guide = {"schemaVersion": 2, "title": teacher["title"], "sections": sections(teacher, teacher["title"])}

    used = {"", "Mentoria Financeira para Médias Empresas", project["title"], cert["title"], biblio["title"], teacher["title"]} | {c["title"] for c in chs if c["title"].startswith("Módulo ")}
    unused = [c["title"] for c in chs if c["title"] not in used]
    if unused:
        raise ValueError(f"Capítulos não mapeados: {unused}")
    # Confere o gabarito estruturado contra a tabela A.1 da apostila.
    table = next(n for s in teacher["sections"] for n in s["nodes"] if n["t"] == "Table")
    for row in table["c"][4][0][3]:
        cells = [normalize(block_text(b)) for cell in row[1] for b in cell[4]]
        assert "".join(cells[1:]) == MEDIAS_ANSWERS[int(cells[0])], cells
    assert sum(t["durationMinutes"] for t in topics) == 80 * 60
    check_lossless(original_texts(blocks), title, topics, [guide, [c["title"] for c in chs]])
    write(target, source, "source.md", title, topics, questions, guide, "Mentoria Financeira para Médias Empresas", 80)


# ---------------------------------------------------------------- Pequenas (DOCX)

PEQUENAS_ANSWERS = {
    1: "BBACB", 2: "ABCAB", 3: "BCBBA", 4: "BABCA",
    5: "AABBA", 6: "BBBBA", 7: "BBAAB", 8: "BBABB",
}


def pequenas(source, target):
    blocks = pandoc(source, "docx")
    conv = Converter("mfp")
    chs = chapters(blocks)
    cover = chs[0]
    title = "Mentoria Financeira para Pequenas Empresas"
    by = {c["title"]: c for c in chs}

    def sections(chapter, first_title, skip=()):
        out = []
        for i, s in enumerate(chapter["sections"]):
            if not s["nodes"] or s["title"] in skip:
                continue
            out.append({"id": f"mfp-s-{slugify(chapter['title'])[:24]}-{i}", "kind": "section", "title": s["title"] or first_title, "blocks": [b for n in s["nodes"] for b in conv.block(n)]})
        return out

    def evaluation(number, section):
        nodes, questions = section["nodes"], []
        for i in range(0, len(nodes), 2):
            prompt = plain(nodes[i]["c"])
            match = re.match(r"^(\d+)\.\s", prompt)
            assert match and nodes[i + 1]["t"] == "BulletList", prompt
            options = [OPTION.match(normalize(block_text(entry[0]))) for entry in nodes[i + 1]["c"]]
            assert [o.group(1) for o in options] == list("ABCD"), prompt
            q = int(match.group(1))
            questions.append({"id": f"mfp-m{number}-q{q}", "moduleNumber": number, "prompt": normalize(prompt[match.end():]), "options": [{"id": o.group(1).lower(), "text": o.group(2)} for o in options], "correctOption": PEQUENAS_ANSWERS[number][q - 1].lower()})
        assert len(questions) == 5, number
        return questions

    topics, questions = [], []
    intro = sections(cover, "Apresentação") + sections(by["Como usar esta apostila"], "Como usar esta apostila")
    topics.append(topic("apresentacao", "Como usar esta apostila", "introduction", 0, intro))
    for number in range(1, 9):
        chapter = next(c for c in chs if c["title"].startswith(f"{number}. "))
        name = chapter["title"].split(". ", 1)[1].strip()
        hours = re.search(r"Carga sugerida: (\d+) horas", block_text(chapter["sections"][0]["nodes"][0]))
        # A avaliação do módulo vira exercício interativo (com correção) logo abaixo do conteúdo.
        evals = [s for s in chapter["sections"] if s["title"] == "Avaliação do módulo"]
        assert len(evals) == 1, number
        questions += evaluation(number, evals[0])
        secs = sections(chapter, "Carga e objetivo", skip=("Avaliação do módulo",))
        topics.append(topic(f"modulo-{number}-{slugify(name)}"[:80].strip("-"), f"Módulo {number} — {name}", "module", int(hours.group(1)) * 60, secs, number))
    topics.append(topic("projeto-final-integrador", "Projeto final integrador", "project", 0, sections(by["Projeto final integrador"], "Entregáveis")))
    closing = sections(by["Gabarito das avaliações"], "Gabarito das avaliações") + sections(by["Bibliografia e fontes recomendadas"], "Bibliografia e fontes recomendadas")
    closing += sections(by["Modelo de certificado de conclusão"], "Modelo de certificado de conclusão") + sections(by["Fontes e leituras"], "Fontes e leituras")
    topics.append(topic("gabarito-bibliografia-e-certificado", "Gabarito, bibliografia e modelo de certificado", "resource", 0, closing))

    used = {"", "Como usar esta apostila", "Projeto final integrador", "Gabarito das avaliações", "Bibliografia e fontes recomendadas", "Modelo de certificado de conclusão", "Fontes e leituras"} | {c["title"] for c in chs if re.match(r"^\d\. ", c["title"])}
    unused = [c["title"] for c in chs if c["title"] not in used]
    if unused:
        raise ValueError(f"Capítulos não mapeados: {unused}")
    # Confere o gabarito estruturado contra o capítulo "Gabarito das avaliações".
    for node in by["Gabarito das avaliações"]["sections"][0]["nodes"]:
        line = normalize(block_text(node))
        number = int(re.match(r"Módulo (\d)", line).group(1))
        assert "".join(re.findall(r"\d-([A-D])", line)) == PEQUENAS_ANSWERS[number], line
    assert sum(t["durationMinutes"] for t in topics) == 56 * 60
    # As avaliações saem do texto corrido e ficam íntegras (enunciado e alternativas) em questions.json.
    kept = [n for c in chs for s in c["sections"] if s["title"] != "Avaliação do módulo" for n in s["nodes"]]
    check_lossless(original_texts(kept), title, topics, [[c["title"] for c in chs], [s["title"] for c in chs for s in c["sections"] if s["title"] != "Avaliação do módulo"]])
    evaluated = normalize(" ".join(q["prompt"] + " " + " ".join(o["text"] for o in q["options"]) for q in questions))
    for c in chs:
        for s in c["sections"]:
            if s["title"] == "Avaliação do módulo":
                for text in original_texts(s["nodes"]):
                    assert normalize(re.sub(r"^(\d+\.|[A-D]\))\s*", "", text)) in evaluated, text
    write(target, source, "source.docx", title, topics, questions, None, title, 56)


def write(target, source, file_name, title, topics, questions, guide, course_title, hours):
    target.mkdir(parents=True, exist_ok=True)
    data = {"source": {"fileName": file_name, "title": title, "sha256": hashlib.sha256(source.read_bytes()).hexdigest()}, "topics": topics}
    (target / "lessons.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    if not guide:
        (target / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n")
    if guide:
        # Provas com gabarito de uso docente: as questões ficam no texto do módulo, sem correção automática.
        (target / "teacher-guide.json").write_text(json.dumps(guide, ensure_ascii=False, indent=2) + "\n")
    outline = {"title": course_title, "hours": hours, "topics": [{k: v for k, v in t.items() if k != "document"} for t in topics]}
    (target / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=2) + "\n")
    print(f"{course_title}: {len(topics)} capítulos, {hours} h, {len(questions)} questões objetivas.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=["medias", "pequenas"])
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    target = Path(f"content/courses/mentoria-financeira-{args.kind}")
    (medias if args.kind == "medias" else pequenas)(args.source, target)
