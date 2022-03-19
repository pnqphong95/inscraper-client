var authService;
var configRepo;
var modelRepo;

function initialize({ containerId }) {
  Configurer.property('containerFileId', containerId);
  configRepo = ConfigurationRepository.newInstance();
  configurationTable = configRepo.getAllAsObject();
  authService = AuthService.newInstance();
  modelRepo = ModelRepository.newInstance();
}