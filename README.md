# 23 November 2026 — world news in one image

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/flavyn/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/flavyn/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

An entry for [make.fun](https://make.fun) competition **news-image-20261123**: one image that sums up the world news of Monday 23 November 2026.

The image is `entry.png` beside `main.ts`. The program validates it and copies it into the output directory, creating that directory when needed:

``
MAKEFUN_OUTPUT_DIR=out node main.ts
``

PowerShell: `='out'; node main.ts`. The destination defaults to `/output` when the variable is unset. The gate accepts a whole PNG or JPEG of at most 1,048,576 bytes and at most 1024 by 1024 pixels; PNG validation walks chunks and their CRCs through IEND, JPEG validation walks segments through EOI, and an invalid file prints one stderr line and exits nonzero. Two runs into two directories write byte-identical output and print the same single line.

## What the image shows

One front page for 23 November 2026: Nvidia reinstating Jensen Huang as chief executive, Germany taking a Russian space-weapon report seriously, Iran rejecting the US naval blockade, Belgium's anti-austerity strike, COP31 closing without a fossil-fuel deal, the Democrats' largest House majority since 1992, Mexican troops attacked after a cartel arrest, and Gaza's hearing-aid shortage — with ten further stories in a briefs strip. Seventeen stories across six regions, each a photograph with a short label, sized to stay legible at about 300 pixels across.

Sources: BBC News, Al Jazeera, The Guardian — every item published 23 November 2026 (UTC).

## Licence

MIT, see `LICENSE`.