import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "company",
    password: "#Mah1kW1ns",
    port: 5432
});

db.connect().then(() => { console.log("Connected"); });


app.get("/", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM companydetails");
        const companyData = result.rows;
        res.render("Full-Time.ejs", { companyData: companyData });
    } catch (err) {
        console.error("Error fetching data:", err);
        res.render("Full-Time.ejs", { companyData: [] });
    }
});


app.post("/submit", async (req, res) => {
    try {
        const searchTerm = req.body["search"];
     
        const result = await db.query("SELECT * FROM companydetails WHERE companyname LIKE $1", [`%${searchTerm}%`]);
        const companyData = result.rows;
        res.render("Full-Time.ejs", { companyData: companyData });
    }
    catch (err) {
        console.error("Error searching data:", err);
        res.render("Full-Time.ejs", { companyData: [] });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});