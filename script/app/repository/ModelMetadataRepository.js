class ModelMetadataRepository {

  static instance(model) {
    return Configurer.initInstance(`ModelMetadataRepository_${model.Username}`, 
      () => new ModelMetadataRepository(model));
  }
  
  constructor(model) {
    this.Sheet = SpreadsheetApp.openById(model['Metadata ID']); 
    Tamotsu.initialize(this.Sheet);
    this.Media = Tamotsu.Table.define({ idColumn: 'Media ID', sheetName: 'Media', rowShift: 1 });
  }

  createOrUpdate(mediaObj) {
    this.refreshUrl(mediaObj);
    this.Media.createOrUpdate(mediaObj);
  }

  batchCreate(mediaObjs) {
    mediaObjs.forEach(i => this.refreshUrl(i));
    this.Media.batchCreate(mediaObjs);
  }

  refreshUrl(mediaObj) {
    mediaObj['Post'] = `=HYPERLINK("https://www.instagram.com/p/" & "${mediaObj['Short Code']}"; "View")`;
    if (mediaObj['Drive ID']) {
      mediaObj['Drive URL'] = `=HYPERLINK("https://drive.google.com/file/d/" & "${mediaObj['Drive ID']}"; "View")`;
    }
  }

  getMediaReadyToDownload() {
    return this.Media.where({ 'Drive ID': '' }).where(media => media['Download URL'] !== '').all();
  }

}