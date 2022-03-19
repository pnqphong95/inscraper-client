const AUTH_STATE = {
  NEW: 'NEW',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
}
Object.freeze(AUTH_STATE);

class AuthRepository {

  static instance() {
    return Configurer.initInstance('AuthRepository', () => new AuthRepository());
  }
  
  constructor() {
    this.Sheet = Configurer.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Authentication = Tamotsu.Table.define({ idColumn: 'Username', sheetName: 'Authentication', rowShift: 1 });
  }

  updateAuth(existingAuth, newAuthAttrs) {
    existingAuth['State'] = AUTH_STATE.ACTIVE;
    existingAuth['Instagram ID'] = newAuthAttrs.userId;
    existingAuth['Last Used'] = new Date().toISOString();
    existingAuth['Expires'] = newAuthAttrs.expires;
    existingAuth['Max-Age'] = newAuthAttrs['Max-Age'];
    existingAuth['CSRF Token'] = newAuthAttrs.csrfToken;
    existingAuth['Request Cookie'] = newAuthAttrs.requestCookie;
    existingAuth.save();
  }

  updateAuthLastUsed(existingAuth) {
    existingAuth['Last Used'] = new Date().toISOString();
    existingAuth.save();
  }

  getActiveAuths() {
    return this.Authentication
      .where({ State: AUTH_STATE.ACTIVE })
      .order(AuthRepository.lastUsedComparator).all();
  }

  getAll() {
    return this.Authentication
      .where((auth) => Object.values(AUTH_STATE).includes(auth.State))
      .order(AuthRepository.lastUsedComparator).all();
  }

  static lastUsedComparator(authOne, authTwo) {
    if (!authOne['Last Used'] && authTwo['Last Used']) return -1;
    if (authOne['Last Used'] && !authTwo['Last Used']) return 1;
    if (!authOne['Last Used'] && !authTwo['Last Used']) return 0;
    const lastUsedAuthOne = new Date(authOne['Last Used']);
    const lastUsedAuthTwo = new Date(authTwo['Last Used']);
    if (lastUsedAuthOne < lastUsedAuthTwo) return -1;
    if (lastUsedAuthOne > lastUsedAuthTwo) return 1;
    return 0;
  }

}