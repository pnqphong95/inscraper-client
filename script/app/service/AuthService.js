class AuthService {

  static delayInitializer() {
    return new AuthService(
      Configurer.initInstance('AuthRepository', () => new AuthRepository()),
      Configurer.initInstance('AuthClient', () => new AuthClient())
    );
  }

  static instance() {
    return Configurer.initInstance('AuthService', AuthService.delayInitializer);
  }

  constructor(authRepo, authClient) {
    this.authRepo = authRepo;
    this.authClient = authClient;
  }

  getUnusedRecentAuth() {
    const activeAuths = this.authRepo.getActiveAuths();
    if (activeAuths.length > 0) {
      const activeValidAuth = this.pickFirstValidAuth(activeAuths);
      if (activeValidAuth) {
        this.authRepo.updateAuthLastUsed(activeValidAuth);
        return activeValidAuth;
      } 
    }
    const auths = this.authRepo.getAll();
    if (auths.length > 0) {
      const username = auths[0].Username;
      const password = auths[0].Password;
      const authObj = this.authClient.loginServer(username, password);
      if (authObj) {
        this.authRepo.updateAuth(auths[0], authObj);
        return auths[0];
      }
    }
    throw new Error('No auth to pick-up! Please check the config.');
  }

  pickFirstValidAuth(activeAuths) {
    for(var i = 0; i < activeAuths.length; i++) {
      const activeAuth = activeAuths[i];
      if (AuthService.validAuth(activeAuth)) {
        if (activeAuth['Request Cookie'] && activeAuth['CSRF Token']) {
          return activeAuth;
        } else {
          const username = activeAuth.Username;
          const password = activeAuth.Password;
          const authObj = this.authClient.loginServer(username, password);
          if (authObj) {
            Logger.log(`Empty authentication record. Attempt to authenticate [${username}] ...DONE`);
            this.authRepo.updateAuth(activeAuth, authObj);
            return activeAuth;
          }
        }
      }
    }
  }

  static validAuth(authObj) {
    // Undefined auth object
    if (!authObj) return false;
    
    if (!authObj['Request Cookie'] || !authObj['CSRF Token']) {
      // If no cookie or token, auth still valid if contain Username and Password
      return authObj.Username && authObj.Password;
    };
    
    // Is auth object expire
    const now = new Date();
    if (authObj['Max-Age']) {
      const nowInSecond = Math.floor(now / 1000);
      const expire = new Date(0);
      expire.setUTCSeconds(Number(nowInSecond) + Number(authObj['Max-Age']));
      return now < expire;
    }
    if (authObj['Expires']) {
      return now < new Date(authObj['Expires']);
    }
    return false;
  }

}