const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ckppwmneicuxtlektrqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHB3bW5laWN1eHRsZWt0cnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTg1MDgsImV4cCI6MjA5NDc5NDUwOH0.niZ3NQgUR-M2-DLJFcGI7cT3DL9kcq0kQOwLKmQqzpk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const email = `test_${Date.now()}@test.com`;
const username = `u_${Date.now()}`;
const password = "password123";

async function run() {
    try {
        console.log(`Testing signup with email=${email}, username=${username}...`);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: "Test User",
                    username,
                    phone: "5511999998888"
                }
            }
        });
        if (error) {
            console.error("Signup error details:");
            console.error("- Message:", error.message);
            console.error("- Status:", error.status);
            console.error("- Name:", error.name);
            console.error("- Full error:", JSON.stringify(error, null, 2));
        } else {
            console.log("Signup success! User data:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Fatal catch error:", err);
    }
}

run();
