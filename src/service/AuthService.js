class AuthService {

  static instance() {
    return new this(Configurer.initInstance('AuthRepository', () => new AuthRepository()));
  }

  constructor(authRepo) {
    this.authRepo = authRepo;
  }

  /**
   * This is adapter for old tool. Will remove soon.
   */
  getUnusedRecentAuthV0() {
    const auth = this.getUnusedRecentAuth();
    return {
      username: auth['Username'],
      userId: auth['Instagram ID'],
      requestCookie: auth['Request Cookie'],
      csrfToken: auth['CSRF Token'],
      expires: auth['Expires'],
      last_used: auth['Last Used'],
      'Max-Age': auth['Max-Age'],
      active: auth['State'] === 'ACTIVE'
    };
  }

  getUnusedRecentAuth() {
    const enableAuths = this.authRepo.getActiveAuths();
    if (enableAuths.length > 0) {
      const enableValidAuth = AuthService.pickFirstValidAuth(enableAuths);
      if (enableValidAuth) {
        this.authRepo.updateAuthLastUsed(enableValidAuth);
        console.log(`Use authentication [${enableValidAuth['Username']}] from Master Sheet..`);
        return enableValidAuth;
      } 
    }
    const auths = this.authRepo.getAll();
    if (auths.length > 0) {
      const username = auths[0]['Username'];
      const password = auths[0]['Password'];
      const authObj = this.loginServer(username, password);
      if (authObj) {
        this.authRepo.updateAuth(auths[0], authObj);
        return auths[0];
      }
    }
    throw new Error('No auth to pick-up! Please check the config.');
  }

  loginServer(username, password) {
    try {
      const response = UrlFetchApp.fetch(configurationTable.loginUrl, { 
        method : 'post', contentType: 'application/json',
        payload: JSON.stringify({ username, password }) 
      });
      if (response.getResponseCode() === 200) {
        console.log(`Successfully authenticate ${username} on server!`);
        const authStr = response.getContentText();
        return JSON.parse(authStr);
      }
    } catch (error) {
      console.log(`Unable to authenticate ${username} on server!`, error);
    }
  }

  static pickFirstValidAuth(enableAuths) {
    for(var i = 0; i < enableAuths.length; i++) {
      if (AuthService.validAuth(enableAuths[i])) {
        return enableAuths[i];
      }
    }
  }

  static validAuth(authObj) {
    // Undefined auth object
    if (!authObj) return false;
    
    // Is no cookie or CSRF token
    if (!authObj['Request Cookie'] || !authObj['CSRF Token']) return false;
    
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