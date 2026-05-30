from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ModuleNotFoundError as error:
    TTFont = None
    FONTTOOLS_IMPORT_ERROR = error
else:
    FONTTOOLS_IMPORT_ERROR = None


ROOT_DIR = Path(__file__).resolve().parent.parent
SOURCES = [
    "https://ctan.org/pkg/newcomputermodern",
    "https://download.gnu.org.ua/release/newcm/",
]
CUSTOM_FAMILY = "NewCMMathCustom"
CUSTOM_FULL_NAME = "NewCMMathCustom-Regular"
CUSTOM_POSTSCRIPT_NAME = "NewCMMathCustom-Regular"
CUSTOM_UNIQUE_ID = "NewCMMathCustom-Regular; 4.0"
CUSTOM_COPYRIGHT_APPEND = (
    "WOFF2 conversion metadata and packaging by "
    "@peaceroad/markdown-it-math-tex-to-mathml project."
)
CUSTOM_LICENSE_DESCRIPTION = (
    'Derived webfont packaging from "New Computer Modern". '
    "Converted from OTF to WOFF2 without changing glyph outlines. "
    "Distributed under the GUST Font License (GFL), legally identical to "
    "LPPL 1.3c or later."
)
CUSTOM_LICENSE_URL = "https://tug.org/fonts/licenses/GUST-FONT-LICENSE.txt"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a NewCM Math OTF into a WOFF2 file with project metadata.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to the source NewCM Math OTF file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Path to the generated WOFF2 file with rewritten metadata.",
    )
    return parser.parse_args()


def ensure_input(path: Path) -> None:
    if path.exists():
        return
    sources = "\n".join(f"  - {url}" for url in SOURCES)
    raise FileNotFoundError(
        f"Input font not found: {path}\n"
        "Expected a local NewCM Math OTF asset.\n"
        f"Known upstream sources:\n{sources}"
    )


def collect_name_strings(font: TTFont, name_id: int) -> set[str]:
    values: set[str] = set()
    for record in font["name"].names:
        if record.nameID != name_id:
            continue
        try:
            values.add(record.toUnicode())
        except Exception:
            values.add(record.string.decode(errors="replace"))
    return values


def set_name(font: TTFont, name_id: int, value: str) -> None:
    name_table = font["name"]
    name_table.removeNames(nameID=name_id)
    # Windows Unicode BMP + Macintosh Roman are enough for this packaging use.
    name_table.setName(value, name_id, 3, 1, 0x409)
    name_table.setName(value, name_id, 1, 0, 0)


def rewrite_metadata(font: TTFont) -> None:
    original_copyright = next(iter(sorted(collect_name_strings(font, 0))), "")
    if CUSTOM_COPYRIGHT_APPEND not in original_copyright:
        if original_copyright:
            copyright_value = f"{original_copyright}\n{CUSTOM_COPYRIGHT_APPEND}"
        else:
            copyright_value = CUSTOM_COPYRIGHT_APPEND
    else:
        copyright_value = original_copyright

    set_name(font, 0, copyright_value)
    set_name(font, 1, CUSTOM_FAMILY)
    set_name(font, 3, CUSTOM_UNIQUE_ID)
    set_name(font, 4, CUSTOM_FULL_NAME)
    set_name(font, 6, CUSTOM_POSTSCRIPT_NAME)
    set_name(font, 13, CUSTOM_LICENSE_DESCRIPTION)
    set_name(font, 14, CUSTOM_LICENSE_URL)


def default_output_path(input_path: Path) -> Path:
    return input_path.with_suffix(".woff2")


def main() -> int:
    args = parse_args()

    if FONTTOOLS_IMPORT_ERROR is not None:
        missing = FONTTOOLS_IMPORT_ERROR.name or "fontTools"
        print(
            f"Missing Python module: {missing}\n"
            "Install the converter dependencies first:\n"
            "  python -m pip install fonttools brotli\n"
            "If your environment exposes Python 3 as `python3`, use that instead.",
            file=sys.stderr,
        )
        return 1

    input_path = args.input.resolve()
    output_path = (
        args.output.resolve()
        if args.output is not None
        else default_output_path(input_path)
    )
    temp_output = output_path.with_suffix(".tmp.woff2")

    ensure_input(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        font = TTFont(input_path)
        rewrite_metadata(font)
        font.flavor = "woff2"
        font.save(temp_output)
        temp_output.replace(output_path)
    finally:
        temp_output.unlink(missing_ok=True)

    try:
        display_path = output_path.relative_to(ROOT_DIR)
    except ValueError:
        display_path = output_path

    print(f"Wrote {display_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
