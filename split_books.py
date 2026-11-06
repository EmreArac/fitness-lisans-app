SP = r"C:\Users\Emre\AppData\Local\Temp\claude\8c1af07e0dd4604f\ad11ff7d-0939-4d29-9fd8-f9a9682bb631\scratchpad\pdftxt"

books = {
    "saglik": (SP + r"\saglik_full.txt", [273, 1767, 3619, 5132, 5983]),
    "yonetim": (SP + r"\yonetim_full.txt", [296, 2211, 3405, 4596, 6603]),
    "ogrenme": (SP + r"\ogrenme_full.txt", [328, 1426, 2042, 3864, 5387, 6498]),
}

for name, (path, starts) in books.items():
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()
    n = len(lines)
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else n
        chunk = lines[start - 1:end]
        outpath = SP + "\\" + name + "_unite" + str(i + 1) + ".txt"
        with open(outpath, "w", encoding="utf-8") as out:
            out.writelines(chunk)
        print(name, "unite", i + 1, ":", start, "-", end, "(", len(chunk), "lines) ->", outpath)
