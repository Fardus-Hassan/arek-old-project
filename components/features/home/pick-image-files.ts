/**
 * Browser multi-select usually does NOT return true click order
 * (Windows file dialog often A–Z). File System Access API
 * (`showOpenFilePicker`) keeps selection order better in Chromium.
 */

type PickResult = {
  files: File[];
  /** True when we believe order matches how the user selected items. */
  selectionOrderReliable: boolean;
};

const IMAGE_PICKER_TYPES = [
  {
    description: "Images",
    accept: {
      "image/*": [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".bmp",
        ".heic",
        ".heif",
      ],
    },
  },
] as const;

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    "name" in err &&
    (err as { name: string }).name === "AbortError"
  );
}

/** Prefer Chromium file picker (selection order); fallback to `<input multiple>`. */
export async function pickImageFilesPreferSelectionOrder(): Promise<PickResult | null> {
  if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      const handles = await win.showOpenFilePicker({
        multiple: true,
        excludeAcceptAllOption: false,
        types: IMAGE_PICKER_TYPES,
      });
      if (!Array.isArray(handles) || handles.length === 0) return null;
      const files: File[] = await Promise.all(
        handles.map((h: { getFile: () => Promise<File> }) => h.getFile()),
      );
      // Chromium returns handles in the order the user selected them.
      return { files, selectionOrderReliable: true };
    } catch (err) {
      if (isAbortError(err)) return null;
      // Unsupported / permission → fall through to input
    }
  }

  return pickImageFilesViaInput();
}

function pickImageFilesViaInput(): Promise<PickResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener(
      "change",
      () => {
        const list = input.files;
        cleanup();
        if (!list || list.length === 0) {
          resolve(null);
          return;
        }
        // Preserve browser FileList index order (often A–Z, not click order).
        resolve({
          files: Array.from(list),
          selectionOrderReliable: false,
        });
      },
      { once: true },
    );

    // Cancel when picker closes without change (best-effort)
    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => {
          if (!input.isConnected) return;
          if (!input.files?.length) {
            cleanup();
            resolve(null);
          }
        }, 400);
      },
      { once: true },
    );

    input.click();
  });
}

/** Drop / classic FileList: keep array order as given (no name sort). */
export function filesFromFileList(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  if (Array.isArray(list)) return list;
  return Array.from(list);
}
