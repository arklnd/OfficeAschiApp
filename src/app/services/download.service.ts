import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Injectable({ providedIn: 'root' })
export class DownloadService {

  async downloadDataUrl(dataUrl: string, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.nativeDownload(dataUrl, filename);
    } else {
      this.browserDownload(dataUrl, filename);
    }
  }

  private browserDownload(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  private async nativeDownload(dataUrl: string, filename: string): Promise<void> {
    const base64Data = dataUrl.split(',')[1];

    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: filename,
      url: result.uri,
    });
  }
}
