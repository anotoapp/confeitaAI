const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ckppwmneicuxtlektrqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHB3bW5laWN1eHRsZWt0cnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTg1MDgsImV4cCI6MjA5NDc5NDUwOH0.niZ3NQgUR-M2-DLJFcGI7cT3DL9kcq0kQOwLKmQqzpk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    try {
        console.log("Querying users...");
        const { data: users, error } = await supabase.from('usuarios').select('*');
        if (error) {
            console.error("Error fetching users:", error);
            return;
        }
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ID: ${u.id}, Email: ${u.email}, Username: ${u.username}, Name: ${u.name}`);
        });
    } catch (err) {
        console.error("Fatal error:", err);
    }
}

run();
