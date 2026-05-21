module.exports = function handler(req, res) {
    // Allow CORS if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Return the safe public Anon key to the frontend, keeping it out of the source code
    res.status(200).json({
        SUPABASE_URL: process.env.SUPABASE_URL || "https://ckppwmneicuxtlektrqi.supabase.co",
        SUPABASE_KEY: process.env.SUPABASE_KEY || "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr"
    });
};
