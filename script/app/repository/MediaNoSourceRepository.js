class MediaNoSourceRepository {

  static instance(model) {
    return Configurer.initInstance(`MediaNoSourceRepository${model.Username}`, 
      () => new MediaNoSourceRepository(model));
  }
  
  constructor(model) {
    this.Model = model;
    this.Sheet = SpreadsheetApp.openById(this.Model['Metadata ID']); 
    Tamotsu.initialize(this.Sheet);
    this.MediaNoSource = Tamotsu.Table.define({ idColumn: 'Media ID', sheetName: 'Media_NoSource', rowShift: 1 });
  }

  getMediaReadyToGetSource(mediaCount) {
    const medias = this.MediaNoSource.where(media => media['Short Code'] !== '').all();
    return mediaCount ? medias.slice(0, mediaCount) : medias;
  }

  batchCreate(medias) {
    const mediaHasSource = MediaNoSourceRepository.firstMediaHasSource(medias);
    if (mediaHasSource) {
      Logger.log(`${this.Model.Username}: Store medias to no source table ...FAILED. ` 
        + `Media ${mediaHasSource['Media ID']} has source URL.`);
      return [];
    }
    medias.forEach(i => {
      MediaNoSourceRepository.refreshUrl(i);
      MediaNoSourceRepository.lastUpdated(i);
    });
    return this.MediaNoSource.batchCreate(medias);
  }

  deleteMediaById(mediaIdToDelete) {
    const freshMedia = this.MediaNoSource.find(mediaIdToDelete);
    if (freshMedia) {
      freshMedia.destroy();
      return freshMedia;
    }
  }

  static lastUpdated(mediaObj) {
    mediaObj['Updated At'] = new Date().toISOString();
  }

  static refreshUrl(mediaObj) {
    mediaObj['Post'] = `=HYPERLINK("https://www.instagram.com/p/" & "${mediaObj['Short Code']}"; "View")`;
  }

  static firstMediaHasSource(medias) {
    return medias.find(media => MediaNoSourceRepository.isMediaHasSource(media));
  }

  static filterMediaNoSource(medias) {
    return medias.filter(media => !MediaNoSourceRepository.isMediaHasSource(media));
  }

  static isMediaHasSource(media) {
    return media['Download URL'] !== '';
  }
  
}