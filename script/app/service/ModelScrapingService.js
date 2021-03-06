class ModelScrapingService {

  static delayInitializer() {
    return new ModelScrapingService(
      ModelRepository.instance(), ModelLockingRepository.instance()
    );
  }

  static instance() {
    return Configurer.initInstance('ModelScrapingService', ModelScrapingService.delayInitializer);
  }

  constructor(modelRepo, modelLockingRepo) {
    this.modelRepo = modelRepo;
    this.modelLockingRepo = modelLockingRepo;
  }

  scrapeModelsByName(modelUsername, timeout) {
    const model = this.modelRepo.getModelByUsername(modelUsername);
    if (model) {
      return this.scrapeModels([model], timeout);
    } else {
      Logger.log(`[${modelUsername}] Not found model by provided username.`);
    }
  }

  scrapeNotUpdateRecentModels(modelCount) {
    const configuredCount = modelCount || settings.externalConfigs.SCRAPING_MODEL_COUNT;
    const timeout = Configurer.constructTimeout();
    const models = this.modelRepo.getReadyToScrapeModels(configuredCount);
    return this.scrapeModels(models, timeout);
  }

  scrapeModels(models, timeout) {
    return this.modelLockingRepo.onModelLocked(models, (items) => {
      const options = { pageSize: 2, timeout };
      return SwissKnife.pageableLoopWithOptions(options, items, (processingItems, collector) => {
        const scrapeResult = this.scrapeModelMedias(processingItems);
        collector.allError(scrapeResult.errorItems).allRemain(scrapeResult.remainItems);
        const saveResult = this.saveModels(scrapeResult.successItems);
        collector.allError(saveResult.errorItems).allRemain(saveResult.remainItems)
          .allSuccess(saveResult.successItems);
      });
    });
  }

  scrapeModelMedias(models) {
    try {
      const requests = models.map(model => ModelScrapingService.scrapingRequest(model));
      const responses = UrlFetchApp.fetchAll(requests);
      return SwissKnife.executeLoop(responses, (resp, i, collector) => {
        if (resp.getResponseCode() === 200) {
          models[i].scrapeResponse = JSON.parse(resp.getContentText());
          Logger.log(`[${models[i].Username}] Scrape model metadata ...DONE. ` 
            + `Found ${models[i].scrapeResponse.data.length} new medias.`);
          collector.success(models[i]);
        } else {
          Logger.log(`[${models[i].Username}] Scrape model metadata ...FAILED`);
          collector.error(models[i]);
        }
      });
    } catch (e) {
      Logger.log(`${JSON.stringify(models.map(i => i.Username))} Scrape model metadata ...FAILED\n${e}`);
      return SwissKnife.collector().allError(models);
    }
  }

  saveModels(models) {
    return SwissKnife.executeLoop(models, (model, i, collector) => {
      ModelScrapingService.updateModelInfo(model);
      if (model.scrapeResponse.data.length > 0) {
        const saveResult = this.saveMetadata(model);
        if (saveResult.dones.length === model.scrapeResponse.data.length) {
          const modelInfo = model.scrapeResponse.user;
          model['Timeline Media Count'] = modelInfo.timeline_media_count;
          model.dataChanged = true;
        }
      }
      if (model.dataChanged) {
        delete model.scrapeResponse;
        this.modelRepo.updateModel(model, { lastUpdated: true });
      } else {
        // Unlock this model immediately if no data changed
        this.modelLockingRepo.unlockModel(models[i]);
      }
      collector.success(model);
    });
  }

  saveMetadata(model) {
    const medias = model.scrapeResponse.data;
    var dones = []; var undones = [];
    try {
      const partitioned = ModelScrapingService.partitionMediaBaseOnSource(medias);
      if (partitioned.mediaHasSource.length > 0) {
        const downloadRepo = MediaDownloadRepository.instance(model);
        dones = dones.concat(downloadRepo.batchCreate(partitioned.mediaHasSource));
      }
      if (partitioned.mediaNoSource.length > 0) {
        const noSourceRepo = MediaNoSourceRepository.instance(model);
        dones = dones.concat(noSourceRepo.batchCreate(partitioned.mediaNoSource));
      }
      Logger.log(`[${model.Username}] Saved ${dones.length}/${medias.length} medias.`);
    } catch (e) {
      undones = medias.filter(item => !dones.includes(item));
      Logger.log(`[${model.Username}] Saved ${dones.length}/${medias.length}. Remaining: ${undones.length}\n${e}`);
    }
    return { model, dones, undones };
  }

  static partitionMediaBaseOnSource(medias) {
    const mediaHasSource = []; const mediaNoSource = [];
    SwissKnife.executeLoop(medias, (media) => {
      const record = {
        'Media ID': media.id,
        'Short Code': media.shortcode,
        'Type': media.type,
        'Timestamp': media.taken_at_timestamp,
        'Caption': media.caption
      };
      if (media.fulfilled_source) {
        mediaHasSource.push({ ...record, 'Download URL': media.source });
      } else {
        mediaNoSource.push({ ...record, 'Download URL': '' });
      }
    });
    return { mediaHasSource, mediaNoSource };
  }

  static updateModelInfo(model) {
    const newInfo = model.scrapeResponse.user;
    if (model['Instagram ID'] !== newInfo.id) {
      model['Instagram ID'] = newInfo.id; 
      model.dataChanged = true;
    }
    if (model['Name'] !== newInfo.name) {
      model['Name'] = newInfo.name;
      model.dataChanged = true;
    }
    if (model['Private Profile'] === 'YES') {
      if (!newInfo.is_private) {
        model['Private Profile'] = '';
        model.dataChanged = true;
      }
    } else {
      if (newInfo.is_private) {
        model['Private Profile'] = 'YES';
        model.dataChanged = true;
      }
    }
    if (model['Followed By'] === '') {
      model['Followed By'] = JSON.stringify([newInfo.auth_username]);
      model.dataChanged = true;
    } else {
      const followList = JSON.parse(model['Followed By']);
      if (newInfo.followed_by_auth_user && !followList.includes(newInfo.auth_username)) {
        followList.push(newInfo.auth_username);
        model['Followed By'] = JSON.stringify(followList);
        model.dataChanged = true;
      }
      if (!newInfo.followed_by_auth_user && followList.includes(newInfo.auth_username)) {
        model['Followed By'] = JSON.stringify(followList.filter(i => newInfo.auth_username !== i));
        model.dataChanged = true;
      }
    }
  }

  static scrapingRequest(model) {
    const sessionAuth = Configurer.sessionAuth();
    const mediaCount = model['Timeline Media Count'] || 0;
    return {
      url: `${settings.externalConfigs.USER_URL}/${model.Username}`,
      method: 'post',
      contentType: 'application/json',
      payload: Utilities.jsonStringify({
        requestCookie: sessionAuth['Request Cookie'],
        csrfToken: sessionAuth['CSRF Token'],
        authUsername: sessionAuth.Username,
        last_timeline_media_count: mediaCount
      })
    };
  }

}