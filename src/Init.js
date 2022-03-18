var authService;
var configRepo;

function initialize({ containerId }) {
  containerFileId = containerId;
  configRepo = ConfigurationRepository.newInstance();
  configurationTable = configRepo.getAllAsObject();
  authService = AuthenticationService.newInstance();
}