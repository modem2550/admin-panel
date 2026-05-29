use std::path::PathBuf;
use std::process::Command;

fn project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn server_entry() -> PathBuf {
    project_root().join("build").join("index.js")
}

/// SvelteKit adapter-node output must exist before tauri-build validates bundle resources.
fn ensure_frontend_build() {
    let handler = server_entry();
    if handler.is_file() {
        return;
    }

    let env_file = project_root().join(".env");
    if !env_file.is_file() {
        panic!(
            "Missing {} — create it with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before building Tauri",
            env_file.display()
        );
    }

    println!(
        "cargo:warning=Building Tauri frontend (npm run build:tauri) — first compile may take a minute..."
    );

    let status = Command::new("npm")
        .args(["run", "build:tauri"])
        .current_dir(project_root())
        .status()
        .unwrap_or_else(|e| panic!("failed to run npm run build:tauri: {e}"));

    if !status.success() {
        panic!(
            "npm run build:tauri failed — run it manually from the project root, then retry"
        );
    }

    if !handler.is_file() {
        panic!(
            "build:tauri finished but {} is still missing",
            handler.display()
        );
    }
}

fn main() {
    ensure_frontend_build();
    tauri_build::build();
}
