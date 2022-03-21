class ModelMetadataRepository {

  static instance(model) {
    return Configurer.initInstance(`ModelMetadataRepository_${model['Username']}`, 
      () => new ModelMetadataRepository(model));
  }
  
  constructor(model) {
    this.Sheet = SpreadsheetApp.openById(model['Metadata ID']); 
    Tamotsu.initialize(this.Sheet);
    this.Media = Tamotsu.Table.define({ idColumn: 'Media ID', sheetName: 'Media', rowShift: 1 });
  }

  createOrUpdate(mediaObj) {
    mediaObj['Post'] = `=HYPERLINK("https://www.instagram.com/p/" & "${mediaObj['Short Code']}"; "View")`;
    this.Media.createOrUpdate(mediaObj);
  }

}