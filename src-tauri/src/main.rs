// ซ่อนหน้าต่าง Console เมื่อทำงานบน Windows ในโหมด Release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}