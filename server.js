const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({ origin: "*" })); // change later for production
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'repairs.json');

// Ensure file exists
const initFile = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
};

// Read data safely
const readData = () => {
    initFile();
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data || "[]");
    } catch (err) {
        console.error("Read error:", err);
        return [];
    }
};

// Write data safely
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Write error:", err);
    }
};

// Generate unique ID
const generateId = () => Date.now().toString();

// ================= ROUTES =================

// 1. GET ALL
app.get('/api/repairs', (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch repairs" });
    }
});

// 2. ADD NEW
app.post('/api/repairs', (req, res) => {
    try {
        const { customerName, phone } = req.body;

        // Basic validation
        if (!customerName || !phone) {
            return res.status(400).json({ error: "Customer name and phone are required" });
        }

        const data = readData();

        const newRepair = {
            id: generateId(),
            customerName: req.body.customerName || "",
            phone: req.body.phone || "",
            passcode: req.body.passcode || "",
            model: req.body.model || "",
            issue: req.body.issue || "",
            status: req.body.status || "pending",
            totalAmount: req.body.totalAmount || 0,
            paidAmount: req.body.paidAmount || 0,
            paymentStatus: req.body.paymentStatus || "credit",
            photo: req.body.photo || "",
            createdAt: req.body.createdAt || new Date().toISOString()
        };

        data.push(newRepair);
        writeData(data);

        res.status(201).json(newRepair);
    } catch (err) {
        res.status(500).json({ error: "Failed to add repair" });
    }
});

// 3. UPDATE
app.put('/api/repairs/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.findIndex(r => r.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: "Repair not found" });
        }

        data[index] = {
            ...data[index],
            ...req.body,
            id: data[index].id // prevent ID overwrite
        };

        writeData(data);

        res.json(data[index]);
    } catch (err) {
        res.status(500).json({ error: "Failed to update repair" });
    }
});

// 4. DELETE
app.delete('/api/repairs/:id', (req, res) => {
    try {
        const data = readData();
        const newData = data.filter(r => r.id !== req.params.id);

        if (data.length === newData.length) {
            return res.status(404).json({ error: "Repair not found" });
        }

        writeData(newData);

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete repair" });
    }
});

// 5. FIX OLD DATA (VERY IMPORTANT 🔥)
app.get('/api/fix-ids', (req, res) => {
    try {
        let data = readData();

        data = data.map(item => ({
            id: item.id || generateId() + Math.random(),
            ...item
        }));

        writeData(data);

        res.json({ message: "All records now have IDs", data });
    } catch (err) {
        res.status(500).json({ error: "Failed to fix IDs" });
    }
});

// ================= SERVER =================
const PORT = 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});