import express, { Request, Response, RequestHandler } from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const router = express.Router();

interface SearchRequest {
  query: string;
  isNameSearch: boolean;
  searchType: string;
}

const validateSearchRequest = (req: Request<{}, {}, SearchRequest>): string | null => {
  const { query, isNameSearch } = req.body;
  
  if (!query || typeof query !== "string") {
    return "Missing or invalid search query.";
  }
  
  if (typeof isNameSearch !== "boolean") {
    return "isNameSearch must be a boolean value.";
  }
  
  if (query.length > 100) {
    return "Search query is too long.";
  }
  
  return null;
};

const searchHandler: RequestHandler = async (req: Request<{}, {}, SearchRequest>, res: Response): Promise<void> => {
  const validationError = validateSearchRequest(req);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { query, isNameSearch } = req.body;
  console.log("Search request received:", { query, isNameSearch });
  
  try {
    // First, make a GET request to get the cookies
    const getResponse = await fetch("https://doc.wa.gov/information/inmate-search/default.aspx", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Initial request failed with status: ${getResponse.status}`);
    }

    // Get cookies from the response
    const cookies = getResponse.headers.get("set-cookie");
    if (!cookies) {
      throw new Error("No cookies received from initial request");
    }
    console.log("Received cookies:", cookies);

    let body = "";
    if (!isNameSearch) {
      body = `DOCNumber=${encodeURIComponent(query.trim())}`;
    } else {
      const nameParts = query.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        const lastName = nameParts[0].replace(',', '');
        const firstName = nameParts.slice(1).join(' ');
        body = `LastName=${encodeURIComponent(lastName)}&FirstName=${encodeURIComponent(firstName)}`;
      } else {
        body = `LastName=${encodeURIComponent(query.trim())}`;
      }
    }
    
    console.log("Making search request with body:", body);

    // Make the POST request with the cookies
    const response = await fetch("https://doc.wa.gov/information/inmate-search/default.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://doc.wa.gov/information/inmate-search/default.aspx",
        "Cookie": cookies,
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    // Target the specific table with ID InmatesTable
    $("table#InmatesTable tr").each((_, row) => {
      const columns = $(row).find("td");
      
      if (columns.length >= 4) {
        const docNumber = $(columns[0]).text().trim();
        const name = $(columns[1]).text().trim();
        const age = $(columns[2]).text().trim();
        const location = $(columns[3]).text().trim();
        const vineLink = $(columns[4]).find("a").attr("href") || null;

        results.push({
          docNumber,
          name,
          age,
          location,
          vineLink,
        });
      }
    });

    console.log(`Found ${results.length} results`);
    res.json({ 
      count: results.length, 
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ 
      error: "Something went wrong while fetching results.",
      details: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString()
    });
  }
};

router.post("/search", searchHandler);

export default router;
