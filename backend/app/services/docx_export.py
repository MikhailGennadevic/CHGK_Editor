"""Генерация docx-файла пакета в формате печатного тура.

Формат повторяет пример (Галиакберов.docx): Arial 10 пт, шапка со списком
тестеров, далее «Вопрос N.», текст, раздатка (если есть) и блок ответа —
Ответ, Зачёт, Незачёт, Комментарий, Источник/Источники.
"""
from io import BytesIO
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Cm, Emu, Pt
from PIL import Image

from app.models import Package
from app.services.handouts import uploads_path

FONT = "Arial"
SIZE = Pt(10)  # в примере w:sz=20 (half-points)
# Раздатка вписывается в текстовую ширину и не выше половины страницы.
MAX_IMG_W = Cm(15)
MAX_IMG_H = Cm(12)

# После этих символов завершающую точку не добавляем.
_NO_FINAL_DOT = ".!?…:;»)—-"


def _sentence(text: str) -> str:
    """Печатная строка вида «Ответ: …» заканчивается точкой (как в примере)."""
    text = text.strip()
    if text and text[-1] not in _NO_FINAL_DOT:
        return text + "."
    return text


def _unique_testers(package: Package) -> list[str]:
    """Тестеры пакета в именительном падеже, без дублей, в порядке первого упоминания."""
    names: list[str] = []
    seen: set[str] = set()
    for question in package.questions:
        for tester in question.testers:
            name = tester.name.strip()
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return names


def _add_multiline(paragraph, text: str) -> None:
    """Переводы строк внутри текста — в документе (как в поле «Текст вопроса»)."""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if i > 0:
            paragraph.add_run().add_break()
        paragraph.add_run(line)


def _add_labeled(doc, label: str, text: str) -> None:
    paragraph = doc.add_paragraph()
    paragraph.add_run(f"{label}: {text}")


def _add_handout(doc, path: Path) -> None:
    """Блок «[Раздаточный материал: <картинка>]», как в примере."""
    paragraph = doc.add_paragraph()
    bracket = paragraph.add_run("[Раздаточный материал:")
    bracket.bold = True
    bracket.add_break()

    with Image.open(path) as im:
        width_px, height_px = im.size
    # px -> EMU: 96 dpi, 9525 EMU на пиксель; масштаб, чтобы влезть в лимит.
    scale = min(MAX_IMG_W / (width_px * 9525), MAX_IMG_H / (height_px * 9525), 1.0)
    paragraph.add_run().add_picture(
        str(path),
        width=Emu(int(width_px * 9525 * scale)),
        height=Emu(int(height_px * 9525 * scale)),
    )

    end = paragraph.add_run()
    end.add_break()
    end.add_text("]")
    end.bold = True


def build_package_docx(package: Package) -> BytesIO:
    """Собирает docx пакета; возвращает буфер, перемотанный в начало."""
    doc = Document()

    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = SIZE
    # Arial и для кириллицы (иначе Word подставит шрифт по умолчанию).
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)

    section = doc.sections[0]
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(3)
    section.right_margin = Cm(1.5)

    testers = _unique_testers(package)
    if testers:
        # «Иделия Айзятулова, Меруерт Акканова и Наиль Фарукшин».
        joined = testers[0] if len(testers) == 1 else " и ".join((", ".join(testers[:-1]), testers[-1]))
        heading = doc.add_paragraph()
        heading.add_run(f"Тестеры: {joined}.").bold = True

    for number, question in enumerate(package.questions, start=1):
        doc.add_paragraph()
        doc.add_paragraph().add_run(f"Вопрос {number}.").bold = True

        if question.handout:
            handout = uploads_path() / question.handout
            if handout.is_file():
                _add_handout(doc, handout)

        _add_multiline(doc.add_paragraph(), question.text)

        _add_labeled(doc, "Ответ", _sentence(question.answer))
        if question.alternative_answers:
            _add_labeled(
                doc,
                "Зачёт",
                _sentence(", ".join(a.text for a in question.alternative_answers)),
            )
        if question.rejected_answer:
            _add_labeled(doc, "Незачёт", _sentence(question.rejected_answer))
        if question.comment:
            _add_labeled(doc, "Комментарий", _sentence(question.comment))

        if question.sources:
            paragraph = doc.add_paragraph()
            if len(question.sources) == 1:
                paragraph.add_run(f"Источник: {question.sources[0].text.strip()}")
            else:
                paragraph.add_run("Источники: ")
                for i, source in enumerate(question.sources, start=1):
                    if i > 1:
                        paragraph.add_run().add_break()
                    paragraph.add_run(f"{i}) {source.text.strip()}")

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
