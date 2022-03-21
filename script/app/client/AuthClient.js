class AuthClient {

  static instance() {
    return Configurer.initInstance('AuthClient', () => new AuthClient());
  }

  constructor() {}

  loginServer(username, password) {
    try {
      const response = UrlFetchApp.fetch(configurationTable.loginUrl, { 
        method : 'post', contentType: 'application/json',
        payload: JSON.stringify({ username, password }) 
      });
      if (response.getResponseCode() === 200) {
        console.log(`Authenticate ${username} on server! ...DONE`);
        const authStr = response.getContentText();
        return JSON.parse(authStr);
      }
    } catch (error) {
      console.log(`Unable to authenticate ${username} on server!`, error);
    }
  }

}