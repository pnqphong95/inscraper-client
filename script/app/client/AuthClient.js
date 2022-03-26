class AuthClient {

  static instance() {
    return Configurer.initInstance('AuthClient', () => new AuthClient());
  }

  constructor() {}

  loginServer(username, password) {
    try {
      const response = UrlFetchApp.fetch(settings.externalConfigs.loginUrl, { 
        method : 'post', contentType: 'application/json',
        payload: JSON.stringify({ username, password }) 
      });
      if (response.getResponseCode() === 200) {
        Logger.log(`Authenticate ${username} on server! ...DONE`);
        const authStr = response.getContentText();
        return JSON.parse(authStr);
      }
    } catch (error) {
      Logger.log(`Unable to authenticate ${username} on server!\n${error}`);
    }
  }

}