path = "C:/Users/sanka/.gemini/antigravity/brain/1b708a9b-917a-44d9-8d78-134f716055f7/scratch/test_quotation_pdf.mjs"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace('Rate (₹)', 'Rate (Rs.)')
text = text.replace('Total (₹)', 'Total (Rs.)')
text = text.replace('`₹0.00`', '`Rs. 0.00`')

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated test script successfully!")
