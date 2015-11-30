# [Use Spritezero instead](https://github.com/mapbox/spritezero)

This is a proof-of-concept for a Protocol-buffer packed format for sprites: it isn't the format that Mapbox GL JS or Mapbox GL Native use. Instead, use [spritezero](https://github.com/mapbox/spritezero), a library that creates a Mapbox-compatible format, or if you're using Mapbox Studio already, you don't need to install anything - our servers run spritezero already.

---

Assembles individual PNG sprite images to a [Protocol Buffer](https://developers.google.com/protocol-buffers/)-based format that includes metadata.

## Usage

```bash
$ npm install -g spritenik
[...]
$ spritenik images/ > out.sprite.pbf
[...]
116 icons, 812 images total
$
```

Individual images have to be in the following naming scheme: `[name]-[size]@[ratio].png`, with all but the name optional. If the `-[size]` part is missing, the size is automatically read from the image. If the `@[ratio]` part is missing, a pixel ratio of 1 is assumed. To specify SDF images, use `-sdf` instead of `-[size]`.

Example: `cinema-18@2x.png` is an image named `cinema` that must be 18×18 pixels and a ratio of `2`. Thus, the actual image dimensions must be 36×36 pixels.
