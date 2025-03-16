import express from 'express';
import bodyParser from "body-parser";
import pg from "pg";
import path from 'path';
import { fileURLToPath } from 'url';

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
const getDbPool = () => {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Set shorter connection timeout
      connectionTimeoutMillis: 5000,
      // Limit how many connections to create at once
      max: 1
    });
  };

// Database connection
const dbConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      user: "postgres",
      host: "localhost",
      database: "company",
      password: "#Mah1kW1ns",
      port: 5432
    };

const db = new pg.Client(dbConfig);
app.get("/full-time", async (req, res) => {
    const db = getDbPool();
    try {
        const result = await db.query("SELECT * FROM companydetails");
        res.render("Full-Time", { companyData: result.rows });
    } catch (err) {
        console.error("Error fetching full-time jobs:", err);
        res.render("Full-Time", { companyData: [] });
    } finally {
        db.end(); // Important: release the pool
    }
});

// Routes
app.get("/", (req, res) => {
    res.redirect("/full-time");
});

app.get("/full-time", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM companydetails");
        res.render("Full-Time", { companyData: result.rows });
    } catch (err) {
        console.error("Error fetching full-time jobs:", err);
        res.render("Full-Time", { companyData: [] });
    }
});

app.get("/other", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM othercompany");
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
    }
});

app.post("/submit", async (req, res) => {
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
                
        const result = await db.query(query, params);
        res.render("Full-Time", { companyData: result.rows });
    } catch (err) {
        console.error("Error filtering jobs:", err);
        res.render("Full-Time", { companyData: [] });
    }
});

app.post("/submit-other", async (req, res) => {
    try {
        const { search, officetype, jobtype, salary } = req.body;
        
        // Build simple query with filters
        let query = "SELECT * FROM othercompany WHERE 1=1";
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
        
        if (jobtype) {
            query += ` AND jobtype = $${paramCounter}`;
            params.push(jobtype);
            paramCounter++;
        }
        
        if (salary) {
            query += ` AND CAST(SUBSTRING(offer FROM '^[0-9]+') AS INTEGER) <= $${paramCounter}`;
            params.push(parseInt(salary));
            paramCounter++;
        }
                
        const result = await db.query(query, params);
        res.render("Other", { 
            title: "Other Jobs",
            companyData: result.rows 
        });
    } catch (err) {
        console.error("Error filtering other jobs:", err);
        res.render("Other", { 
            title: "Other Jobs",
            companyData: [] 
        });
    }
});

// Job details route
app.get("/job-details/:id", async (req, res) => {
    try {
        const jobId = req.params.id;
        const result = await db.query("SELECT * FROM companydetails WHERE id = $1", [jobId]);
        
        if (result.rows.length > 0) {
            res.render("JobDetails", { job: result.rows[0] });
        } else {
            // Try to find in other jobs table
            const otherResult = await db.query("SELECT * FROM othercompany WHERE id = $1", [jobId]);
            
            if (otherResult.rows.length > 0) {
                res.render("JobDetails", { job: otherResult.rows[0] });
            } else {
                res.status(404).send("Job not found");
            }
        }
    } catch (err) {
        console.error("Error fetching job details:", err);
        res.status(500).send("Server error");
    }
});

// Application form page
app.get("/apply/:jobId/:jobTable", async (req, res) => {
    try {
        const { jobId, jobTable } = req.params;
        const tableName = jobTable === 'fulltime' ? 'companydetails' : 'othercompany';
        
        const result = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [jobId]);
        
        if (result.rows.length > 0) {
            res.render("ApplyForm", { 
                job: result.rows[0],
                jobTable: jobTable
            });
        } else {
            res.status(404).send("Job not found");
        }
    } catch (err) {
        console.error("Error fetching job for application:", err);
        res.status(500).send("Server error");
    }
});

// Process job application
app.post("/apply-job", async (req, res) => {
    try {
        const {
            jobId,
            jobTable,
            name,
            email,
            phone,
            coverLetter
        } = req.body;
        
        // Simple user ID for demo
        const userId = "user123";
        
        // Get application URL from appropriate company table
        const tableName = jobTable === 'fulltime' ? 'companydetails' : 'othercompany';
        const jobResult = await db.query(`SELECT url FROM ${tableName} WHERE id = $1`, [jobId]);
        
        if (jobResult.rows.length > 0) {
            const applicationUrl = jobResult.rows[0].url;
            
            // For demo - show success page with the URL from the job listing
            res.render("ApplicationSuccess", { 
                name: name,
                email: email,
                jobId: jobId,
                applicationUrl: applicationUrl
            });
        } else {
            throw new Error("Job not found");
        }
    } catch (err) {
        console.error("Error processing application:", err);
        res.status(500).render("ApplicationError", { 
            error: "There was an error submitting your application. Please try again later."
        });
    }
});

// View user's applications (simplified - no database storage)
app.get("/my-applications", async (req, res) => {
    try {
        // Simplified - just show a message since we're not storing applications
        res.render("MyApplications", { 
            message: "Your application has been submitted. Please check your email for updates."
        });
    } catch (err) {
        console.error("Error loading applications page:", err);
        res.status(500).send("Server error");
    }
});

export default app;