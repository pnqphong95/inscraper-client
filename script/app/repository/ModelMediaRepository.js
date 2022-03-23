class ModelMediaRepository {

  static instance(model) {
    return Configurer.initInstance(`ModelMediaRepository_${model.Username}`, 
      () => new ModelMediaRepository(model));
  }
  
  constructor(model) {
    this.Sheet = SpreadsheetApp.openById(model['Metadata ID']); 
    Tamotsu.initialize(this.Sheet);
    this.Media = Tamotsu.Table.define({ idColumn: 'Media ID', sheetName: 'Media', rowShift: 1 });
  }

  batchCreate(mediaObjs) {
    if (!mediaObjs || mediaObjs.length === 0) {
      return [];
    }
    mediaObjs.forEach(i => this.refreshUrl(i));
    return this.Media.batchCreate(mediaObjs);
  }

  refreshUrl(mediaObj) {
    mediaObj['Post'] = `=HYPERLINK("https://www.instagram.com/p/" & "${mediaObj['Short Code']}"; "View")`;
    if (mediaObj['Drive ID']) {
      mediaObj['Drive URL'] = `=HYPERLINK("https://drive.google.com/file/d/" & "${mediaObj['Drive ID']}"; "View")`;
    }
  }

}