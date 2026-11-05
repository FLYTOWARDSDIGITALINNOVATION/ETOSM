path = "C:/Users/sanka/.gemini/antigravity/brain/1b708a9b-917a-44d9-8d78-134f716055f7/scratch/test_quotation_pdf.mjs"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace bottomY
text = text.replace("let bottomY = Math.max(tableY + 6, 142);", "let bottomY = tableY + 8;")

# Replace footerY
old_footer = """  let footerY = Math.max(bottomY + 44, totalsY + 12);
  footerY = Math.min(Math.max(footerY, 215), 235);"""

new_footer = """  let footerY = Math.max(bottomY + 40, totalsY + 10);"""

text = text.replace(old_footer, new_footer)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated test script spacing!")
