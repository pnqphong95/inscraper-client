const APP_STORAGE_PATHS = {
  photoFolderPath: 'Models\\InstagramPhoto',
  metadataFolderPath: 'Metadata'
}

class AppDefaultInitializer {

  static delayInitializer() {
    return new AppDefaultInitializer();
  }

  static instance() {
    return Configurer.initInstance('AppDefaultInitializer', AppDefaultInitializer.delayInitializer);
  }

  constructor() {}

  validateAppWorkspace() {
    const rootMediaFolder = this.getRootMediaFolder();
    const appFolders = AppDefaultInitializer.setupFoldersUnderRoot(rootMediaFolder, Object.values(APP_STORAGE_PATHS));
    return { rootMediaFolder, ...appFolders }
  }

  getRootMediaFolder() {
    const rootMediaFolderId = settings.externalConfigs.rootMediaFolderId;
    try {
      return DriveApp.getFolderById(rootMediaFolderId);
    } catch (e) {
      throw new ConfigurationException(
        AppDefaultInitializer.errorMessages.rootMediaFolderInvalid(rootMediaFolderId, e.stack));
    }
  }

  static setupFoldersUnderRoot(root, pathList) {
    const nodeLevels = {}, result = {};
    for(var i = 0; i < pathList.length; i++) {
      const path = pathList[i];
      const sectors = path.split('\\');
      var sectorDir = root;
      for(var j = 0; j < sectors.length; j++) {
        const node = `${sectors[j]}-${j}`;
        if (!nodeLevels[node]) {
          const matches = sectorDir.getFoldersByName(sectors[j]);
          if (matches.hasNext()) {
            sectorDir = matches.next();
          } else {
            sectorDir = sectorDir.createFolder(sectors[j]);
          }
          result[sectors[j]] = sectorDir;
          nodeLevels[node] = sectorDir;
        } else {
          sectorDir = nodeLevels[node];
        }
      }
    }
    console.log(`Verify app directory [${root.getName()}] ...PASSED`);
    return result;
  }

  static get errorMessages() {
    return {
      rootMediaFolderInvalid: (id, stack) => `Provided config key [rootMediaFolderId=${id}] is invalid. ` 
        + `The folder is not exist or you dont have access.\n${stack}`
    }
  }

}