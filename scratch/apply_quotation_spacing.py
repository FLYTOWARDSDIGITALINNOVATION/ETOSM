path = "frontend/src/admin/QuotationManagementPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace bottomY
text = text.replace("let bottomY = Math.max(tableY + 6, 142);", "let bottomY = tableY + 8;")

# Replace footerY
old_footer = """      let footerY = Math.max(bottomY + 44, totalsY + 12);
      footerY = Math.min(Math.max(footerY, 215), 235);"""

new_footer = """      let footerY = Math.max(bottomY + 40, totalsY + 10);"""

if old_footer.replace("\n", "\r\n") in text:
    text = text.replace(old_footer.replace("\n", "\r\n"), new_footer.replace("\n", "\r\n"))
elif old_footer in text:
    text = text.replace(old_footer, new_footer)
else:
    print("Warning: old_footer not found directly!")

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated QuotationManagementPage.jsx spacing successfully!")
