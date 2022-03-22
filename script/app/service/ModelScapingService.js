class ModelScrapingService {

  static delayInitializer() {
    return new ModelScrapingService(ModelRepository.instance());
  }

  static instance() {
    return Configurer.initInstance('ModelScrapingService', ModelScrapingService.delayInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
  }

  scrapeAndStoreModelMetadatas(modelCount) {
    const models = this.modelRepo.getReadyToScrapeModels(modelCount);
    try {
      const timeout = Configurer.constructTimeout();
      SwissKnife.runInLoop(models, model => this.modelRepo.updateModel(model, { locked: true }), {});
      SwissKnife.runCallbackInChunk(models, (result, workingModels) => {
        const scrapeResult = this.scrapeModels(workingModels);
        result.error = result.error.concat(scrapeResult.error);
        const storeResult = this.storeModels(scrapeResult.success);
        result.error = result.error.concat(storeResult.error);
      }, { timeout });
    } finally {
      SwissKnife.runInLoop(models, model => this.modelRepo.updateModel(model, { locked: false }), {});
    }
  }

  scrapeModels(models) {
    const collector = { success: [], remain: [], error: [] };
    try {
      const requests = models.map(model => ModelScrapingService.scrapingRequest(model));
      var responses = UrlFetchApp.fetchAll(requests);
      SwissKnife.runInLoop(responses, (resp, i) => {
        if (resp.getResponseCode() === 200) {
          models[i].scrapeResponse = JSON.parse(resp.getContentText());
          console.log(`[${models[i].Username}] Scrape model metadata ...DONE. ` 
            + `Found ${models[i].scrapeResponse.data.length} new medias.`);
          collector.success.push(models[i]);
        } else {
          console.log(`[${models[i].Username}] Scrape model metadata ...FAILED`);
          collector.error.push(models[i]);
        }
      }, {});
    } catch (e) {
      console.log(`${JSON.stringify(models.map(i => i.Username))} Scrape model metadata ...FAILED`, e);
      collector.error = collector.error.concat(models);
    }
    return collector;
  }

  storeModels(models) {
    const collector = { success: [], remain: [], error: [] };
    SwissKnife.runInLoop(models, (model, i) => {
      const storeMetaResult = this.storeModelMetadatas(model);
      const modelInfo = model.scrapeResponse.user;
      model['Instagram ID'] = modelInfo.id;
      model['Name'] = modelInfo.name;
      model['Last Updated'] = new Date().toISOString();
      if (storeMetaResult.undones.length === 0) {
        model['Timeline Media Count'] = modelInfo.timeline_media_count;
      } else {
        model['Timeline Media Count'] = modelInfo.timeline_media_count - storeMetaResult.undones.length;
      }
      delete model.scrapeResponse;
      collector.success.push(model);
    }, {});
    return collector;
  }

  storeModelMetadatas(model) {
    const medias = model.scrapeResponse.data, dones = []; var undones = [];
    if (medias.length > 0) {
      try {
        const modelMetadataRepo = ModelMetadataRepository.instance(model);
        const mediaObjs = [];
        for (var i = 0; i < medias.length; i++) {
          const media = medias[i];
          mediaObjs.push({
            'Media ID': media.id,
            'Short Code': media.shortcode,
            'Type': media.type,
            'Timestamp': media.taken_at_timestamp,
            'Caption': media.caption,
            'Download URL': media.fulfilled_source ? media.source : ''
          });
          dones.push(media);
        }
        modelMetadataRepo.batchCreate(mediaObjs);
      } catch (e) {
        undones = medias.filter(item => !dones.includes(item));
        console.log(`[${model.Username}] Store ${dones.length}/${medias.length}. Remaining: ${undones.length}`, e);
      }
    }
    
    return { model, dones, undones };
  }

  static scrapingRequest(model) {
    const sessionAuth = Configurer.sessionAuth();
    const mediaCount = model['Timeline Media Count'] || 0;
    return {
      url: `${settings.externalConfigs.userUrl}/${model.Username}`,
      method: 'post',
      contentType: 'application/json',
      payload: Utilities.jsonStringify({
        requestCookie: sessionAuth['Request Cookie'],
        csrfToken: sessionAuth['CSRF Token'],
        last_timeline_media_count: mediaCount
      })
    };
  }

}