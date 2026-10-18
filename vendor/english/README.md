# Local English touch model

`model.mjs` contains weighted next-letter counts for 3,308 English word prefixes. It is a spatial tie-breaker for ambiguous letter contacts, not autocorrect or word replacement. A central key hit remains literal. The model never receives terminal output or sends typing data over a network.

The counts were generated from the public-domain body text of:

- Lewis Carroll, *Alice's Adventures in Wonderland* (1865), [Project Gutenberg 11](https://www.gutenberg.org/ebooks/11). Download: `https://www.gutenberg.org/cache/epub/11/pg11.txt`; SHA-256 `01b38ea4c710a84bc18d0bd41271a5a1a92b94e97b2812f4dece97d4a694725e`.
- Arthur Conan Doyle, *The Adventures of Sherlock Holmes* (1892), [Project Gutenberg 1661](https://www.gutenberg.org/ebooks/1661). Download: `https://www.gutenberg.org/cache/epub/1661/pg1661.txt`; SHA-256 `922e2a12ccb43a4c9544c260b2166c6ad2097aeb5957faeee113f173bb857cd0`.

Both source pages identify the works as public domain in the USA. The authors died in 1898 and 1930. The generator excludes Project Gutenberg headers and license/trademark text; the distributed asset contains statistical counts, not passages from the books. The derived model is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Regenerate offline after downloading the exact source revisions:

```sh
node scripts/build-keyboard-english.mjs alice.txt holmes.txt
```

The generator prints source checksums. It takes the 1,800 most frequent words, accumulates next-letter counts by prefix, removes prefixes observed fewer than eight times, then encodes each letter's relative frequency on a scale of 1–8. This small literary corpus has incomplete modern vocabulary; an unknown prefix leaves spatial targeting unchanged. The committed model requires no dependency, training step or runtime network request.
