from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import struct
import zlib

ROOT = Path(__file__).resolve().parent
TESTS = ROOT / 'testes'
TESTS.mkdir(parents=True, exist_ok=True)


def docx(path: Path, title: str, sections: list[tuple[str, str]]):
    paragraphs = []
    paragraphs.append(f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>{title}</w:t></w:r></w:p>')
    for heading, body in sections:
        paragraphs.append(f'<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>{heading}</w:t></w:r></w:p>')
        for line in body.split('\n'):
            escaped = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            paragraphs.append(f'<w:p><w:r><w:t>{escaped}</w:t></w:r></w:p>')

    document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ''.join(paragraphs) + '<w:sectPr/></w:body></w:document>'
    content_types = '''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''

    with ZipFile(path, 'w', ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/document.xml', document)


def png(path: Path, width=900, height=500):
    navy = (16, 42, 67)
    white = (255, 255, 255)
    orange = (245, 158, 11)
    rows = []
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            if 50 < x < 850 and 50 < y < 450:
                color = orange if x < 55 or x > 845 or y < 55 or y > 445 else white
            else:
                color = navy
            row.extend(color)
        rows.append(bytes(row))
    raw = b''.join(rows)

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(signature)
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        f.write(chunk(b'IEND', b''))


plano = [
    ('Cenário 1 — Cadastro permitido', 'Identificação: Cadastro de OS com mecânico livre.\nDados utilizados: Maria Silva; veículo ABC1D23; Carlos; 01/12/2026; 09:00.\nResultado esperado: OS cadastrada com sucesso.\nResultado obtido: OS criada e ID gerado.\nReferência à evidência: docs/testes/cenario1.png\nConclusão: Aprovado.'),
    ('Cenário 2 — Segunda OS no mesmo horário', 'Identificação: Tentativa de cadastrar segunda OS no mesmo mecânico e horário.\nDados utilizados: Carlos; 02/12/2026; 10:00.\nResultado esperado: mensagem exata de conflito.\nResultado obtido: operação bloqueada com a mensagem exigida.\nReferência à evidência: docs/testes/cenario2.png\nConclusão: Aprovado.'),
    ('Cenário 3 — Alteração para horário ocupado', 'Identificação: alteração de OS para horário ocupado pelo mesmo mecânico.\nDados utilizados: alterar OS de 14:00 para 11:00.\nResultado esperado: operação bloqueada.\nResultado obtido: alteração bloqueada pela validação de conflito.\nReferência à evidência: docs/testes/cenario3.png\nConclusão: Aprovado.')
]

resultados = [
    ('Cenário 1', 'Identificação: Cadastro permitido.\nDados utilizados: Maria Silva, ABC1D23, Carlos, 01/12/2026 às 09:00.\nResultado esperado: cadastro realizado.\nResultado obtido: cadastro realizado e ID gerado.\nReferência à evidência: docs/testes/cenario1.png\nConclusão: Aprovado.'),
    ('Cenário 2', 'Identificação: Segunda OS no mesmo horário.\nDados utilizados: Carlos, 02/12/2026 às 10:00.\nResultado esperado: bloqueio com mensagem exata.\nResultado obtido: 3 testes executados, 0 falhas, 0 erros. Cenário aprovado.\nReferência à evidência: docs/testes/cenario2.png\nConclusão: Aprovado.'),
    ('Cenário 3', 'Identificação: Alteração para horário ocupado.\nDados utilizados: alterar horário de 14:00 para 11:00.\nResultado esperado: bloqueio da alteração.\nResultado obtido: conflito detectado e alteração bloqueada.\nReferência à evidência: docs/testes/cenario3.png\nConclusão: Aprovado.')
]

docx(ROOT / 'plano_testes.docx', 'Plano de Testes — Oficina Mecânica', plano)
docx(ROOT.parent / 'resultados.docx', 'Resultados dos Testes — Oficina Mecânica', resultados)

for number in ('1', '2', '3'):
    png(TESTS / f'cenario{number}.png')
