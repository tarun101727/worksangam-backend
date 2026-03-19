// backend/controllers/mapController.js
import axios from "axios";

const MAPPLS_BASE = "https://atlas.mappls.com/api";
const MAPPLS_KEY = process.env.MAPPLS_API_KEY;

/* ================= SEARCH ================= */

export const searchLocation = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  try {
    const response = await axios.get(
      `${MAPPLS_BASE}/places/search/json`,
      {
        params: {
          query: q.trim(),
          region: "IND",
          key: MAPPLS_KEY,
        },
        timeout: 8000,
      }
    );

    const results = response.data?.suggestedLocations || [];

    return res.json(
      results.map((p, i) => ({
        place_id: `mappls_${i}`,
        lat: p.latitude,
        lon: p.longitude,
        display_name: p.placeName,
      }))
    );
  } catch (err) {
    console.error("Mappls search failed:", err.message);
    return res.json([]);
  }
};

/* ================= REVERSE ================= */

export const reverseLocation = async (req, res) => {
  const { lat, lon } = req.query;

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({});
  }

  try {
    const response = await axios.get(
      `${MAPPLS_BASE}/geocode/reverse`,
      {
        params: {
          lat,
          lng: lon,
          key: MAPPLS_KEY,
        },
        timeout: 8000,
      }
    );

    return res.json({
      display_name:
        response.data?.results?.[0]?.formatted_address || "",
      lat,
      lon,
    });
  } catch (err) {
    console.error("Mappls reverse failed:", err.message);
    return res.status(500).json({});
  }
};