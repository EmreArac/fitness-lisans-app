from PIL import Image, ImageDraw

BG = (11, 12, 14, 255)       # --bg
GREEN = (88, 204, 2, 255)    # --green

def make_icon(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.06)
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.22), fill=BG)

    cx, cy = size / 2, size / 2
    bar_w = size * 0.56
    bar_h = size * 0.085
    d.rounded_rectangle(
        [cx - bar_w / 2, cy - bar_h / 2, cx + bar_w / 2, cy + bar_h / 2],
        radius=bar_h / 2, fill=GREEN,
    )

    plate_w = size * 0.11
    plate_h = size * 0.34
    for sign in (-1, 1):
        x = cx + sign * (bar_w / 2 - plate_w * 0.3)
        d.rounded_rectangle(
            [x - plate_w / 2, cy - plate_h / 2, x + plate_w / 2, cy + plate_h / 2],
            radius=plate_w * 0.35, fill=GREEN,
        )
        plate_w2 = size * 0.075
        plate_h2 = size * 0.22
        x2 = cx + sign * (bar_w / 2 + plate_w * 0.25)
        d.rounded_rectangle(
            [x2 - plate_w2 / 2, cy - plate_h2 / 2, x2 + plate_w2 / 2, cy + plate_h2 / 2],
            radius=plate_w2 * 0.35, fill=GREEN,
        )

    img.save(path)
    print("wrote", path, size)

make_icon(192, r"C:\Users\Emre\Desktop\FitnessLisansApp\icons\icon-192.png")
make_icon(512, r"C:\Users\Emre\Desktop\FitnessLisansApp\icons\icon-512.png")
make_icon(180, r"C:\Users\Emre\Desktop\FitnessLisansApp\icons\apple-touch-icon.png")
