const { createClient } = require('@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";
const supabase = createClient(url, key);

async function run() {
    console.log("Attempting signup with teste username but diff email...");
    const { data, error } = await supabase.auth.signUp({
        email: 'test_signup_error2@test.com',
        password: 'password123',
        options: { data: { name: 'Teste', username: 'teste' } }
    });
    if (error) {
        console.error("Signup failed:", error);
    } else {
        console.log("Signup success:", data);
    }
}
run();
