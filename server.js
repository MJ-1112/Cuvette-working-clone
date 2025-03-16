import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import app from './server2.js';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});