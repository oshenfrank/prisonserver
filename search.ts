import express, { Request, Response, RequestHandler } from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const router = express.Router();

interface SearchRequest {
  query: string;
  isNameSearch: boolean;
  searchType: string;
}

router.post("/search", (async (req: Request<{}, {}, SearchRequest>, res: Response) => {
  const { query, isNameSearch } = req.body;
//   console.log("Hit, body was,", query, "isNameSearch:", isNameSearch);
  
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing or invalid search query." });
  }

  try {
    // First, make a GET request to get the cookies
    const getResponse = await fetch("https://doc.wa.gov/information/inmate-search/default.aspx", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      }
    });

    // Get cookies from the response
    const cookies = getResponse.headers.get("set-cookie");
    // console.log("Received cookies:", cookies);

    let body = "";
    if (!isNameSearch) {
      body = `DOCNumber=${query.trim()}`;
    } else {
      const nameParts = query.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // For names like "ROLLINS, JOHNNIE" or "ROLLINS JOHNNIE"
        const lastName = nameParts[0].replace(',', '');
        const firstName = nameParts.slice(1).join(' ');
        body = `LastName=${lastName}&FirstName=${firstName}`;
      } else {
        body = `LastName=${query.trim()}`;
      }
     }
    
    // console.log("Request body:", body);

    // Make the POST request with the cookies
    const response = await fetch("https://doc.wa.gov/information/inmate-search/default.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://doc.wa.gov/information/inmate-search/default.aspx",
        "Cookie": cookies || "",
      },
      body: body,
    });

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
    // console.log(results)
    return res.json({ count: results.length, results });
  } catch (err) {
    // console.error("Search error:", err);
    return res.status(500).json({ error: "Something went wrong while fetching results." });
  }
}) as unknown as express.RequestHandler);

export default router;
