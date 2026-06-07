import { isNative } from "@/lib/platform";
import { downloadBlob } from "@/api/client";

/** Save exported report on web (download) or native (Filesystem + Share). */
export async function saveReportFile(downloadPath: string, fileName: string) {
  const { blob } = await downloadBlob(downloadPath, fileName);

  if (isNative) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: fileName,
      url: saved.uri,
      dialogTitle: "Save or share report",
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
