# @infiniah/brand-icons

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square)](https://www.typescriptlang.org)
[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?style=flat-square)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-compatible-000020?style=flat-square)](https://expo.dev)
[![License](https://img.shields.io/badge/license-MIT-black?style=flat-square)](LICENSE)

**Brand icons, instantly, with no network call.**

Fetching a company logo normally means someone else's API: a round trip you wait on, a key to
keep, a bill that grows with your users, a rate limit, an outage you cannot fix, and a third party
who now knows every company your users look at.

This is a local lookup. **4,309 brands are compiled in**, so an icon costs about **10 microseconds**
and cannot fail, throttle, or phone anyone. It works offline.

## Why not just…

**…call a logo API?** Latency on every icon, a key to manage, a bill per lookup, a rate limit, and
an outage you cannot fix. This is a function call against memory.

**…ship an icon set and look these up yourself?** An icon set gives you files, keyed by exact slug.
It does not answer "which brand is `APPLE.COM/BILL SPOTIFY`", which is the actual work.

**…use a store search?** Apple's is wrapped here as an optional tier. Google publishes no equivalent
public search API, so there is no Play tier.

**…just take the top match?** That is how you silently draw the wrong logo. `Amazon` matches two
Amazon sub brands at exactly the same score, and the honest answer is to ask.

## What you get

- **4,309 marks**, 3,175 of them in full colour. No network, no key, no rate limit.
- A score built from token overlap and structure rather than one fuzzy distance.
- `isAmbiguous()`, so a coin flip becomes a chooser instead of a wrong icon.
- A `<BrandIcon>` component that draws vector marks, raster artwork or a monogram.
- No runtime dependencies beyond `react-native-svg`.

## Install

```sh
npx expo install @infiniah/brand-icons react-native-svg
```

## Use

```tsx
import { BrandIcon, BrandIconResolver, best } from '@infiniah/brand-icons';

const resolver = new BrandIconResolver();
const result = await resolver.resolve({ name: 'APPLE.COM/BILL SPOTIFY' });
const icon = best(result, 0.8);

<BrandIcon candidate={icon} fallbackText="Spotify" size={40} />
```

The bundler inlines the catalogue, so there is nothing to locate or download, and it is parsed
once. Pass your own `BrandCatalog` to the constructor if you ship your own marks.

## What it costs your app

The catalogue is the whole point and the whole weight: it is vector geometry for 4,309 brands, and
nothing else in the package is measurable beside it.

| | brands | in your bundle |
| --- | --- | --- |
| full | 4,309 | **2.44 MB** |
| compact | 4,087 | **1.65 MB** |

Those are the compressed sizes, which is what an app store actually ships.

The compact catalogue leaves out 222 marks whose path data runs past 4 KB. Those are
illustrations rather than icons, detailed enough to be mush at 40 points, and they are what makes
the difference. Everything else is identical, including every score.

## It takes the names you actually have

The lookup is a resolver, not a filename match, so a string that came off a bank statement or a
user's typing still finds the brand:

```
"APPLE.COM/BILL SPOTIFY"   →   Spotify      1.00
"NOTION LABS INC"          →   Notion       0.81
"SQ *BLUE BOTTLE"          →   nothing      —
"Amazon"                   →   two sub brands tie, ask the user
```

## Acting on the score

```ts
const result = await resolver.resolve({ name: 'Amazon' });

if (best(result, 0.8)) {
  draw(result.candidates[0]);
} else if (isAmbiguous(result)) {
  askTheUser(result.candidates);
}
```

| Score | Meaning |
| --- | --- |
| 1.00 | the normalised names are identical |
| 0.72 – 0.90 | the query is the brand plus extra words, like a statement descriptor |
| 0.42 – 0.60 | the brand is more specific than the query. `Apple` is not `Apple TV` |
| below 0.35 | discarded rather than returned |

## Offline by default

```ts
const resolver = new BrandIconResolver(catalog, offlineConfiguration);
```

## Loading the catalogue

The catalogue is 10 MB. Metro cannot inline a JSON file that size into the JavaScript bundle: it
compiles `require`d JSON into an object literal, and one this large takes the JS thread down with
it. It also inlines statically, so hiding the `require` inside a lazy function does not help.

So the catalogue ships as an **asset** and is read at runtime. In Expo that is automatic:

```ts
const resolver = await BrandIconResolver.bundled();
```

Outside Expo, hand it something that returns the file's contents once, before the first resolve:

```ts
setCatalogLoader(async () => myOwnAssetReader('brand-marks.json'));
```

## One difference from the native ports

The native ports download a favicon and measure its real pixel size from the bytes, so a site that
declares `512x512` and serves a 32 pixel file scores as 32. This port hands React Native a URI
instead of the bytes, because that is what `Image` takes, so it can only trust the declared size.
The favicon tier is a notch more cautious here as a result. Every other score is identical, which
is what the fixtures below assert.

## Agreeing with the other platforms

This port is not written to a specification and hoped over. Two fixtures generated by the Swift
implementation are checked in and asserted against:

- `golden-corpus.json` — queries with their normalised key, brand tokens and scored candidates
- `golden-geometry.json` — element kinds and every control point of a set of marks

`npm test` also parses every path in the catalogue, because the geometry fixture pins twenty marks
and says nothing about the other four thousand.

| Platform | Repository |
| --- | --- |
| React Native and Expo, TypeScript | this repository |
| iOS and macOS, Swift | [infiniah/brand-icons-ios](https://github.com/infiniah/brand-icons-ios) |
| Android, Kotlin | [infiniah/brand-icons-android](https://github.com/infiniah/brand-icons-android) |
| Flutter, Dart | [infiniah/brand-icons-flutter](https://github.com/infiniah/brand-icons-flutter) |

## License

MIT for the code. The marks carry their own terms: Simple Icons is CC0, the colour artwork is CC0
and MIT, and none of it touches trademark. See [NOTICE](NOTICE).
