use std::path::PathBuf;

fn project_root() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn server_entry() -> PathBuf {
	project_root().join("build").join("index.js")
}

/// SvelteKit adapter-node output must exist before tauri-build validates bundle resources.
/// Run `npm run build:tauri` from the project root (CI does this in a separate workflow step).
fn ensure_frontend_build() {
	let handler = server_entry();
	if handler.is_file() {
		return;
	}

	panic!(
		"missing {} — run `npm run build:tauri` from the project root before `tauri build`",
		handler.display()
	);
}

fn main() {
	ensure_frontend_build();
	tauri_build::build();
}
