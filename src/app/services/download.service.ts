import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { HyToastService } from '@hyland/ui/toast';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  private toast = inject(HyToastService);

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

    this.toast.info(`Downloading ${filename}…`);

    await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
    });

    this.toast.success(`${filename} saved to Documents`);
  }
}
