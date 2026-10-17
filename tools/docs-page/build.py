#!/usr/bin/env python3
"""Builds the single-page docs viewer (PROJECT, ARCHITECTURE, ROADMAP, CLAUDE) as HTML.

Output: tools/docs-page/out/star-destroyer-docs.html (git-ignored). Publish it to the
existing docs artifact: https://claude.ai/artifact/L8gay7hMBWrkLA7Req7nTs
"""
import base64
import pathlib

here = pathlib.Path(__file__).resolve().parent
root = here.parent.parent
html = (here / "template.html").read_text()


def esc(s: str) -> str:
    # keep the markdown from closing its <script> container
    return s.replace("</script", "<\\/script")


for key in ["PROJECT", "ARCHITECTURE", "ROADMAP", "CLAUDE"]:
    html = html.replace(f"__{key}__", esc((root / f"{key}.md").read_text()))

ship = root / "public/assets/player/ship-01-red.png"
html = html.replace("__SHIP__", "data:image/png;base64," + base64.b64encode(ship.read_bytes()).decode())

out = here / "out"
out.mkdir(exist_ok=True)
(out / "star-destroyer-docs.html").write_text(html)
print(out / "star-destroyer-docs.html")
