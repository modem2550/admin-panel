import type { SupportedStorage } from '@supabase/supabase-js';

/** Persist Supabase auth tokens via tauri-plugin-store (survives WebView restarts). */
export function createTauriAuthStorage(): SupportedStorage {
	let storePromise: Promise<import('@tauri-apps/plugin-store').Store> | null = null;

	const getStore = () => {
		if (!storePromise) {
			storePromise = import('@tauri-apps/plugin-store').then(({ load }) =>
				load('supabase-auth.json', { autoSave: true, defaults: {} })
			);
		}
		return storePromise;
	};

	return {
		getItem: async (key: string) => {
			const store = await getStore();
			const value = await store.get<string>(key);
			return value ?? null;
		},
		setItem: async (key: string, value: string) => {
			const store = await getStore();
			await store.set(key, value);
		},
		removeItem: async (key: string) => {
			const store = await getStore();
			await store.delete(key);
		}
	};
}
