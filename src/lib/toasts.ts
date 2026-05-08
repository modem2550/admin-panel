import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

const { subscribe, update } = writable<Toast[]>([]);

let nextId = 0;

function remove(id: number) {
    update(all => all.filter(t => t.id !== id));
}

export const toasts = {
    subscribe,
    _remove: remove,
    add: (message: string, type: ToastType = 'info') => {
        const id = nextId++;
        update(all => [...all, { id, message, type }]);
        setTimeout(() => remove(id), 3000);
    }
};
