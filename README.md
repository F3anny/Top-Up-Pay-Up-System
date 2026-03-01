EdgeWallet RFID Payment System

Live URL:
http://157.173.101.159:9231/

A simple RFID-based wallet system built with ESP8266, MQTT, Node.js, and MongoDB.
Supports real-time top-up, payments, and transaction tracking.

🏗 Architecture

ESP8266 ↔ Backend → MQTT

Dashboard → Backend → HTTP

Backend → Dashboard → WebSocket

Devices use MQTT.
Users use HTTP.
Backend validates and stores all transactions.

👥 Team Info

Team ID: quantum_bitflip_0xDEAD

Server: 157.173.101.159

Port: 9231

MQTT Broker: 157.173.101.159:1883

🚀 Run the Backend
cd backend
npm install
npm start
Production (PM2)
pm2 start backend/server.js --name edgewallet
pm2 save
pm2 startup
📡 API Endpoints

GET /cards

GET /card/:uid

POST /topup

POST /pay

GET /transactions

📡 MQTT Base Topic
rfid/quantum_bitflip_0xDEAD/

ESP8266 publishes:

card/status

card/balance

Backend publishes:

card/topup

card/pay

No wildcards allowed.

🔒 Safe Wallet Rule

Balance update and transaction record must succeed together.
If one fails, nothing is saved.

📂 Structure
backend/
frontend/
firmware/
README.md

Devices speak MQTT.
Users speak HTTP.
Backend controls everything. 🚀
