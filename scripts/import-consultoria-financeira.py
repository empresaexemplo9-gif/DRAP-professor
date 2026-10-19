#!/usr/bin/env python3
"""Converte os documentos fornecidos, conferindo texto e removendo cópias repetidas."""
from decimal import Decimal
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path('content/courses/consultoria-financeira')
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def text(el):
    return ''.join((n.text or '') if n.tag == W+'t' else '\n' if n.tag in (W+'br', W+'cr') else '\t' if n.tag == W+'tab' else '' for n in el.iter()).strip()


def normalized(value):
    return re.sub(r'\s+', ' ', value).strip()


def slug(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c))
    return re.sub('[^a-z0-9]+', '-', value.lower()).strip('-')[:80].rstrip('-')


def read_docx(file, prefix):
    with zipfile.ZipFile(file) as z:
        assert not any(n.startswith('word/media/') for n in z.namelist()), 'Trate a mídia antes de importar'
        body = ET.fromstring(z.read('word/document.xml')).find(W+'body')
        rels = ET.fromstring(z.read('word/_rels/document.xml.rels'))
        links = {r.attrib['Id']: r.attrib.get('Target', '') for r in rels}
    chapters = []
    paragraphs = []
    table_count = 0
    chapter = None
    section = None
    previous_list = None

    def inlines(p):
        out = []
        for child in p:
            if child.tag == W+'hyperlink':
                href = links.get(child.get(R+'id'), '')
                out.append({'kind': 'link', 'text': text(child), 'href': href} if re.match(r'^(https?://|mailto:|/)', href) else {'kind': 'text', 'text': text(child)})
            elif child.tag == W+'r':
                value = ''.join((n.text or '') if n.tag == W+'t' else '\n' if n.tag in (W+'br', W+'cr') else '\t' if n.tag == W+'tab' else '' for n in child)
                if not value:
                    continue
                marks = []
                props = child.find(W+'rPr')
                if props is not None:
                    for tag, mark in [('b','bold'), ('i','italic'), ('u','underline')]:
                        p = props.find(W+tag)
                        if p is not None and p.get(W+'val') not in ('0','false','none'):
                            marks.append(mark)
                    vert = props.find(W+'vertAlign')
                    if vert is not None and vert.get(W+'val') in ('superscript','subscript'):
                        marks.append('sup' if vert.get(W+'val') == 'superscript' else 'sub')
                out.append({'kind':'text', 'text':value, **({'marks':marks} if marks else {})})
        linked = []
        for item in out:
            if item['kind'] != 'text':
                linked.append(item)
                continue
            pos = 0
            for match in re.finditer(r'https?://[^\s<>]+', item['text']):
                href = match[0].rstrip('.,;)')
                if match.start() > pos:
                    linked.append({**item, 'text':item['text'][pos:match.start()]})
                linked.append({'kind':'link','text':href,'href':href})
                pos = match.start()+len(href)
            if pos < len(item['text']):
                linked.append({**item,'text':item['text'][pos:]})
        return linked

    for index, el in enumerate(body):
        if el.tag == W+'p':
            value = text(el)
            if not value:
                continue
            paragraphs.append(value)
            prop = el.find(W+'pPr/'+W+'pStyle')
            style = prop.get(W+'val') if prop is not None else 'Normal'
            if style == 'Heading1' or chapter is None:
                chapter = {'title':value if style == 'Heading1' else 'Apresentação do material', 'sections':[]}
                chapters.append(chapter)
                section = None
                previous_list = None
                if style == 'Heading1':
                    continue
            if style == 'Heading2' or section is None:
                section = {'id':f'{prefix}-s-{index}', 'kind':'section', 'title':value if style == 'Heading2' else chapter['title'], 'blocks':[]}
                chapter['sections'].append(section)
                previous_list = None
                if style == 'Heading2':
                    continue
            block_id = f'{prefix}-b-{index}'
            if style == 'Heading3':
                section['blocks'].append({'id':block_id,'type':'heading','level':3,'text':inlines(el)})
                previous_list = None
            elif style in ('ListNumber', 'ListBullet') or el.find(W+'pPr/'+W+'numPr') is not None:
                assert style in ('ListNumber','ListBullet'), 'Revise lista com numeração direta'
                list_style = 'ordered' if style == 'ListNumber' else 'bullet'
                if previous_list != list_style:
                    section['blocks'].append({'id':block_id,'type':'list','style':list_style,'items':[]})
                section['blocks'][-1]['items'].append({'text':inlines(el)})
                previous_list = list_style
            else:
                section['blocks'].append({'id':block_id,'type':'paragraph','text':inlines(el)})
                previous_list = None
        elif el.tag == W+'tbl':
            if section is None:
                section = {'id':f'{prefix}-s-{index}', 'kind':'section', 'title':chapter['title'], 'blocks':[]}
                chapter['sections'].append(section)
            table_count += 1
            rows = []
            for row in el.findall(W+'tr'):
                cells = []
                for cell in row.findall(W+'tc'):
                    assert cell.find(W+'tcPr/'+W+'vMerge') is None, 'Revise tabela mesclada'
                    items = []
                    for p in cell.findall(W+'p'):
                        if items:
                            items.append({'kind':'text','text':'\n'})
                        items.extend(inlines(p))
                        if text(p):
                            paragraphs.append(text(p))
                    cells.append({'text':items})
                rows.append(cells)
            section['blocks'].append({'id':f'{prefix}-b-{index}','type':'table','header':[rows[0]],'rows':rows[1:]})
            previous_list = None
    return chapters, paragraphs, table_count


def flatten(value):
    if isinstance(value,dict):
        if value.get('kind') in ('text','link'):
            return value['text']
        return ' '.join(flatten(v) for v in value.values())
    if isinstance(value,list):
        sep = '' if value and all(isinstance(v,dict) and v.get('kind') in ('text','link') for v in value) else ' '
        return sep.join(flatten(v) for v in value)
    return value if isinstance(value,str) else ''


def main():
    course = json.loads((ROOT/'originals/curriculum.json').read_text())['course']
    advanced = json.loads((ROOT/'originals/practice.json').read_text())
    original, base_paragraphs, _ = read_docx(ROOT/'originals/apostila.docx','cf')
    extended, advanced_paragraphs, table_count = read_docx(ROOT/'originals/caderno.docx','cf')
    # O caderno contém toda a apostila antes dos exercícios adicionais.
    assert advanced_paragraphs[:len(base_paragraphs)] == base_paragraphs, 'As edições divergem: revise antes de consolidar'
    last = extended[len(original)-1]['sections'][-1]['blocks']
    supplement = [b for b in last if 'EDIÇÃO AVANÇADA' in flatten(b) or 'Suplemento técnico para aprofundamento.' in flatten(b)]
    last[:] = [b for b in last if b not in supplement]
    topics = []
    intro = [{'id':'cf-supplement','kind':'section','title':'Caderno de exercícios resolvidos','blocks':supplement}]
    references = []
    editorial = []
    practice = []
    source_modules = {m['number']:m for m in course['modules']}
    worked = {m['module_number']:m for m in advanced['modules']}

    def topic(title, path, kind, minutes, sections, **extra):
        return {'title':title,'slug':path,'kind':kind,'durationMinutes':minutes,'document':{'schemaVersion':2,'title':title,'sections':sections},**extra}

    for chapter in extended:
        match = re.match(r'Módulo (\d+) — (.+)',chapter['title'])
        exercise = re.match(r'Exercício resolvido (\d+) — (.+)',chapter['title'])
        if match:
            number = int(match[1])
            meta = source_modules[number]
            assert match[2] == meta['title']
            topics.append(topic(chapter['title'],slug(f'modulo-{number:02d}-{meta["title"]}'),'module',meta['hours']*60,chapter['sections'],moduleNumber=number,objective=meta['objective']))
            questions = [{'id':f'cf-{number:02d}-base-{i+1}','kind':'Questão de estudo','prompt':q['prompt'],'guidance':q['answer_explanation']} for i,q in enumerate(meta['assessment']['questions'])]
            questions += [{'id':f'cf-{number:02d}-advanced-{i+1}','kind':'Aprofundamento','prompt':q['prompt'],'guidance':q['rubric']} for i,q in enumerate(worked[number]['question_bank_seed'])]
            practice.append({'moduleNumber':number,'questions':questions})
        elif exercise:
            number = int(exercise[1])
            current = next(t for t in topics if t.get('moduleNumber') == number)
            sections = chapter['sections']
            current['document']['sections'].append({'id':f'cf-worked-{number}','kind':'section','title':chapter['title'],'blocks':[{'id':f'cf-worked-{number}-h-{i}','type':'heading','level':3,'text':[{'kind':'text','text':s['title']}]} if n == 0 else b for i,s in enumerate(sections) for n,b in enumerate([None]+s['blocks'])]})
        elif chapter['title'] == 'Avaliação de certificação interna':
            topics.append(topic('Avaliação de certificação interna e projeto final','projeto-final','project',12*60,chapter['sections']))
        elif chapter['title'] in ('Referências acadêmicas e profissionais','Referências institucionais de partida'):
            references.extend(chapter['sections'])
        elif chapter['title'] == 'Protocolo de validação editorial e acadêmica':
            editorial.append(chapter)
        elif chapter['title'] == 'Como estudar cada resolução':
            intro.extend(chapter['sections'])
        else:
            # Capítulos iniciais tornam-se seções de uma única apresentação.
            intro.extend(chapter['sections'])
    # Conferência independente: o inteiro aproximado do exemplo original tem diferença de R$ 1,34.
    vpl = -Decimal('100000') + sum(Decimal('45000') / Decimal('1.10') ** n for n in range(1,4))
    value = f'{vpl:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')
    module7 = next(t for t in topics if t.get('moduleNumber') == 7)
    module7['document']['sections'][-1]['blocks'].append({'id':'cf-vpl-verification','type':'callout','variant':'info','title':'Conferência do cálculo do VPL','blocks':[{'id':'cf-vpl-correction','type':'paragraph','text':[{'kind':'text','text':f'Com investimento inicial de R$ 100.000, três entradas anuais de R$ 45.000 e desconto de 10% ao ano, o VPL é R$ {value} (R$ 11.908, arredondado à unidade). A resolução do documento original indica aproximadamente R$ 11.907. Esta nota registra a correção aritmética; os arquivos originais foram preservados.'}]}]})
    topics.insert(0,topic('Apresentação e orientações de estudo','apresentacao','introduction',0,intro))
    topics.append(topic('Referências e fontes de consulta','referencias','resource',0,references))
    assert len(topics)==21 and len(practice)==18
    assert sum(t['durationMinutes'] for t in topics)==400*60
    combined = normalized(flatten(topics)+' '+flatten(editorial))
    for paragraphs in (base_paragraphs,advanced_paragraphs):
        missing=[p for p in paragraphs if normalized(p) not in combined]
        assert not missing, f'Texto ausente: {missing[:3]}'
    manifest = [{'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((ROOT/'originals').iterdir())]
    data={'sources':manifest,'verification':{'apostilaParagraphs':len(base_paragraphs),'cadernoParagraphs':len(advanced_paragraphs),'tables':table_count},'topics':topics,'editorialNotes':editorial}
    outline={'title':course['title'],'slug':course['slug'],'hours':400,'segment':{'name':'Finanças','slug':'financas'},'topics':[{k:v for k,v in t.items() if k!='document'} for t in topics]}
    for name,value in [('lessons',data),('outline',outline),('practice',practice)]:
        (ROOT/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    print(f'Convertidos {len(topics)} capítulos, 400 h, 162 questões discursivas, 18 exercícios resolvidos; {len(base_paragraphs)} + {len(advanced_paragraphs)} parágrafos conferidos, {table_count} tabelas; documentos repetidos consolidados.')


if __name__=='__main__':
    main()
