# /// script
# dependencies = ["fonttools==4.60.1"]
# ///
import base64
import hashlib
import io
import json
import re
from importlib.metadata import version
from pathlib import Path

from fontTools import subset
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

root = Path(__file__).resolve().parents[1]
points = [0x23F8, 0x23F9, 0x23FA, 0x26A0]
font = subset.load_font(
    root / "vendor/symbols/NotoSansSymbols2-Regular.ttf", subset.Options()
)
font.recalcTimestamp = False
selection = subset.Subsetter()
selection.populate(unicodes=points)
selection.subset(font)
text_variants = CmapSubtable.newSubtable(14)
text_variants.platformID, text_variants.platEncID, text_variants.language = 0, 5, 0
text_variants.cmap = {}
text_variants.uvsDict = {0xFE0E: [(point, None) for point in points]}
font["cmap"].tables.append(text_variants)
output = io.BytesIO()
font.save(output)
encoded = base64.b64encode(output.getvalue()).decode()
page = root / "index.html"
text = page.read_text()
pattern = r"(?:@font-face\{font-family:PokemuxMarks;[^}]+\}\n)?@font-face\{font-family:PokemuxSymbols;[^}]+\}(?:\n@font-face\{font-family:PokemuxSymbols;[^}]+\})?"
faces = f"@font-face{{font-family:PokemuxMarks;src:url('data:font/ttf;base64,{encoded}') format('truetype');font-display:block}}\n@font-face{{font-family:PokemuxSymbols;src:url('/vendor/symbols/NotoSansSymbols2-Regular.ttf') format('truetype');font-display:block}}"
text, count = re.subn(pattern, lambda _: faces, text)
assert count == 1
page.write_text(text)
provenance = root / "vendor/symbols/provenance.json"
data = json.loads(provenance.read_text())
data["inline_subset"] = {
    "modified": True,
    "codepoints": [f"U+{point:X}" for point in points],
    "fonttools": version("fonttools"),
    "sha256": hashlib.sha256(output.getvalue()).hexdigest(),
}
provenance.write_text(json.dumps(data, indent=2) + "\n")
print(f"Embedded {len(output.getvalue())} font bytes")
