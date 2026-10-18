"""Build the level 5 (Station Run) tunnel backdrop from the Warped Zone 202 art.

The pack's corridor runs sideways. This lays out one seamless stretch of it
(walls from the preview, interior panels back.png and back-2.png), turns it
upright, and pads it to the game's 256 px width with the pack's own dark blue.

Usage (standard library only):
  python3 -I tools/art/build_tunnel.py "legacy/Warped/Environments/Warped Zone 202" public/assets/backgrounds/station-tunnel.png
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png  # noqa: E402

WIDTH = 256  # the game's width
WALL_ROWS = 48  # preview rows 0-47: dark edge plus the top wall
SEGMENT = 32  # the wall pattern repeats every 32 px
PLAIN = 0  # preview x of a wall segment without a lamp
LAMP = 128  # preview x of the wall segment with a lamp
TOP_LAMPS = (2, 6)  # which of the 9 segments get a lamp
BOTTOM_LAMPS = (4, 8)


def wall(preview, lamps, segments):
    rows = []
    for y in range(WALL_ROWS):
        row = []
        for s in range(segments):
            x0 = LAMP if s in lamps else PLAIN
            row += preview[y][x0 : x0 + SEGMENT]
        rows.append(row)
    return rows


def main(src, out):
    preview = png.read(os.path.join(src, 'previews', 'Zone-202.png'))
    back = png.read(os.path.join(src, 'back.png'))
    back2 = png.read(os.path.join(src, 'back-2.png'))
    interior = [b + b2 + b + b2 for b, b2 in zip(back, back2)]
    length = len(interior[0])
    assert length % SEGMENT == 0, length
    segments = length // SEGMENT
    top = wall(preview, TOP_LAMPS, segments)
    bottom = wall(preview, BOTTOM_LAMPS, segments)[::-1]  # mirrored, as in the pack
    sideways = top + interior + bottom
    upright = png.rot_cw(sideways)
    edge = preview[0][0]
    pad = (WIDTH - len(upright[0])) // 2
    assert pad >= 0 and 2 * pad + len(upright[0]) == WIDTH
    png.write(out, [[edge] * pad + row + [edge] * pad for row in upright])
    print(f'{out}: {WIDTH}x{len(upright)}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
