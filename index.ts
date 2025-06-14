import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import searchRoute from "./search.js";

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Add a test GET route
app.get("/", (req, res) => {
  res.json({
    message: "Inmate Search API is running",
    endpoints: {
      search: "/api/search (POST)",
      test: "/api/test (GET)"
    }
  });
});

// Add a test GET route under /api
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    timestamp: new Date().toISOString()
  });
});

// Add GET route for /api/search to show usage
app.get("/api/search", (req, res) => {
  res.json({
    message: "This endpoint requires a POST request",
    usage: {
      method: "POST",
      url: "/api/search",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        query: "string (required) - Name or DOC number to search",
        isNameSearch: "boolean (required) - true for name search, false for DOC number search"
      },
      example: {
        query: "John Smith",
        isNameSearch: true
      }
    }
  });
});

app.use("/api", searchRoute);

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested endpoint does not exist",
    path: req.path
  });
});

// Export the Express app for Vercel
export default app; 