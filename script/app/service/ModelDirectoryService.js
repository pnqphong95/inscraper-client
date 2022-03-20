const TEMPLATE_IDS = {
  metadataTemplateId: '1F7reJifHJcWmxKDmKd5sekGOoxuJbok55hTt-jpOszs'
}
Object.freeze(TEMPLATE_IDS);

class ModelDirectoryService {

  static instance() {
    const serviceInitializer = () => new ModelDirectoryService(
      Configurer.initInstance('ModelRepository', () => new ModelRepository())
    );
    return Configurer.initInstance('ModelDirectoryService', serviceInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
    this.metadataTemplate = DriveApp.getFileById(TEMPLATE_IDS.metadataTemplateId);
  }

  setupModelDirectory() {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    const trashFolder = settings.appFolders.Trash;
    if (!metadataFolder || !instagramPhotoFolder || !trashFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    const models = this.modelRepo.getNewModels(1);
    for(var i = 0; i < models.length; i++) {
      const model = models[i];
      const modelUsername = model['Username'];
      this.setupModelMetadataTemplate(model, metadataFolder);
      this.setupModelPhotoFolder(model, instagramPhotoFolder);
      this.setupModelTrashFolder(model, trashFolder);
      this.modelRepo.updateModel(model);
    }
  }

  setupModelMetadataTemplate(model, metadataFolder) {
    if (!model['Metadata ID'] || model['Metadata ID'] === '') {
      const modelMetadata = ModelDirectoryService.forceCopyNew(this.metadataTemplate, metadataFolder, model['Username']);
      model['Metadata ID'] = modelMetadata.getId();
    }
    model['Metadata'] = `=HYPERLINK("https://docs.google.com/spreadsheets/d/${model['Metadata ID']}", "View")`;
  }

  setupModelPhotoFolder(model, photoFolder) {
    if (!model['Photo Folder ID'] || model['Photo Folder ID'] === '') {
      const modelPhotoFolder = ModelDirectoryService.createFolderIfNotExist(photoFolder, model['Username']);
      model['Photo Folder ID'] = modelPhotoFolder.getId();
    }
    model['Photo Folder'] = `=HYPERLINK("https://drive.google.com/drive/folders/${model['Photo Folder ID']}", "Open folder")`;
  }

  setupModelTrashFolder(model, trashFolder) {
    if (!model['Trash Folder ID'] || model['Trash Folder ID'] === '') {
      const modelTrashFolder = ModelDirectoryService.createFolderIfNotExist(trashFolder, model['Username']);
      model['Trash Folder ID'] = modelTrashFolder.getId();
    }
    model['Trash Folder'] = `=HYPERLINK("https://drive.google.com/drive/folders/${model['Trash Folder ID']}", "Open folder")`;
  }

  static forceCopyNew(fileToCopy, destFolder, newFileName) {
    const matches = destFolder.getFilesByName(newFileName);
    while (matches.hasNext()) {
      const match = matches.next();
      const matchNewName = match.getName() + '_deprecated';
      match.setName(matchNewName);
      console.log(`[${newFileName}] Existing file ${match.getName()} rename to ${matchNewName}.`);
    }
    console.log(`[${newFileName}] Copied ${fileToCopy.getName()} to ${destFolder.getName()}.`);
    return fileToCopy.makeCopy(newFileName, destFolder);
  }

  static createFolderIfNotExist(parentFolder, folderName) {
    const matches = parentFolder.getFilesByName(folderName);
    if (matches.hasNext()) {
      return matches.next();
    }
    console.log(`[${folderName}] Create new model folder under ${parentFolder.getName()}.`);
    return parentFolder.createFolder(folderName);
  }

  static get errorMessages() {
    return {
      appFoldersMissing: `App folder is missing doesn't setup properly. Go to root media folder and check manually.`
    }
  }

}