const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = 9231;
const TEAM_ID = "code888";
const MQTT_BROKER = "mqtt://157.173.101.159:1883";
const MONGO_URI = process.env.MONGODB_URI;

// ---------------- MongoDB Schemas ----------------
const cardSchema = new mongoose.Schema({
  card_uid: { type: String, required: true, unique: true },
  uid: { type: String, required: true, unique: true },
  holderName: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastTopup: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

cardSchema.pre('validate', function () {
  if (this.uid && !this.card_uid) this.card_uid = this.uid;
  if (this.card_uid && !this.uid) this.uid = this.card_uid;
});

const Card = mongoose.model('Card', cardSchema, 'cards');

const transactionSchema = new mongoose.Schema({
  card_uid: { type: String, required: true, index: true },
  uid: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['TOPUP', 'PAYMENT'], required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema, 'transactions');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: 'General' },
  emoji: { type: String, default: '📦' },
  active: { type: Boolean, default: true }
});

const Product = mongoose.model('Product', productSchema, 'products');

// ---------------- MQTT ----------------
const TOPIC_STATUS = `rfid/${TEAM_ID}/card/status`;
const TOPIC_BALANCE = `rfid/${TEAM_ID}/card/balance`;
const TOPIC_TOPUP = `rfid/${TEAM_ID}/card/topup`;
const TOPIC_PAY = `rfid/${TEAM_ID}/card/pay`;

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  mqttClient.subscribe(TOPIC_STATUS);
  mqttClient.subscribe(TOPIC_BALANCE);
});

mqttClient.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    if (topic === TOPIC_STATUS) {
      const { uid, balance } = payload;
      let card = await Card.findOne({ uid });

      if (!card) {
        console.log(`New card detected: ${uid}, creating record...`);
        card = new Card({
          uid,
          holderName: 'New User',
          balance: balance || 0,
          lastTopup: 0
        });
        await card.save();
      }

      io.emit('card-status', {
        uid: card.uid,
        balance: card.balance,
        holderName: card.holderName,
        status: 'detected'
      });
    } else if (topic === TOPIC_BALANCE) {
      io.emit('card-balance', payload);
    }
  } catch (err) {
    console.error('Failed to parse MQTT message or save card:', err);
  }
});

// ---------------- Seed Products ----------------
async function seedProducts() {
  try {
    const count = await Product.estimatedDocumentCount();
    if (count > 0) return;

    const demoProducts = [
      { name: 'Water Bottle', price: 500, category: 'Food & Drinks', emoji: '💧', active: true },
      { name: 'Orange Juice', price: 800, category: 'Food & Drinks', emoji: '🍊', active: true },
      { name: 'Sandwich', price: 1200, category: 'Food & Drinks', emoji: '🥪', active: true },
      { name: 'Coffee', price: 700, category: 'Food & Drinks', emoji: '☕', active: true },
      { name: 'Energy Drink', price: 1000, category: 'Food & Drinks', emoji: '⚡', active: true },
      { name: 'Chocolate Bar', price: 400, category: 'Snacks', emoji: '🍫', active: true },
      { name: 'Notebook', price: 1500, category: 'Stationery', emoji: '📓', active: true },
      { name: 'USB Cable', price: 2000, category: 'Electronics', emoji: '🔌', active: true },
      { name: 'Hand Sanitizer', price: 600, category: 'Personal Care', emoji: '🧴', active: true }
    ];

    await Product.insertMany(demoProducts);
    console.log('Seeded demo products collection');
  } catch (err) {
    console.error('Failed to seed products:', err);
  }
}

// ---------------- REST API Endpoints ----------------
app.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find({});
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

app.get('/card/:uid', async (req, res) => {
  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

app.post('/topup', async (req, res) => {
  try {
    const { uid, amount, holderName } = req.body;
    let card = await Card.findOne({ uid });
    if (!card) {
      if (!holderName) return res.status(400).json({ error: 'Name required for new cards', success: false });
      card = new Card({ uid, holderName, balance: 0, lastTopup: 0 });
    } else if (holderName && card.holderName === 'New User') {
      card.holderName = holderName;
    }

    // Add amount
    card.balance += amount;
    card.lastTopup = amount;
    card.updatedAt = new Date();
    await card.save();

    // Create transaction
    const tx = new Transaction({
      card_uid: card.card_uid,
      uid: card.uid,
      amount,
      type: 'TOPUP',
      balanceBefore: card.balance - amount,
      balanceAfter: card.balance,
      description: 'Top-up via Dashboard'
    });
    await tx.save();

    // Emit MQTT messages
    const mqttMsg = { uid, amount, newBalance: card.balance };
    mqttClient.publish(TOPIC_TOPUP, JSON.stringify(mqttMsg));

    // Emit WebSocket updates
    io.emit('card-balance', { uid, new_balance: card.balance, success: true });
    io.emit('transaction-update', {
      card_uid: uid,
      operation_type: 'TOPUP',
      status: 'success',
      amount,
      new_balance: card.balance,
      message: 'Top-up successful'
    });

    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/pay', async (req, res) => {
  try {
    const { card_uid, product_id, quantity } = req.body;
    const qty = quantity || 1;

    const card = await Card.findOne({ uid: card_uid });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const totalAmount = product.price * qty;
    if (card.balance < totalAmount) {
      io.emit('transaction-update', {
        card_uid,
        operation_type: 'PAYMENT',
        status: 'failed',
        amount: totalAmount,
        new_balance: card.balance,
        product_name: product.name,
        quantity: qty,
        message: 'Insufficient balance'
      });
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Process payment
    card.balance -= totalAmount;
    card.updatedAt = new Date();
    await card.save();

    const tx = new Transaction({
      card_uid: card.card_uid,
      uid: card.uid,
      amount: totalAmount,
      type: 'PAYMENT',
      balanceBefore: card.balance + totalAmount,
      balanceAfter: card.balance,
      description: `Payment: ${qty}x ${product.name}`,
      productId: product._id,
      productName: product.name
    });
    await tx.save();

    const mqttMsg = { uid: card_uid, amount: totalAmount, newBalance: card.balance, success: true };
    mqttClient.publish(TOPIC_PAY, JSON.stringify(mqttMsg));

    io.emit('card-balance', { uid: card_uid, new_balance: card.balance, success: true });
    io.emit('transaction-update', {
      card_uid,
      operation_type: 'PAYMENT',
      status: 'success',
      amount: totalAmount,
      new_balance: card.balance,
      product_name: product.name,
      quantity: qty,
      message: 'Payment completed'
    });

    res.json({ success: true, new_balance: card.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ active: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const txs = await Transaction.find({}).sort({ timestamp: -1 }).limit(limit);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ---------------- MongoDB Connection & Server Start ----------------
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedProducts();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on http://0.0.0.0:${PORT}`);
      console.log(`Access from: http://157.173.101.159:${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// ---------------- WebSocket ----------------
io.on('connection', (socket) => {
  console.log('A user connected to the dashboard');
  socket.on('disconnect', () => console.log('User disconnected'));
});