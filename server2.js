import express from 'express';
import bodyParser from "body-parser";
import pg from "pg";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create express app
const app = express();

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "Assets")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Create a database pool (better for handling multiple connections)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Connection options
  connectionTimeoutMillis: 5000,
  max: 10 // Number of clients in the pool
});

// Test database connection
pool.connect()
  .then(client => {
    console.log("Database connected successfully");
    client.release(); // Release the client back to the pool
  })
  .catch(err => {
    console.error("Database connection error:", err);
  });

// Routes
app.get("/", (req, res) => {
    res.redirect("/full-time");
});

app.get("/full-time", async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query("SELECT * FROM companydetails");
        res.render("Full-Time", { companyData: result.rows });
    } catch (err) {
        console.error("Error fetching full-time jobs:", err);
        res.render("Full-Time", { companyData: [] });
    } finally {
        client.release(); // Important: release the client back to the pool
    }
});

app.get("/other", async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query("SELECT * FROM othercompany");
        res.render("Other", { 
            title: "Other Jobs",
            companyData: result.rows 
        });
    } catch (err) {
        console.error("Error fetching other jobs:", err);
        res.render("Other", { 
            title: "Other Jobs",
            companyData: []
        });
    } finally {
        client.release();
    }
});

// Update the rest of your routes to use the pool similarly
app.post("/submit", async (req, res) => {
    const client = await pool.connect();
    try {
        const { search, officetype, experience, salary } = req.body;
        
        // Build simple query with filters
        let query = "SELECT * FROM companydetails WHERE 1=1";
        const params = [];
        let paramCounter = 1;
        
        // Add filters if provided
        if (search && search.trim() !== '') {
            query += ` AND companyname ILIKE $${paramCounter}`;
            params.push(`%${search}%`);
            paramCounter++;
        }
        
        if (officetype) {
            const officeTypeValue = officetype === 'remote' ? 'Remote/Hybrid' : 'In-office';
            query += ` AND modetype = $${paramCounter}`;
            params.push(officeTypeValue);
            paramCounter++;
        }
        
        if (experience && experience !== '') {
            query += ` AND experience ILIKE $${paramCounter}`;
            params.push(`%${experience}%`);
            paramCounter++;
        }
        
        if (salary) {
            query += ` AND CAST(SUBSTRING(offer FROM '^[0-9]+') AS INTEGER) <= $${paramCounter}`;
            params.push(parseInt(salary));
            paramCounter++;
        }
                
        const result = await client.query(query, params);
        res.render("Full-Time", { companyData: result.rows });
    } catch (err) {
        console.error("Error filtering jobs:", err);
        res.render("Full-Time", { companyData: [] });
    } finally {
        client.release();
    }
});

// Update all other route handlers similarly...

export default app;