const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    try {
        console.log("Debug insert test called");
        
        // Try inserting a test user with 'phone'
        const testId = "00000000-0000-0000-0000-" + Date.now().toString().substring(0, 12).padStart(12, "0");
        
        const payload = {
            id: testId,
            name: "Test Column Exist",
            email: `test_column_${Date.now()}@test.com`,
            username: `test_col_${Date.now()}`,
            role: 'Confeiteira',
            status: 'Ativo',
            phone: '5511999998888'
        };

        const { data: insertResult, error: insertErr } = await supabase
            .from('usuarios')
            .insert([payload])
            .select();

        res.status(200).json({
            status: "success",
            supabaseUrl: process.env.SUPABASE_URL ? "Defined" : "Undefined",
            hasServiceKey: process.env.SUPABASE_KEY ? "Yes" : "No",
            insertPayload: payload,
            insertError: insertErr ? { message: insertErr.message, code: insertErr.code, details: insertErr.details } : null,
            insertResult: insertResult
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};
