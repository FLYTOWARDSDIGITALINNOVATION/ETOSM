import re

server_path = "backend/server.js"

with open(server_path, "r", encoding="utf-8") as f:
    code = f.read()

# Lines 2132 to 2169 block:
old_crud_block = """// GET SINGLE INVOICE (ADMIN)
app.get("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    console.error("Failed to fetch invoice:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

// UPDATE INVOICE / STATUS (ADMIN)
app.put("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update invoice:", err);
    res.status(500).json({ message: "Failed to update invoice" });
  }
});

// DELETE INVOICE (ADMIN)
app.delete("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Failed to delete invoice:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});"""

new_crud_block = """// GET SINGLE INVOICE (ADMIN)
app.get("/admin/invoices/:id", verifyAdmin, async (req, res, next) => {
  if (req.params.id === "paid" || req.params.id === "pending" || req.params.id === "next-number") {
    return next();
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid invoice ID" });
  }
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    console.error("Failed to fetch invoice:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

// UPDATE INVOICE / STATUS (ADMIN)
app.put("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid invoice ID" });
  }
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update invoice:", err);
    res.status(500).json({ message: "Failed to update invoice" });
  }
});

// DELETE INVOICE (ADMIN)
app.delete("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid invoice ID" });
  }
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Failed to delete invoice:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});"""

target_insertion = """// RECORD PAYMENT / MANAGE PAYMENT STATUS (ADMIN MODULE 4)
app.post("/admin/invoices/:id/record-payment", verifyAdmin, async (req, res) => {"""

replacement_insertion = new_crud_block + "\n\n" + """// RECORD PAYMENT / MANAGE PAYMENT STATUS (ADMIN MODULE 4)
app.post("/admin/invoices/:id/record-payment", verifyAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid invoice ID" });
  }"""

# Normalize newlines for matching
is_crlf = "\r\n" in code
code_norm = code.replace("\r\n", "\n")
old_crud_norm = old_crud_block.replace("\r\n", "\n")
target_norm = target_insertion.replace("\r\n", "\n")
replacement_norm = replacement_insertion.replace("\r\n", "\n")

if old_crud_norm in code_norm and target_norm in code_norm:
    # 1. Remove old block
    code_norm = code_norm.replace(old_crud_norm + "\n\n", "")
    # 2. Insert new block above record-payment
    code_norm = code_norm.replace(target_norm, replacement_norm)
    
    if is_crlf:
        code_final = code_norm.replace("\n", "\r\n")
    else:
        code_final = code_norm
        
    with open(server_path, "w", encoding="utf-8") as f:
        f.write(code_final)
    print("Successfully moved invoice CRUD routes after /paid and /pending!")
else:
    print("Could not find matching blocks in backend/server.js!")
