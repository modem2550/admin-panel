import { E as writable } from "./dev.js";
import "./index-server2.js";
//#region src/lib/toasts.ts
var { subscribe, update } = writable([]);
var nextId = 0;
function remove(id) {
	update((all) => all.filter((t) => t.id !== id));
}
var toasts = {
	subscribe,
	_remove: remove,
	add: (message, type = "info") => {
		const id = nextId++;
		update((all) => [...all, {
			id,
			message,
			type
		}]);
		setTimeout(() => remove(id), 3e3);
	}
};
//#endregion
export { toasts as t };
