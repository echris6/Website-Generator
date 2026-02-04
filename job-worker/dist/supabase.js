"use strict";
/**
 * Supabase client for job worker
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = getSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
let supabaseInstance = null;
function getSupabase() {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY");
    }
    supabaseInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    console.log("✅ Supabase client initialized");
    return supabaseInstance;
}
//# sourceMappingURL=supabase.js.map