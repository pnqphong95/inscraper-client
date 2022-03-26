class MediaDownloadingService {

  static delayInitializer() {
    return new MediaDownloadingService(
      ModelRepository.instance(), ModelLockingRepository.instance()
    );
  }

  static instance() {
    return Configurer.initInstance('MediaDownloadingService', MediaDownloadingService.delayInitializer);
  }

  constructor(modelRepo, modelLockingRepo) {
    this.modelRepo = modelRepo;
    this.modelLockingRepo = modelLockingRepo;
  }

  download(modelCount) {
    const timeout = Configurer.constructTimeout();
    const models = this.modelRepo.getReadyToDownloadModels(modelCount);
    return this.modelLockingRepo.onModelLocked(models, (items) => {
      return SwissKnife.executeLoopWithTimeout(timeout, items, (model, i, collector) => {
        const result = this.downloadModelMedia(model, timeout);
        if (result.successCount() > 0 && result.remainCount() === 0) {
          this.modelRepo.updateModel(result.successItems[0], { lastDownloaded: true });
        }
        collector.allSuccess(result.successItems).allRemain(result.remainItems);
      });
    });
  }

  downloadModelMedia(model, timeout) {
    const collector = SwissKnife.collector();
    const downloadRepo = MediaDownloadRepository.instance(model);
    const mediaRepo = ModelMediaRepository.instance(model);
    const medias = downloadRepo.getMediaReadyToDownload();
    if (medias.length === 0) {
      Logger.log(`[${model.Username}] All medias are processed.`);
      // Unlock this model immediately if no media to download
      this.modelLockingRepo.unlockModel(model);
      return collector.success(model);
    } else {
      const photoFolder = DriveApp.getFolderById(model['Photo Folder ID']);
      const partitioned = this._partitionMedia(photoFolder, medias, timeout);
      if (partitioned.existings.length > 0) {
        Logger.log(`[${photoFolder.getName()}] ${partitioned.existings.length} media file exists on Drive ...`);
        const moveResult = this.moveMediaToMediaList(model, mediaRepo, downloadRepo, partitioned.existings, timeout);
        Logger.log(`[${model.Username}] Move ${moveResult.successCount()}/${partitioned.existings.length} medias to Media List ...DONE`);
        collector.allSuccess(moveResult.successItems).allRemain(moveResult.remainItems);
      }
      if (partitioned.downloads.length > 0) {
        const storeResult = this.downloadToDrive(photoFolder, partitioned.downloads, timeout);
        const moveResult = this.moveMediaToMediaList(model, mediaRepo, downloadRepo, storeResult.successItems, timeout);
        Logger.log(`[${model.Username}] Save ${storeResult.successCount()}/${partitioned.downloads.length} medias to Drive ...DONE`);
        Logger.log(`[${model.Username}] Move ${moveResult.successCount()}/${storeResult.successCount()} medias to Media List ...DONE`);
        collector.allSuccess(moveResult.successItems).allRemain(moveResult.remainItems);
      }
      if (collector.remainCount() > 0) return collector.remain(model);
      return collector.success(model);
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
        Logger.log(`[${modelFolName}] Unable to download bundle of medias ${ids}\n${e}`);
        collector.allError(items);
      }
      Logger.log(`[${modelFolName}] Downloaded ${collector.successCount()}/${downloads.length} ...`);
    });
  }

  moveMediaToMediaList(model, mediaRepo, downloadRepo, mediasToMove, timeout) {
    const options = { timeout, pageSize: 5 };
    return SwissKnife.pageableLoopWithOptions(options, mediasToMove, (items, collector) => {
      
      const deleteFunc = (media, i, delCollector) => {
        downloadRepo.deleteMedia(media);
        delCollector.success(media);
      };
      const deleteResult = SwissKnife.executeLoopWithTimeout(timeout, items, deleteFunc);
      const createResult = mediaRepo.batchCreate(deleteResult.successItems);
      collector.allSuccess(createResult);
      Logger.log(`[${model.Username}] Moved ${collector.successCount()}/${mediasToMove.length} to Media List ...`);

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
        Logger.log(`[${photoFolder.getName()}] Skip media ${media['Media ID']} because URL parse error.\n${error}`);
      }
    });
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