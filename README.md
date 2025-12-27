# CipherShare 

Anonymous & Secure File and Secret Sharing using AES Encryption

CipherShare is a privacy-first web application that enables anonymous, end-to-end encrypted sharing of text and files. All encryption and decryption occur client-side, ensuring that sensitive data is never exposed to the server.

## Motivation

Traditional file-sharing platforms often rely on server-side encryption or persistent links, creating security risks. CipherShare eliminates these risks by adopting a zero-knowledge architecture, where only the sender and receiver can access the data.

 ## System Architecture

Client–Server architecture with strong client-side security

Client (Browser)

Encrypts & decrypts data using AES-256

Generates encryption keys locally

Handles file processing and UI

Backend (FastAPI)

Stores only encrypted data

Enforces expiry, one-time access, and PIN validation

Never receives encryption keys

Database (MongoDB)

Stores encrypted payloads and metadata only

Zero-knowledge storage model

## Security Design

AES-256 encryption performed entirely in the browser

Encryption key stored in URL fragment (#) — never sent to the server

Optional PIN protection (hashed)

One-time view and time-based expiration

Automatic deletion after access or expiry

## Features

Anonymous usage (no login required)

Secure text and file sharing

One-time secret access

Time-based expiration

QR-code-based sharing

Responsive UI with dark/light mode

Zero-knowledge server architecture

## Technology Stack

Frontend: React, Tailwind CSS

Backend: FastAPI (Python)

Database: MongoDB

Cryptography: AES (Advanced Encryption Standard)

## Installation & Setup
```
Prerequisites

Node.js

Python 3.9+

MongoDB
```

## Backend Setup
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
## Frontend Setup
```
cd frontend
npm install
npm start

Access Application
http://localhost:3000
```

## How AES Encryption is Used

A unique AES-256 key and IV are generated in the browser

Secret or file is encrypted before upload

Encrypted data is stored on the server

Decryption occurs only in the recipient’s browser

Server never sees plaintext or keys

This ensures true end-to-end encryption.

## Testing

Black Box Testing for functionality validation

White Box Testing for internal logic verification

Verified scenarios:

Encryption & decryption

One-time access

Expiry enforcement

PIN authentication

## Use Cases

Secure password sharing

API key transmission

Confidential file sharing

Anonymous communication

Privacy-focused collaboration
