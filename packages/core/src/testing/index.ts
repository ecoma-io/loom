// The shared test-support entry. Individual helpers keep one file each so the
// boundary checker and the Vite alias can name exactly what a helper is; this
// barrel is the one declared subpath tests import.
export * from "./attach-to-body";
export * from "./keyboard-inertness";
