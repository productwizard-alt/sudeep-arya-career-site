#!/usr/bin/env python3
"""Generate the production Location, Speaking, Advisory & Travel map assets.

Natural Earth public-domain geometry is transformed into two local WebPs:

* assets/location/northeast-access.webp (2000 x 1400)
* assets/location/global-engagements.webp (2200 x 1200)

Required Python packages: numpy, Pillow, and pyshp.

Example:
  python3 scripts/generate-location-maps.py \
    --data-dir /tmp/location-map-data \
    --output-dir assets/location
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
import shapefile
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = Path("/tmp/location-map-data")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

REGIONAL_SIZE = (2000, 1400)
GLOBAL_SIZE = (2200, 1200)
REGIONAL_BOUNDS = (-77.25, 38.72, -72.85, 41.35)

CITIES = {
    "Washington, DC": (-77.0369, 38.9072),
    "Wilmington": (-75.5466, 39.7447),
    "Philadelphia": (-75.1652, 39.9526),
    "Central New Jersey": (-74.55, 40.28),
    "New York City": (-74.0060, 40.7128),
    "Bridgeport, CT": (-73.1952, 41.1792),
}


def rings(shape):
    stops = list(shape.parts) + [len(shape.points)]
    for start, stop in zip(stops, stops[1:]):
        yield shape.points[start:stop]


def web_mercator(lon, lat):
    radius = 6378137.0
    return radius * math.radians(lon), radius * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def regional_project(lon, lat, size):
    width, height = size
    lon_min, lat_min, lon_max, lat_max = REGIONAL_BOUNDS
    x_min, y_min = web_mercator(lon_min, lat_min)
    x_max, y_max = web_mercator(lon_max, lat_max)
    x, y = web_mercator(lon, lat)
    return (
        (x - x_min) / (x_max - x_min) * width,
        (y_max - y) / (y_max - y_min) * height,
    )


def regional_geometry(size):
    mask = Image.new("L", size, 0)
    boundaries = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    boundary_draw = ImageDraw.Draw(boundaries)
    reader = shapefile.Reader(str(DATA / "admin1" / "ne_10m_admin_1_states_provinces.shp"))
    fields = [field[0] for field in reader.fields[1:]]
    selected = {"Delaware", "Maryland", "New Jersey", "New York", "Pennsylvania", "Connecticut"}
    for record, shape in zip(reader.records(), reader.shapes()):
        values = dict(zip(fields, record))
        if values.get("iso_a2") != "US" or values.get("name") not in selected:
            continue
        for ring in rings(shape):
            points = [regional_project(lon, lat, size) for lon, lat in ring]
            mask_draw.polygon(points, fill=255)
            boundary_draw.line(points, fill=220, width=2, joint="curve")
    return mask, boundaries


def draw_label(layer, marker, position, text, primary=False, secondary=None, font_size=None):
    draw = ImageDraw.Draw(layer)
    size = font_size or (44 if primary else 34)
    font = ImageFont.truetype(FONT_BOLD if primary else FONT, size)
    secondary_font = ImageFont.truetype(FONT_BOLD, 17)
    box = draw.textbbox((0, 0), text, font=font)
    text_width = box[2] - box[0]
    text_height = box[3] - box[1]
    pad_x = 18
    pad_y = 11
    secondary_height = 24 if secondary else 0
    x, y = position
    plate = (x, y, x + text_width + pad_x * 2, y + text_height + pad_y * 2 + secondary_height)
    draw.rounded_rectangle(plate, radius=10, fill=(3, 20, 29, 176))
    closest_x = min(max(marker[0], plate[0]), plate[2])
    closest_y = min(max(marker[1], plate[1]), plate[3])
    draw.line((marker[0], marker[1], closest_x, closest_y), fill=(211, 196, 151, 125), width=2)
    draw.text((x + pad_x, y + pad_y - box[1]), text, font=font, fill=(244, 237, 221, 250))
    if secondary:
        draw.text(
            (x + pad_x, y + pad_y + text_height + 6),
            secondary.upper(),
            font=secondary_font,
            fill=(213, 188, 119, 225),
            spacing=5,
        )


def render_regional_schematic():
    size = REGIONAL_SIZE
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width]
    xn = xx.astype(np.float32) / width
    yn = yy.astype(np.float32) / height

    deep = np.asarray([2, 17, 28], dtype=np.float32)
    coastal = np.asarray([5, 49, 58], dtype=np.float32)
    east_light = np.exp(-(((xn - 0.78) / 0.40) ** 2 + ((yn - 0.42) / 0.68) ** 2))
    rgb = deep + east_light[..., None] * (coastal - deep) * 0.72
    rgb += ((np.sin(xn * 24 + yn * 4) + np.cos(yn * 27)) * 0.42)[..., None]
    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    land_mask, boundaries = regional_geometry(size)
    boundary = np.asarray(boundaries, dtype=np.float32) / 255.0
    west_to_east = np.clip(xn * 0.72 + yn * 0.08, 0, 1)[..., None]
    land_low = np.asarray([28, 60, 55], dtype=np.float32)
    land_high = np.asarray([69, 82, 65], dtype=np.float32)
    land_rgb = land_low * (1 - west_to_east) + land_high * west_to_east
    land_rgb += (np.sin(xn * 37) * 0.65 + np.cos(yn * 29) * 0.45)[..., None]
    land_rgb = land_rgb * (1 - boundary[..., None] * 0.28) + np.asarray([159, 169, 145]) * boundary[..., None] * 0.28

    land_layer = np.zeros((height, width, 4), dtype=np.uint8)
    land_layer[..., :3] = np.clip(land_rgb, 0, 255).astype(np.uint8)
    land_layer[..., 3] = np.asarray(land_mask, dtype=np.uint8)

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shifted = Image.new("L", size, 0)
    shifted.paste(land_mask, (5, 13))
    shadow.putalpha(shifted.filter(ImageFilter.GaussianBlur(9)))
    shadow_array = np.asarray(shadow).copy()
    shadow_array[..., :3] = 0
    shadow_array[..., 3] = (shadow_array[..., 3].astype(np.float32) * 0.48).astype(np.uint8)
    canvas = Image.alpha_composite(canvas, Image.fromarray(shadow_array, "RGBA"))
    canvas = Image.alpha_composite(canvas, Image.fromarray(land_layer, "RGBA"))

    coast_outer = land_mask.filter(ImageFilter.MaxFilter(7))
    coast_inner = land_mask.filter(ImageFilter.MinFilter(5))
    coastline = ImageChops.subtract(coast_outer, coast_inner)
    coast_layer = Image.new("RGBA", size, (183, 191, 157, 0))
    coast_layer.putalpha(coastline.point(lambda value: int(value * 0.54)))
    canvas = Image.alpha_composite(canvas, coast_layer)

    context = Image.new("RGBA", size, (0, 0, 0, 0))
    context_draw = ImageDraw.Draw(context)
    for longitude in (-76, -75, -74, -73):
        points = [regional_project(longitude, lat, size) for lat in np.linspace(REGIONAL_BOUNDS[1], REGIONAL_BOUNDS[3], 80)]
        context_draw.line(points, fill=(137, 166, 160, 18), width=2)
    for latitude in (39.5, 40.0, 40.5, 41.0):
        points = [regional_project(lon, latitude, size) for lon in np.linspace(REGIONAL_BOUNDS[0], REGIONAL_BOUNDS[2], 100)]
        context_draw.line(points, fill=(137, 166, 160, 16), width=2)
    canvas = Image.alpha_composite(canvas, context)

    stop_names = ("Washington, DC", "Wilmington", "Philadelphia", "Central New Jersey", "New York City", "Bridgeport, CT")
    route = [regional_project(*CITIES[name], size) for name in stop_names]
    corridor_glow = Image.new("RGBA", size, (0, 0, 0, 0))
    corridor_glow_draw = ImageDraw.Draw(corridor_glow)
    corridor_glow_draw.line(route, fill=(228, 190, 99, 82), width=30, joint="curve")
    corridor_glow = corridor_glow.filter(ImageFilter.GaussianBlur(20))
    canvas = Image.alpha_composite(canvas, corridor_glow)

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.line(route, fill=(130, 94, 53, 210), width=13, joint="curve")
    draw.line(route, fill=(239, 218, 157, 255), width=7, joint="curve")

    label_codes = {
        "Washington, DC": "WDC",
        "Wilmington": "ILG",
        "Philadelphia": "PHL",
        "Central New Jersey": "CNJ",
        "New York City": "NYC",
        "Bridgeport, CT": "BPT",
    }
    offsets = {
        "Washington, DC": (54, -112),
        "Wilmington": (-174, 42),
        "Philadelphia": (-184, -92),
        "Central New Jersey": (-68, -142),
        "New York City": (52, -108),
        "Bridgeport, CT": (-190, 44),
    }
    label_sizes = {"Washington, DC": 39, "Wilmington": 39, "Philadelphia": 43, "New York City": 46, "Bridgeport, CT": 39}
    for name, point in zip(stop_names, route):
        primary = name == "Central New Jersey"
        outer = 28 if primary else 22
        inner = 15 if primary else 12
        draw.ellipse(
            (point[0] - outer, point[1] - outer, point[0] + outer, point[1] + outer),
            fill=(5, 27, 35, 226),
            outline=(227, 208, 151, 230),
            width=4,
        )
        draw.ellipse(
            (point[0] - inner, point[1] - inner, point[0] + inner, point[1] + inner),
            fill=(209, 139, 75, 255) if primary else (66, 93, 84, 255),
            outline=(246, 232, 190, 235),
            width=3,
        )
        dx, dy = offsets[name]
        draw_label(
            overlay,
            point,
            (point[0] + dx, point[1] + dy),
            label_codes[name],
            primary=primary,
            secondary="Base" if primary else None,
            font_size=48 if primary else label_sizes[name],
        )

    frame_draw = ImageDraw.Draw(overlay)
    frame_draw.rounded_rectangle((22, 22, width - 22, height - 22), radius=28, outline=(207, 193, 148, 58), width=2)
    return Image.alpha_composite(canvas, overlay).convert("RGB")


def equal_earth_project(lon, lat, size, center_lon=-25):
    shifted_lon = ((lon - center_lon + 180) % 360) - 180
    lam = math.radians(shifted_lon)
    phi = math.radians(max(-89.999, min(89.999, lat)))
    a1, a2, a3, a4 = 1.340264, -0.081106, 0.000893, 0.003796
    theta = math.asin(math.sqrt(3) / 2 * math.sin(phi))
    theta2 = theta * theta
    theta6 = theta2 * theta2 * theta2
    denominator = 3 * (9 * a4 * theta6 * theta2 + 7 * a3 * theta6 + 3 * a2 * theta2 + a1)
    x = 2 * math.sqrt(3) * lam * math.cos(theta) / denominator
    y = theta * (a4 * theta6 * theta2 + a3 * theta6 + a2 * theta2 + a1)
    margin_x, margin_y = 68, 58
    return (
        margin_x + (x + 2.70663) / (2 * 2.70663) * (size[0] - margin_x * 2),
        margin_y + (1.31736 - y) / (2 * 1.31736) * (size[1] - margin_y * 2),
    )


def segmented_line(draw, points, fill, width):
    segment = []
    for point in points:
        if segment and abs(point[0] - segment[-1][0]) > 420:
            if len(segment) > 1:
                draw.line(segment, fill=fill, width=width, joint="curve")
            segment = []
        segment.append(point)
    if len(segment) > 1:
        draw.line(segment, fill=fill, width=width, joint="curve")


def bezier_points(start, end, lift, count=96):
    control1 = (start[0] + (end[0] - start[0]) * 0.28, min(start[1], end[1]) - lift)
    control2 = (start[0] + (end[0] - start[0]) * 0.72, min(start[1], end[1]) - lift * 0.78)
    points = []
    for index in range(count + 1):
        t = index / count
        inverse = 1 - t
        x = inverse**3 * start[0] + 3 * inverse**2 * t * control1[0] + 3 * inverse * t**2 * control2[0] + t**3 * end[0]
        y = inverse**3 * start[1] + 3 * inverse**2 * t * control1[1] + 3 * inverse * t**2 * control2[1] + t**3 * end[1]
        points.append((x, y))
    return points


def render_global_availability():
    size = GLOBAL_SIZE
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width]
    xn = xx.astype(np.float32) / width
    yn = yy.astype(np.float32) / height

    base = np.asarray([2, 17, 29], dtype=np.float32)
    lit = np.asarray([7, 50, 59], dtype=np.float32)
    atlantic = np.exp(-(((xn - 0.47) / 0.34) ** 2 + ((yn - 0.43) / 0.52) ** 2))
    edge = np.clip(((xn - 0.5) ** 2 + (yn - 0.46) ** 2) * 0.52, 0, 0.26)
    ocean = base + atlantic[..., None] * (lit - base) * 0.74
    ocean *= 1 - edge[..., None]
    ocean += ((np.sin(xn * 23 + yn * 7) + np.cos(yn * 31)) * 0.48)[..., None]
    image = Image.fromarray(np.clip(ocean, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    grid = Image.new("RGBA", size, (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for latitude in (-60, -30, 0, 30, 60):
        segmented_line(grid_draw, [equal_earth_project(lon, latitude, size) for lon in range(-180, 181, 2)], (126, 173, 168, 26), 2)
    for longitude in range(-180, 180, 30):
        segmented_line(grid_draw, [equal_earth_project(longitude, lat, size) for lat in range(-86, 87, 2)], (126, 173, 168, 22), 2)
    image = Image.alpha_composite(image, grid)

    reader = shapefile.Reader(str(DATA / "countries110" / "ne_110m_admin_0_countries.shp"))
    fields = [field[0] for field in reader.fields[1:]]
    land = Image.new("RGBA", size, (0, 0, 0, 0))
    land_draw = ImageDraw.Draw(land)
    shadows = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadows)
    palette = [(31, 70, 62), (39, 79, 69), (50, 86, 72), (61, 87, 70), (70, 88, 69)]

    for record, shape in zip(reader.records(), reader.shapes()):
        values = dict(zip(fields, record))
        country = values.get("ADMIN") or ""
        color = palette[sum(ord(character) for character in country) % len(palette)]
        if country == "United States of America":
            color = (111, 97, 61)
        for ring in rings(shape):
            if len(ring) < 4:
                continue
            points = [equal_earth_project(lon, lat, size) for lon, lat in ring]
            if max(x for x, _ in points) - min(x for x, _ in points) > width * 0.74:
                continue
            shadow_draw.polygon([(x + 1, y + 9) for x, y in points], fill=(0, 0, 0, 92))
            outline = (222, 202, 144, 190) if country == "United States of America" else (143, 169, 150, 54)
            land_draw.polygon(points, fill=(*color, 246), outline=outline, width=4 if country == "United States of America" else 2)

    image = Image.alpha_composite(image, shadows.filter(ImageFilter.GaussianBlur(7)))
    image = Image.alpha_composite(image, land)

    light_array = np.zeros((height, width, 4), dtype=np.uint8)
    wash = np.exp(-(((xn - 0.34) / 0.36) ** 2 + ((yn - 0.22) / 0.42) ** 2))
    light_array[..., :3] = np.asarray([221, 205, 153], dtype=np.uint8)
    light_array[..., 3] = np.clip(wash * 28, 0, 28).astype(np.uint8)
    image = Image.alpha_composite(image, Image.fromarray(light_array, "RGBA"))

    origin = equal_earth_project(*CITIES["Central New Jersey"], size)
    reach_targets = [(-146, 42, 135), (-102, 34, 210), (15, 50, 250), (58, 18, 330), (126, 34, 420), (-48, -38, 250)]
    reach_glow = Image.new("RGBA", size, (0, 0, 0, 0))
    reach_glow_draw = ImageDraw.Draw(reach_glow)
    reach = Image.new("RGBA", size, (0, 0, 0, 0))
    reach_draw = ImageDraw.Draw(reach)
    for lon, lat, lift in reach_targets:
        points = bezier_points(origin, equal_earth_project(lon, lat, size), lift)
        reach_glow_draw.line(points, fill=(222, 184, 104, 72), width=13, joint="curve")
        for index in range(len(points) - 1):
            progress = index / (len(points) - 1)
            alpha = int(180 * (1 - progress * 0.68))
            reach_draw.line((points[index], points[index + 1]), fill=(231, 198, 121, alpha), width=3)
    image = Image.alpha_composite(image, reach_glow.filter(ImageFilter.GaussianBlur(13)))
    image = Image.alpha_composite(image, reach)

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    halo = Image.new("RGBA", size, (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    halo_draw.ellipse((origin[0] - 64, origin[1] - 64, origin[0] + 64, origin[1] + 64), fill=(230, 190, 101, 100))
    overlay = Image.alpha_composite(overlay, halo.filter(ImageFilter.GaussianBlur(31)))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((origin[0] - 22, origin[1] - 22, origin[0] + 22, origin[1] + 22), fill=(5, 27, 35, 245), outline=(244, 223, 164, 235), width=4)
    draw.ellipse((origin[0] - 7, origin[1] - 7, origin[0] + 7, origin[1] + 7), fill=(214, 144, 79, 255))
    draw_label(overlay, origin, (origin[0] + 40, origin[1] - 82), "CNJ", primary=True, secondary="Base", font_size=50)
    image = Image.alpha_composite(image, overlay)

    frame = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle((22, 22, width - 22, height - 22), radius=28, outline=(207, 193, 148, 58), width=2)
    return Image.alpha_composite(image, frame).convert("RGB")


def main():
    global DATA
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DATA)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "assets" / "location")
    args = parser.parse_args()
    DATA = args.data_dir.resolve()
    output_dir = args.output_dir.resolve()

    required = (
        DATA / "admin1" / "ne_10m_admin_1_states_provinces.shp",
        DATA / "countries110" / "ne_110m_admin_0_countries.shp",
    )
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        parser.error("Missing Natural Earth inputs: " + ", ".join(missing))

    output_dir.mkdir(parents=True, exist_ok=True)
    regional_path = output_dir / "northeast-access.webp"
    global_path = output_dir / "global-engagements.webp"
    render_regional_schematic().save(regional_path, "WEBP", quality=92, method=6)
    render_global_availability().save(global_path, "WEBP", quality=92, method=6)
    print(regional_path)
    print(global_path)


if __name__ == "__main__":
    main()
