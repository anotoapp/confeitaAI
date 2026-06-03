const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    try {
        console.log("Debug empty insert test called");
        
        // Insert an empty object to see what default columns are generated
        const { data: insertResult, error: insertErr } = await supabase
            .from('usuarios')
            .insert([{}])
            .select();

        res.status(200).json({
            status: "success",
            supabaseUrl: process.env.SUPABASE_URL ? "Defined" : "Undefined",
            hasServiceKey: process.env.SUPABASE_KEY ? "Yes" : "No",
            insertError: insertErr ? { message: insertErr.message, code: insertErr.code, details: insertErr.details } : null,
            insertResult: insertResult,
            columns: insertResult && insertResult.length > 0 ? Object.keys(insertResult[0]) : null
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};
