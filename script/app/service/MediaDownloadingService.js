class MediaDownloadingService {

  static delayInitializer() {
    return new MediaDownloadingService(ModelRepository.instance());
  }

  static instance() {
    return Configurer.initInstance('MediaDownloadingService', MediaDownloadingService.delayInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
  }

  download(modelCount) {
    const timeout = Configurer.constructTimeout(300000);
    const models = this.modelRepo.getReadyToDownloadModels(modelCount);
    try {
      this.modelRepo.lockModels(models);
      SwissKnife.executeLoopWithTimeout(timeout, models, (model, i, collector) => {
        const successModel = this.downloadModelMedia(model, timeout);
        if (successModel) {
          this.modelRepo.updateModel(successModel, { lastDownloaded: true });
          collector.success(successModel);
        }
      });
    } finally {
      this.modelRepo.unlockModels(models);
    }
  }

  downloadModelMedia(model, timeout) {
    const downloadRepo = MediaDownloadRepository.instance(model);
    const mediaRepo = ModelMediaRepository.instance(model);
    const medias = downloadRepo.getMediaReadyToDownload();
    if (medias.length === 0) {
      console.log(`[${model.Username}] All medias are processed.`);
      return model;
    } else {
      const photoFolder = DriveApp.getFolderById(model['Photo Folder ID']);
      const partitioned = this._partitionMedia(photoFolder, medias, timeout);
      const storeResult = this.downloadToDrive(photoFolder, partitioned.downloads, timeout);
      const mediasToMove = partitioned.existings.concat(storeResult.successItems);
      const moveResult = this.moveMediaToMediaList(mediaRepo, downloadRepo, mediasToMove, timeout);
      console.log(`[${model.Username}] ${mediasToMove.length}/${medias.length} medias save to drive. `
        + `Move ${moveResult.successCount()}/${medias.length} medias to Media sheet, `);
      if (moveResult.successCount() === medias.length) {
        return model;
      }
    }
  }

  downloadToDrive(photoFolder, downloads, timeout) {
    const modelFolName = photoFolder.getName();
    const options = { pageSize: 5, timeout };
    return SwissKnife.pageableLoopWithOptions(options, downloads, (items, collector) => {
      try {
        const urls = items.map(media => media['Download URL']);
        const responses = UrlFetchApp.fetchAll(urls);
        SwissKnife.executeLoopWithTimeout(timeout, responses, (resp, i) => {
          if (resp.getResponseCode() === 200) {
            const mediaFile = photoFolder.createFile(resp.getBlob());
            items[i]['Drive ID'] = mediaFile.getId();
            collector.success(items[i]);
          } else {
            collector.error(items[i]);
          }
        });
      } catch (e) {
        const ids = items.map(i => i['Media ID']);
        console.log(`[${modelFolName}] Unable to download bundle of medias ${ids}`);
        collector.allError(items);
      }
      console.log(`[${modelFolName}] Downloaded ${collector.successCount()}/${downloads.length} ...`);
    });
  }

  moveMediaToMediaList(mediaRepo, downloadRepo, mediasToMove, timeout) {
    const options = { timeout, pageSize: 5 };
    return SwissKnife.pageableLoopWithOptions(options, mediasToMove, (items, collector) => {
      
      const deleteFunc = (media, i, delCollector) => {
        downloadRepo.deleteMedia(media);
        delCollector.success(media);
      };
      const deleteResult = SwissKnife.executeLoopWithTimeout(timeout, items, deleteFunc);
      const createResult = mediaRepo.batchCreate(deleteResult.successItems);
      collector.allSuccess(createResult);

    });
  }

  _partitionMedia(photoFolder, medias, timeout) {
    var downloads = [], existings = [];
    SwissKnife.executeLoopWithTimeout(timeout, medias, (media) => {
      try {
        const nameWithExtension = this._fileNameFromUrl(media['Download URL']);
        const matches = photoFolder.getFilesByName(nameWithExtension);
        if (matches.hasNext()) {
          media['Drive ID'] = matches.next().getId();
          existings.push(media);
        } else {
          downloads.push(media);
        }
      } catch (error) {
        console.log(`[${photoFolder.getName()}] Skip media ${media['Media ID']} because URL parse error.`, error);
      }
    });
    console.log(`[${photoFolder.getName()}] Downloaded ${existings.length}/${medias.length} (existing) ...`);
    return { downloads, existings };
  }

  _fileNameFromUrl(url) {
    var urlParts = url.split('?');
    if (urlParts.length > 0) {
      urlParts = urlParts[0].split('/');
      if (urlParts.length > 0) {
        return urlParts[urlParts.length - 1];
      }
    }
  }

}