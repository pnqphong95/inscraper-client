class MediaDownloadRepository {

  static instance(model) {
    return Configurer.initInstance(`MediaDownloadRepository${model.Username}`, 
      () => new MediaDownloadRepository(model));
  }
  
  constructor(model) {
    this.Model = model;
    this.Sheet = SpreadsheetApp.openById(this.Model['Metadata ID']); 
    Tamotsu.initialize(this.Sheet);
    this.MediaDownload = Tamotsu.Table.define({ idColumn: 'Media ID', sheetName: 'Media_Download', rowShift: 1 });
  }

  getMediaReadyToDownload(mediaCount) {
    const medias = this.MediaDownload.where(media => MediaDownloadRepository.isMediaHasSource(media)).all();
    return mediaCount ? medias.slice(0, mediaCount) : medias; // medias.slice(0, Math.min(50, medias.length))
  }

  batchCreate(medias) {
    const mediaNoSource = MediaDownloadRepository.firstMediaNoSource(medias);
    if (mediaNoSource) {
      Logger.log(`${this.Model.Username}: Store medias to download list ...FAILED. ` 
        + `Media ${mediaNoSource['Media ID']} has no source URL.`);
      return [];
    }
    medias.forEach(i => {
      MediaDownloadRepository.refreshUrl(i);
      MediaDownloadRepository.lastUpdated(i);
    });
    return this.MediaDownload.batchCreate(medias);
  }

  deleteMedia(mediaToDelete) {
    const freshMedia = this.MediaDownload.find(mediaToDelete['Media ID']);
    if (freshMedia) {
      freshMedia.destroy();
      return freshMedia;
    }
  }

  static refreshUrl(mediaObj) {
    mediaObj['Post'] = `=HYPERLINK("https://www.instagram.com/p/" & "${mediaObj['Short Code']}"; "View")`;
  }

  static lastUpdated(mediaObj) {
    mediaObj['Updated At'] = new Date().toISOString();
  }

  static firstMediaNoSource(medias) {
    return medias.find(media => !MediaDownloadRepository.isMediaHasSource(media));
  }

  static filterMediaHasSource(medias) {
    return medias.filter(media => MediaDownloadRepository.isMediaHasSource(media));
  }

  static isMediaHasSource(media) {
    return media['Download URL'] !== '';
  }
  

}