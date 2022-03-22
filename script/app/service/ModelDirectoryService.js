const TEMPLATE_IDS = {
  metadataTemplateId: '1F7reJifHJcWmxKDmKd5sekGOoxuJbok55hTt-jpOszs'
}
Object.freeze(TEMPLATE_IDS);

class ModelDirectoryService {

  static delayInitializer() {
    return new ModelDirectoryService(
      Configurer.initInstance('ModelRepository', () => new ModelRepository())
    );
  }

  static instance() {
    return Configurer.initInstance('ModelDirectoryService', ModelDirectoryService.delayInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
    this.metadataTemplate = DriveApp.getFileById(TEMPLATE_IDS.metadataTemplateId);
  }

  setupModelsDirectory(isRescan) {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    if (!metadataFolder || !instagramPhotoFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    const models = isRescan ? this.modelRepo.getActiveModels() : this.modelRepo.getNewModels();
    for(var i = 0; i < models.length; i++) {
      if (isRescan) {
        this.scanModelDirectory(models[i]);
      } else {
        this.setupModelDirectory(models[i]);
      }
    }
    return models;
  }

  setupModelDirectory(model) {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    if (!metadataFolder || !instagramPhotoFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    this.setupModelMetadataTemplate(model, metadataFolder);
    this.setupModelPhotoFolder(model, instagramPhotoFolder);
    this.modelRepo.updateModel(model);
  }

  scanModelDirectory(model) {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    if (!metadataFolder || !instagramPhotoFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    const modelMetadata = metadataFolder.getFilesByName(model['Username']);
    if (modelMetadata.hasNext()) {
      model['Metadata ID'] = modelMetadata.next().getId();
    }
    const modelPhotoFolder = instagramPhotoFolder.getFoldersByName(model['Username']);
    if (modelPhotoFolder.hasNext()) {
      model['Photo Folder ID'] = modelPhotoFolder.next().getId();
    }
    this.modelRepo.updateModel(model);
  }

  setupModelMetadataTemplate(model, metadataFolder) {
    if (!model['Metadata ID'] || model['Metadata ID'] === '') {
      const modelMetadata = ModelDirectoryService.forceCopyNew(this.metadataTemplate, metadataFolder, model['Username']);
      model['Metadata ID'] = modelMetadata.getId();
    }
  }

  setupModelPhotoFolder(model, photoFolder) {
    if (!model['Photo Folder ID'] || model['Photo Folder ID'] === '') {
      const modelPhotoFolder = ModelDirectoryService.createFolderIfNotExist(photoFolder, model['Username']);
      model['Photo Folder ID'] = modelPhotoFolder.getId();
    }
  }

  static forceCopyNew(fileToCopy, destFolder, newFileName) {
    const matches = destFolder.getFilesByName(newFileName);
    while (matches.hasNext()) {
      const match = matches.next();
      const matchNewName = match.getName() + '_deprecated';
      match.setName(matchNewName);
      console.log(`[${newFileName}] Rename existing file ${match.getName()} to ${matchNewName} ...DONE`);
    }
    console.log(`[${newFileName}] Copy ${fileToCopy.getName()} to ${destFolder.getName()} ...DONE`);
    return fileToCopy.makeCopy(newFileName, destFolder);
  }

  static createFolderIfNotExist(parentFolder, folderName) {
    const matches = parentFolder.getFilesByName(folderName);
    if (matches.hasNext()) {
      return matches.next();
    }
    console.log(`[${folderName}] Create new model folder under ${parentFolder.getName()} ...DONE`);
    return parentFolder.createFolder(folderName);
  }

  static get errorMessages() {
    return {
      appFoldersMissing: `App folder is missing doesn't setup properly. Go to root media folder and check manually.`
    }
  }

}