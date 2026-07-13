# Location, Speaking, Advisory & Travel map sources

The website uses two shared, local WebP assets. The browser makes no map-tile,
imagery, geocoding, vector-map, or other third-party geographic request.

| Runtime asset | Dimensions | Geographic source | Transformation |
| --- | ---: | --- | --- |
| `assets/location/northeast-access.webp` | 2000 × 1400 | Natural Earth 1:10m Admin 1 States and Provinces, version 5.1.1 | US state polygons are cropped in Web Mercator to the Washington–Bridgeport corridor, recolored into the site's navy, forest, and warm-gold system, and annotated with the approved WDC, ILG, PHL, CNJ, NYC, and BPT sequence. |
| `assets/location/global-engagements.webp` | 2200 × 1200 | Natural Earth 1:110m Admin 0 Countries, version 5.1.1 | Country geometry is projected into an Atlantic-centered Equal Earth atlas. The contiguous United States receives a restrained material highlight; CNJ is the only labeled origin; unlabeled reach vectors communicate availability without named destinations. |

Natural Earth states that its map data is in the public domain and may be used
commercially and modified without permission:

- <https://www.naturalearthdata.com/about/terms-of-use/>
- <https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/>
- <https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/>

The visible materials, lighting, grid, corridor, markers, labels, and reach
vectors are generated locally with NumPy and Pillow. No photographic or
satellite texture is used in either final asset.

## Generation

The reproducible source is `scripts/generate-location-maps.py`. It requires
Python, NumPy, Pillow, pyshp, DejaVu Sans, and extracted Natural Earth inputs in
the following structure:

```text
<data-dir>/admin1/ne_10m_admin_1_states_provinces.shp
<data-dir>/countries110/ne_110m_admin_0_countries.shp
```

Generate the production files with:

```bash
python3 scripts/generate-location-maps.py \
  --data-dir /tmp/location-map-data \
  --output-dir assets/location
```

The output format is WebP at quality 92. The resulting files are complete,
flattened artwork: the production site needs no JavaScript renderer, iframe,
SVG overlay, external map library, or runtime geographic dependency.
