#[cfg(not(debug_assertions))]
use std::sync::Mutex;
#[cfg(not(debug_assertions))]
use std::process::{Child, Stdio};
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;
use tauri::Manager;
use tauri::Emitter;
#[cfg(not(debug_assertions))]
use url::Url;

#[cfg(not(debug_assertions))]
const SERVER_HOST: &str = "127.0.0.1";
#[cfg(not(debug_assertions))]
const SERVER_PORT: u16 = 17348;

#[cfg(not(debug_assertions))]
struct ServerState(Mutex<Option<Child>>);

#[cfg(not(debug_assertions))]
fn start_embedded_server(app: &tauri::App) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir: {e}"))?;

    let mut server_dir = resource_dir.join("app-server");
    if !server_dir.exists() {
        server_dir = resource_dir.join("../app-server");
    }

    let index_js = server_dir.join("index.js");
    if !index_js.is_file() {
        return Err(format!(
            "embedded server not found at {} — please check your build folder",
            index_js.display()
        ));
    }

    let origin = format!("http://{SERVER_HOST}:{SERVER_PORT}");

    let mut sidecar_cmd = app
        .shell()
        .sidecar("node")
        .map_err(|e| format!("failed to find sidecar node: {e}"))?
        ;

    let mut env_file = resource_dir.join(".env");
    if !env_file.exists() {
        env_file = resource_dir.join("../.env");
    }
    if env_file.is_file() {
        sidecar_cmd = sidecar_cmd.arg(format!("--env-file={}", env_file.display()));
    }
    sidecar_cmd = sidecar_cmd.arg("index.js");

    let mut std_cmd = std::process::Command::from(sidecar_cmd);
    std_cmd
        .current_dir(&server_dir)
        .env("PORT", SERVER_PORT.to_string())
        .env("HOST", SERVER_HOST)
        .env("ORIGIN", &origin)
        .env("NODE_ENV", "production")
        .env("TAURI_DESKTOP", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let child = std_cmd
        .spawn()
        .map_err(|e| format!("failed to spawn embedded node server: {e}"))?;

    app.manage(ServerState(Mutex::new(Some(child))));

    if !wait_for_port(SERVER_HOST, SERVER_PORT, 200) {
        return Err(format!(
            "embedded server did not start on {origin}. Please check your SvelteKit build logs."
        ));
    }

    if let Some(window) = app.get_webview_window("main") {
        let url = Url::parse(&origin).map_err(|e| format!("invalid server URL: {e}"))?;
        let _ = window.navigate(url);
        std::thread::sleep(std::time::Duration::from_millis(1500));
        let _ = window.show();
        let _ = window.set_focus();
        #[cfg(target_os = "macos")]
        {
            let _ = window.set_always_on_top(true);
            std::thread::sleep(std::time::Duration::from_millis(150));
            let _ = window.set_always_on_top(false);
        }
    }

    Ok(())
}

#[cfg(not(debug_assertions))]
fn wait_for_port(host: &str, port: u16, retries: usize) -> bool {
    use std::net::TcpStream;
    use std::thread::sleep;
    use std::time::Duration;

    let address = format!("{host}:{port}");
    for _ in 0..retries {
        if TcpStream::connect(&address).is_ok() {
            return true;
        }
        sleep(Duration::from_millis(100));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
    println!("🚀 Tauri Application Starting...");

    #[cfg(debug_assertions)]
    {
        println!("🔧 DEVELOPMENT Mode - Forcing window visibility");

        if let Some(window) = app.get_webview_window("main") {
            println!("✅ Found main window");

            // แรงสุดสำหรับ macOS
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.set_decorations(true);
            let _ = window.center();

            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
use tauri::Emitter;
                
                // วิธี 1: Always on top ชั่วคราว
                let _ = window.set_always_on_top(true);
                std::thread::sleep(std::time::Duration::from_millis(300));
                let _ = window.set_always_on_top(false);

                // วิธี 2: บังคับให้ขึ้นด้านหน้า
                let _ = app.emit_to(tauri::EventTarget::App, "tauri://focus", ());
                
                println!("✅ Applied maximum visibility force on macOS");
            }

            println!("✅ Window should be visible now!");
        } else {
            eprintln!("❌ Cannot find main window");
        }
    }

    #[cfg(not(debug_assertions))]
    {
        println!("📦 PRODUCTION Mode");
        if let Err(e) = start_embedded_server(app) {
            eprintln!("FATAL ERROR: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
})
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}