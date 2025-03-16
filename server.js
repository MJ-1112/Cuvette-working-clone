import express from "express";
import dotenv from 'dotenv';
import app from './server2.js';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});