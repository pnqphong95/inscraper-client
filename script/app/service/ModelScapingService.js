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
    const models = this.modelRepo.getActiveModelHasMetadata(modelCount);
    SwissKnife.runCallbackInChunk(models, (result, workingModels) => {
      const scrapeResult = this.scrapeModels(workingModels);
      result.error = result.error.concat(scrapeResult.error);
      const storeResult = this.storeModels(scrapeResult.success);
      result.error = result.error.concat(storeResult.error);
    }, {});
  }

  scrapeModels(models) {
    const result = { success: [], remain: [], error: [] };
    try {
      const requests = models.map(model => ModelScrapingService.scrapingRequest(model));
      var responses = UrlFetchApp.fetchAll(requests);
      for (var i = 0; i < responses.length; i++) {
        if (responses[i].getResponseCode() === 200) {
          models[i].scrapeResponse = JSON.parse(responses[i].getContentText());
          console.log(`[${models[i]['Username']}] Scrape model metadata ...DONE. ` 
            + `Found ${models[i].scrapeResponse.data.length} new medias.`);
          result.success.push(models[i]);
        } else {
          console.log(`[${models[i]['Username']}] Scrape model metadata ...FAILED`);
          result.error.push(models[i]);
        }
      }
    } catch (e) {
      console.log(`${JSON.stringify(models.map(i => i['Username']))} Scrape model metadata ...FAILED`, e);
      result.error = result.error.concat(models);
    }
    return result;
  }

  storeModels(models) {
    const result = { success: [], remain: [], error: [] };
    for (var i = 0; i < models.length; i++) {
      const model = models[i];
      const storeMetaResult = this.storeModelMetadatas(model);
      const modelInfo = model.scrapeResponse.user;
      model['Instagram ID'] = modelInfo.id;
      model['Name'] = modelInfo.name;
      if (storeMetaResult.undones.length === 0) {
        model['Timeline Media Count'] = modelInfo.timeline_media_count;
      } else {
        model['Timeline Media Count'] = modelInfo.timeline_media_count - storeMetaResult.undones.length;
      }
      delete model.scrapeResponse;
      this.modelRepo.updateModel(model);
      result.success.push(model);
    }
    return result;
  }

  storeModelMetadatas(model) {
    const modelMetadataRepo = ModelMetadataRepository.instance(model);
    const medias = model.scrapeResponse.data, dones = []; var undones = [];
    try {
      for (var i = 0; i < medias.length; i++) {
        const media = medias[i];
        const mediaObj = {
          'Media ID': media.id,
          'Short Code': media.shortcode,
          'Type': media.type,
          'Timestamp': media.taken_at_timestamp,
          'Caption': media.caption,
          'Download URL': media.fulfilled_source ? media.source : ''
        };
        modelMetadataRepo.createOrUpdate(mediaObj);
        dones.push(media);
      }
      console.log(`[${model['Username']}] Store ${dones.length}/${medias.length} ...DONE`);
    } catch (e) {
      undones = medias.filter(item => !dones.includes(item));
      console.log(`[${model['Username']}] Store ${dones.length}/${medias.length}. Remaining: ${undones.length}`);
    }
    return { model, dones, undones };
  }

  static scrapingRequest(model) {
    const sessionAuth = Configurer.sessionAuth();
    const mediaCount = model['Timeline Media Count'] || 0;
    return {
      url: `${settings.externalConfigs.userUrl}/${model['Username']}`,
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