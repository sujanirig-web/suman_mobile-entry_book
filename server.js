const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'repairs.json');
const BACKUP_FILE = path.join(__dirname, 'repairs.corrupt.bak.json');
const UPDATABLE_FIELDS = ['customerName', 'phone', 'passcode', 'model', 'issue', 'status', 'totalAmount', 'paidAmount', 'paymentStatus', 'photo', 'createdAt'];

// Ensure file exists
const initFile = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
};


const readData = () => {
    initFile();
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("Read error:", err);
        try {
            fs.copyFileSync(DATA_FILE, BACKUP_FILE);
            console.error("Corrupt data backed up to", BACKUP_FILE);
        } catch (backupErr) {
            console.error("Backup failed:", backupErr);
        }
        return [];
    }
};

// Write data safely (atomic: temp file + rename)
const writeData = (data) => {
    const tmpFile = DATA_FILE + '.tmp';
    try {
        fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
        fs.renameSync(tmpFile, DATA_FILE);
        return true;
    } catch (err) {
        console.error("Write error:", err);
        return false;
    }
};


const generateId = () => Date.now().toString() + Math.random().toString(36).slice(2, 7);

//  ROUTES 
app.get('/api/repairs', (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch repairs" });
    }
});


app.post('/api/repairs', (req, res) => {
    try {
        const customerName = String(req.body.customerName || "").trim();
        const phone = String(req.body.phone || "").trim();

        // Basic validation
        if (!customerName || !phone) {
            return res.status(400).json({ error: "Customer name and phone are required" });
        }

        const data = readData();

        const newRepair = {
            id: generateId(),
            customerName,
            phone,
            passcode: String(req.body.passcode || ""),
            model: String(req.body.model || ""),
            issue: String(req.body.issue || ""),
            status: String(req.body.status || "pending"),
            totalAmount: Math.max(0, Number(req.body.totalAmount) || 0),
            paidAmount: Math.max(0, Number(req.body.paidAmount) || 0),
            paymentStatus: String(req.body.paymentStatus || "credit"),
            photo: String(req.body.photo || ""),
            createdAt: String(req.body.createdAt || new Date().toISOString())
        };

        data.push(newRepair);
        if (!writeData(data)) {
            return res.status(500).json({ error: "Failed to persist repair" });
        }

        res.status(201).json(newRepair);
    } catch (err) {
        res.status(500).json({ error: "Failed to add repair" });
    }
});


app.put('/api/repairs/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.findIndex(r => r.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: "Repair not found" });
        }

        const updates = {};
        for (const field of UPDATABLE_FIELDS) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        data[index] = {
            ...data[index],
            ...updates,
            id: data[index].id // prevent ID overwrite
        };

        if (!writeData(data)) {
            return res.status(500).json({ error: "Failed to persist update" });
        }

        res.json(data[index]);
    } catch (err) {
        res.status(500).json({ error: "Failed to update repair" });
    }
});


app.delete('/api/repairs/:id', (req, res) => {
    try {
        const data = readData();
        const newData = data.filter(r => r.id !== req.params.id);

        if (data.length === newData.length) {
            return res.status(404).json({ error: "Repair not found" });
        }

        if (!writeData(newData)) {
            return res.status(500).json({ error: "Failed to persist delete" });
        }

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete repair" });
    }
});


app.get('/api/fix-ids', (req, res) => {
    try {
        let data = readData();

        data = data.map(item => ({
            ...item,
            id: item.id || generateId()
        }));

        writeData(data);

        res.json({ message: "All records now have IDs", data });
    } catch (err) {
        res.status(500).json({ error: "Failed to fix IDs" });
    }
});

// SERVER 
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(` Server running on http://localhost:${PORT}`);
});
