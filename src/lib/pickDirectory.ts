// Opens a native folder picker. Resolves to the chosen path, or null if the user cancelled.
// In the Electron app this is the OS dialog and returns the full path. In a plain browser there is no
// path access, so the fallback can only return the folder's name.
export async function pickDirectory(currentPath?: string): Promise<string | null> {
  if (window.downbeat?.selectDirectory) {
    return window.downbeat.selectDirectory(currentPath);
  }
  if (window.showDirectoryPicker) {
    try {
      return (await window.showDirectoryPicker()).name;
    } catch {
      return null; // dismissed
    }
  }
  return null;
}
